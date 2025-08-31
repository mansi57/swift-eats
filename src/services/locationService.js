const kafka = require('kafka-node');

class LocationService {
    constructor() {
        this.consumer = null;
        this.redisClient = null;
        this.isHealthy = true;
        this.stats = {
            eventsProcessed: 0,
            eventsFailed: 0,
            cacheUpdates: 0,
            lastEventTime: null,
            startTime: Date.now()
        };
        this.sseConnections = new Map(); // Track SSE connections
        this.initializeKafka();
        this.initializeRedis();
    }

    async initializeKafka() {
        try {
            const client = new kafka.KafkaClient({
                kafkaHost: process.env.KAFKA_HOST || 'localhost:9092',
                connectTimeout: 1000,
                requestTimeout: 30000,
                autoConnect: true
            });

            // Consumer group for load distribution across workers
            const consumerGroup = new kafka.ConsumerGroup({
                kafkaHost: process.env.KAFKA_HOST || 'localhost:9092',
                groupId: 'location-processor-group',
                sessionTimeout: 15000,
                protocol: ['roundrobin'],
                fromOffset: 'latest',
                outOfRangeOffset: 'latest'
            }, ['driver_location.4_-8']); // Subscribe to NYC geo-region topic for testing

            this.consumer = consumerGroup;

            this.consumer.on('message', async (message) => {
                await this.processLocationEvent(message);
            });

            this.consumer.on('error', (error) => {
                console.error('Location Service: Kafka consumer error:', error);
                this.isHealthy = false;
            });

            this.consumer.on('connect', () => {
                console.log('Location Service: Kafka consumer connected');
            });

        } catch (error) {
            console.error('Location Service: Failed to initialize Kafka:', error);
            this.isHealthy = false;
        }
    }

    async initializeRedis() {
        try {
            // Use shared Redis client (v4+ with built-in promises)
            const { client } = require('../utils/redis');
            this.redisClient = client;

            // Ensure connection is established
            if (!this.redisClient.isOpen) {
                await this.redisClient.connect();
            }

            console.log('Location Service: Redis initialized successfully');
        } catch (error) {
            console.error('Location Service: Failed to initialize Redis:', error);
            this.isHealthy = false;
        }
    }

    /**
     * Process GPS location event from Kafka
     * Target: 2,000 events/second peak load
     * Processing time: 5-13ms per event
     */
    async processLocationEvent(message) {
        const startTime = Date.now();
        
        try {
            const locationData = JSON.parse(message.value);
            
            // Update Redis cache
            await this.updateLocationCache(locationData);
            
            // Trigger ETA calculations
            await this.triggerETACalculation(locationData);
            
            // Aggregate analytics
            await this.aggregateAnalytics(locationData);
            
            // Broadcast to SSE subscribers (real-time push)
            this.broadcastLocationUpdate(locationData.driverId, locationData);
            
            // Update stats
            this.stats.eventsProcessed++;
            this.stats.lastEventTime = Date.now();
            
            const processingTime = Date.now() - startTime;
            
            // Log slow events (>50ms)
            if (processingTime > 50) {
                console.warn(`Location Service: Slow event processing: ${processingTime}ms`);
            }

        } catch (error) {
            this.stats.eventsFailed++;
            console.error('Location Service: Error processing location event:', error);
        }
    }

    validateLocationEvent(data) {
        const required = ['eventId', 'driverId', 'latitude', 'longitude', 'timestamp'];
        
        for (const field of required) {
            if (!data[field]) {
                return false;
            }
        }

        // Check if event is recent (within last 30 seconds)
        const now = Date.now();
        const timestamp = new Date(data.timestamp).getTime();
        if (timestamp < now - 30000) {
            return false;
        }

        return true;
    }

    async updateLocationCache(locationData) {
        try {
            const driverId = locationData.driverId;
            const latitude = locationData.latitude;
            const longitude = locationData.longitude;
            const timestamp = locationData.timestamp;

            // Update driver location in Redis GEO
            await this.redisClient.geoAdd('driver_locations', [
                {
                    longitude: longitude,
                    latitude: latitude,
                    member: driverId.toString()
                }
            ]);

            // Store detailed location data with TTL (5 minutes)
            const locationKey = `driver:${driverId}:location`;
            const locationValue = JSON.stringify({
                latitude,
                longitude,
                timestamp,
                accuracy: locationData.accuracy,
                speed: locationData.speed,
                heading: locationData.heading,
                batteryLevel: locationData.batteryLevel,
                lastUpdate: new Date().toISOString()
            });

            await this.redisClient.setEx(locationKey, 300, locationValue); // Set with TTL

            // Update driver status (active/inactive based on recent updates)
            const statusKey = `driver:${driverId}:status`;
            await this.redisClient.setEx(statusKey, 300, 'active');

            this.stats.cacheUpdates++;

        } catch (error) {
            console.error('Location Service: Error updating location cache:', error);
            throw error;
        }
    }

    async triggerETACalculation(locationData) {
        try {
            // Check if driver has active orders
            const activeOrdersKey = `driver:${locationData.driverId}:active_orders`;
            const activeOrders = await this.redisClient.get(activeOrdersKey);
            
            if (activeOrders) {
                const orders = JSON.parse(activeOrders);
                
                // For each active order, trigger ETA recalculation
                for (const orderId of orders) {
                    const etaKey = `order:${orderId}:eta`;
                    const orderData = await this.redisClient.get(`order:${orderId}:details`);
                    
                    if (orderData) {
                        const order = JSON.parse(orderData);
                        
                        // Calculate new ETA based on current driver location
                        const newETA = this.calculateETA(
                            locationData.latitude,
                            locationData.longitude,
                            order.restaurantLatitude,
                            order.restaurantLongitude,
                            order.customerLatitude,
                            order.customerLongitude
                        );

                        const etaData = {
                            eta: newETA,
                            calculatedAt: new Date().toISOString(),
                            driverLocation: {
                                latitude: locationData.latitude,
                                longitude: locationData.longitude
                            }
                        };

                        // Update ETA in cache
                        await this.redisClient.setEx(etaKey, 300, JSON.stringify(etaData));
                        
                        // Broadcast ETA update to SSE subscribers (real-time push)
                        this.broadcastETAUpdate(orderId, etaData);
                    }
                }
            }

        } catch (error) {
            console.error('Location Service: Error triggering ETA calculation:', error);
        }
    }

    calculateETA(driverLat, driverLon, restaurantLat, restaurantLon, customerLat, customerLon) {
        // Simple ETA calculation (in production, use proper routing service)
        const driverToRestaurant = this.calculateDistance(driverLat, driverLon, restaurantLat, restaurantLon);
        const restaurantToCustomer = this.calculateDistance(restaurantLat, restaurantLon, customerLat, customerLon);
        
        // Assume average speed of 30 km/h in city
        const avgSpeedKmh = 30;
        const totalDistance = driverToRestaurant + restaurantToCustomer;
        const etaMinutes = Math.ceil((totalDistance / avgSpeedKmh) * 60);
        
        return Math.max(etaMinutes, 5); // Minimum 5 minutes
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        // Haversine formula for distance calculation
        const R = 6371; // Earth's radius in km
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    toRadians(degrees) {
        return degrees * (Math.PI/180);
    }

    async aggregateAnalytics(locationData) {
        try {
            // Aggregate driver activity metrics
            const analyticsKey = `analytics:driver_activity:${new Date().toISOString().slice(0, 10)}`;
            
            // Increment daily driver activity count
            await this.redisClient.incr(`${analyticsKey}:active_drivers`);
            
            // Store hourly activity
            const hour = new Date().getHours();
            await this.redisClient.incr(`${analyticsKey}:hour_${hour}`);
            
            // Set TTL for analytics data (7 days) - handled by setEx above

        } catch (error) {
            console.error('Location Service: Error aggregating analytics:', error);
        }
    }

    /**
     * Get driver location for customer-facing API
     */
    async getDriverLocation(driverId) {
        try {
            const locationKey = `driver:${driverId}:location`;
            const locationData = await this.redisClient.get(locationKey);
            
            if (!locationData) {
                return null;
            }

            return JSON.parse(locationData);

        } catch (error) {
            console.error('Location Service: Error getting driver location:', error);
            return null;
        }
    }

    /**
     * Get nearby drivers for order assignment
     */
    async getNearbyDrivers(latitude, longitude, radiusKm = 5) {
        try {
            const nearbyDrivers = await this.redisClient.geoRadius(
                'driver_locations',
                {
                    longitude: longitude,
                    latitude: latitude
                },
                radiusKm,
                'km',
                {
                    WITHCOORD: true,
                    WITHDIST: true,
                    SORT: 'ASC'
                }
            );

            return nearbyDrivers.map(driver => ({
                driverId: driver[0],
                distance: parseFloat(driver[1]),
                coordinates: {
                    longitude: parseFloat(driver[2][0]),
                    latitude: parseFloat(driver[2][1])
                }
            }));

        } catch (error) {
            console.error('Location Service: Error getting nearby drivers:', error);
            return [];
        }
    }

    /**
     * Get order ETA from cache
     */
    async getOrderETA(orderId) {
        try {
            const etaKey = `order:${orderId}:eta`;
            const etaData = await this.redisClient.get(etaKey);
            
            if (!etaData) {
                return null;
            }

            return JSON.parse(etaData);

        } catch (error) {
            console.error('Location Service: Error getting order ETA:', error);
            return null;
        }
    }

    /**
     * Get driver status
     */
    async getDriverStatus(driverId) {
        try {
            const statusKey = `driver:${driverId}:status`;
            const status = await this.redisClient.get(statusKey);
            
            if (!status) {
                return 'inactive';
            }

            return status;

        } catch (error) {
            console.error('Location Service: Error getting driver status:', error);
            return 'unknown';
        }
    }

    /**
     * Get driver activity analytics
     */
    async getDriverActivityAnalytics(date) {
        try {
            const analyticsKey = `analytics:driver_activity:${date}`;
            
            // Get active drivers count
            const activeDrivers = await this.redisClient.get(`${analyticsKey}:active_drivers`) || 0;
            
            // Get hourly activity
            const hourlyActivity = {};
            for (let hour = 0; hour < 24; hour++) {
                const hourCount = await this.redisClient.get(`${analyticsKey}:hour_${hour}`) || 0;
                hourlyActivity[hour] = parseInt(hourCount);
            }

            return {
                date: date,
                activeDrivers: parseInt(activeDrivers),
                hourlyActivity: hourlyActivity
            };

        } catch (error) {
            console.error('Location Service: Error getting analytics:', error);
            return null;
        }
    }

    /**
     * Server-Sent Events (SSE) for real-time location updates
     */
    createSSEConnection(req, res, customerId) {
        // Set SSE headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control'
        });

        // Send initial connection message
        res.write(`data: ${JSON.stringify({
            type: 'connected',
            customerId: customerId,
            timestamp: new Date().toISOString()
        })}\n\n`);

        // Store connection
        this.sseConnections.set(customerId, {
            res: res,
            subscriptions: new Set(),
            createdAt: Date.now()
        });

        // Handle client disconnect
        req.on('close', () => {
            console.log(`SSE connection closed for customer: ${customerId}`);
            this.sseConnections.delete(customerId);
        });

        // Keep connection alive with heartbeat
        const heartbeat = setInterval(() => {
            if (this.sseConnections.has(customerId)) {
                res.write(`data: ${JSON.stringify({
                    type: 'heartbeat',
                    timestamp: new Date().toISOString()
                })}\n\n`);
            } else {
                clearInterval(heartbeat);
            }
        }, 30000); // 30 second heartbeat

        console.log(`SSE connection established for customer: ${customerId}`);
    }

    /**
     * Subscribe customer to driver location updates
     */
    subscribeToDriverLocation(customerId, driverId) {
        const connection = this.sseConnections.get(customerId);
        if (connection) {
            connection.subscriptions.add(`driver_location:${driverId}`);
            console.log(`Customer ${customerId} subscribed to driver ${driverId} location`);
        }
    }

    /**
     * Subscribe customer to order ETA updates
     */
    subscribeToOrderETA(customerId, orderId) {
        const connection = this.sseConnections.get(customerId);
        if (connection) {
            connection.subscriptions.add(`order_eta:${orderId}`);
            console.log(`Customer ${customerId} subscribed to order ${orderId} ETA`);
        }
    }

    /**
     * Unsubscribe customer from updates
     */
    unsubscribeFromUpdates(customerId, subscriptionType, id) {
        const connection = this.sseConnections.get(customerId);
        if (connection) {
            const subscription = `${subscriptionType}:${id}`;
            connection.subscriptions.delete(subscription);
            console.log(`Customer ${customerId} unsubscribed from ${subscription}`);
        }
    }

    /**
     * Broadcast location updates to subscribed customers via SSE
     */
    broadcastLocationUpdate(driverId, locationData) {
        const subscriptionKey = `driver_location:${driverId}`;
        
        this.sseConnections.forEach((connection, customerId) => {
            if (connection.subscriptions.has(subscriptionKey)) {
                try {
                    const message = {
                        type: 'driver_location_update',
                        driverId: driverId,
                        location: locationData,
                        timestamp: new Date().toISOString()
                    };
                    
                    connection.res.write(`data: ${JSON.stringify(message)}\n\n`);
                } catch (error) {
                    console.error(`Error sending SSE to customer ${customerId}:`, error);
                    // Remove broken connection
                    this.sseConnections.delete(customerId);
                }
            }
        });
    }

    /**
     * Broadcast ETA updates to subscribed customers via SSE
     */
    broadcastETAUpdate(orderId, etaData) {
        const subscriptionKey = `order_eta:${orderId}`;
        
        this.sseConnections.forEach((connection, customerId) => {
            if (connection.subscriptions.has(subscriptionKey)) {
                try {
                    const message = {
                        type: 'order_eta_update',
                        orderId: orderId,
                        eta: etaData,
                        timestamp: new Date().toISOString()
                    };
                    
                    connection.res.write(`data: ${JSON.stringify(message)}\n\n`);
                } catch (error) {
                    console.error(`Error sending ETA SSE to customer ${customerId}:`, error);
                    // Remove broken connection
                    this.sseConnections.delete(customerId);
                }
            }
        });
    }

    /**
     * Health check endpoint
     */
    getHealth() {
        const uptime = Date.now() - this.stats.startTime;
        const eventsPerSecond = this.stats.eventsProcessed / (uptime / 1000);
        
        return {
            status: this.isHealthy ? 'healthy' : 'unhealthy',
            uptime: uptime,
            eventsProcessed: this.stats.eventsProcessed,
            eventsFailed: this.stats.eventsFailed,
            cacheUpdates: this.stats.cacheUpdates,
            eventsPerSecond: eventsPerSecond.toFixed(2),
            lastEventTime: this.stats.lastEventTime,
            kafkaConnected: !!this.consumer,
            redisConnected: !!this.redisClient
        };
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('Location Service: Shutting down...');
        
        if (this.consumer) {
            this.consumer.close();
        }
        
        if (this.redisClient) {
            this.redisClient.quit();
        }
        
        this.isHealthy = false;
    }
}

// Express.js middleware for Location Service
const createLocationMiddleware = (locationService) => {
    return async (req, res, next) => {
        if (req.path.startsWith('/location/driver/') && req.method === 'GET') {
            try {
                const driverId = req.params.driverId || req.path.split('/').pop();
                const location = await locationService.getDriverLocation(driverId);
                
                if (location) {
                    res.status(200).json({
                        success: true,
                        location: location
                    });
                } else {
                    res.status(404).json({
                        success: false,
                        error: 'Driver location not found'
                    });
                }
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        } else if (req.path === '/location/nearby' && req.method === 'GET') {
            try {
                const { latitude, longitude, radius } = req.query;
                const nearbyDrivers = await locationService.getNearbyDrivers(
                    parseFloat(latitude),
                    parseFloat(longitude),
                    parseFloat(radius) || 5
                );
                
                res.status(200).json({
                    success: true,
                    drivers: nearbyDrivers
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        } else {
            next();
        }
    };
};

module.exports = { LocationService, createLocationMiddleware };
