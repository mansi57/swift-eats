const kafka = require('kafka-node');

class DriverAssignmentService {
    constructor() {
        this.producer = null;
        this.consumer = null;
        this.redisClient = null;
        this.isHealthy = true;
        this.stats = {
            requestsProcessed: 0,
            assignmentsSuccessful: 0,
            assignmentsFailed: 0,
            lastRequestTime: null,
            startTime: Date.now()
        };
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

            // Producer for sending assignment responses
            this.producer = new kafka.Producer(client, {
                requireAcks: 1,
                ackTimeoutMs: 100,
                partitionerType: 2
            });

            // Consumer for assignment requests
            const consumerGroup = new kafka.ConsumerGroup({
                kafkaHost: process.env.KAFKA_HOST || 'localhost:9092',
                groupId: 'driver-assignment-group',
                sessionTimeout: 15000,
                protocol: ['roundrobin'],
                fromOffset: 'earliest', // Changed to process existing messages
                outOfRangeOffset: 'earliest'
            }, ['driver_assignment.requests.default-geo']); // Subscribe to default geo topic

            this.consumer = consumerGroup;

            this.producer.on('ready', () => {
                console.log('Driver Assignment Service: Kafka producer ready');
            });

            this.producer.on('error', (error) => {
                console.error('Driver Assignment Service: Kafka producer error:', error);
                this.isHealthy = false;
            });

            this.consumer.on('message', async (message) => {
                console.log('Driver Assignment Service: Received Kafka message:', {
                    topic: message.topic,
                    partition: message.partition,
                    offset: message.offset
                });
                await this.processAssignmentRequest(message);
            });

            this.consumer.on('error', (error) => {
                console.error('Driver Assignment Service: Kafka consumer error:', error);
                this.isHealthy = false;
            });

            this.consumer.on('connect', () => {
                console.log('Driver Assignment Service: Kafka consumer connected');
            });

        } catch (error) {
            console.error('Driver Assignment Service: Failed to initialize Kafka:', error);
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
            
            console.log('Driver Assignment Service: Redis initialized successfully');
        } catch (error) {
            console.error('Driver Assignment Service: Failed to initialize Redis:', error);
            this.isHealthy = false;
        }
    }

    /**
     * Process driver assignment request from Order Service
     */
    async processAssignmentRequest(message) {
        const startTime = Date.now();
        console.log('🚀 Driver Assignment: Starting to process assignment request...');
        
        try {
            console.log('📦 Driver Assignment: Parsing message value:', message.value);
            const request = JSON.parse(message.value);
            console.log('✅ Driver Assignment: Parsed request:', {
                orderId: request.orderId,
                restaurantLat: request.restaurantLatitude,
                restaurantLng: request.restaurantLongitude,
                customerLat: request.customerLatitude,
                customerLng: request.customerLongitude
            });
            
            if (!this.validateAssignmentRequest(request)) {
                console.log('❌ Driver Assignment: Request validation failed');
                this.stats.assignmentsFailed++;
                await this.sendAssignmentFailed(request.orderId, 'Invalid request data');
                return;
            }

            console.log('🔍 Driver Assignment: Finding available drivers...');
            // Find available drivers
            const availableDrivers = await this.findAvailableDrivers(
                request.restaurantLatitude,
                request.restaurantLongitude,
                request.radius || 5
            );
            console.log('👥 Driver Assignment: Found drivers:', availableDrivers.length);

            if (availableDrivers.length === 0) {
                console.log('❌ Driver Assignment: No available drivers found');
                this.stats.assignmentsFailed++;
                await this.sendAssignmentFailed(request.orderId, 'No available drivers in area');
                return;
            }

            console.log('📊 Driver Assignment: Prioritizing drivers...');
            // Calculate priority scores and sort drivers
            const prioritizedDrivers = await this.prioritizeDrivers(
                availableDrivers,
                request.restaurantLatitude,
                request.restaurantLongitude,
                request.preparationTime,
                request.customerLatitude,
                request.customerLongitude
            );
            console.log('🎯 Driver Assignment: Prioritized drivers:', prioritizedDrivers.length);

            console.log('🎪 Driver Assignment: Attempting driver assignment...');
            // Attempt to assign driver
            const assignmentResult = await this.attemptDriverAssignment(
                request.orderId,
                prioritizedDrivers,
                request
            );
            console.log('📤 Driver Assignment: Assignment result:', assignmentResult);

            if (assignmentResult.success) {
                console.log('✅ Driver Assignment: Assignment successful!', {
                    orderId: request.orderId,
                    driverId: assignmentResult.driverId,
                    eta: assignmentResult.eta
                });
                this.stats.assignmentsSuccessful++;
                await this.sendDriverAssigned(request.orderId, assignmentResult.driverId, assignmentResult.eta);
                console.log('📤 Driver Assignment: Success message sent to order service');
            } else {
                console.log('❌ Driver Assignment: Assignment failed:', assignmentResult.error);
                this.stats.assignmentsFailed++;
                await this.sendAssignmentFailed(request.orderId, assignmentResult.error);
                console.log('📤 Driver Assignment: Failure message sent to order service');
            }

            this.stats.requestsProcessed++;
            this.stats.lastRequestTime = Date.now();

            const processingTime = Date.now() - startTime;
            console.log(`⏱️ Driver Assignment: Processing completed in ${processingTime}ms`);
            if (processingTime > 1000) {
                console.warn(`Driver Assignment Service: Slow request processing: ${processingTime}ms`);
            }

        } catch (error) {
            this.stats.assignmentsFailed++;
            console.error('Driver Assignment Service: Error processing assignment request:', error);
            
            try {
                const request = JSON.parse(message.value);
                await this.sendAssignmentFailed(request.orderId, 'Internal service error');
            } catch (sendError) {
                console.error('Driver Assignment Service: Failed to send failure response:', sendError);
            }
        }
    }

    validateAssignmentRequest(request) {
        const required = ['orderId', 'restaurantLatitude', 'restaurantLongitude', 'customerLatitude', 'customerLongitude'];
        
        for (const field of required) {
            if (!request[field]) {
                return false;
            }
        }

        // Validate coordinates
        if (request.restaurantLatitude < -90 || request.restaurantLatitude > 90) return false;
        if (request.restaurantLongitude < -180 || request.restaurantLongitude > 180) return false;
        if (request.customerLatitude < -90 || request.customerLatitude > 90) return false;
        if (request.customerLongitude < -180 || request.customerLongitude > 180) return false;

        return true;
    }

    async findAvailableDrivers(latitude, longitude, radiusKm) {
        try {
            // For MVP, simulate nearby drivers since we don't have real driver locations
            // In production, this would use Redis GEO commands to find actual nearby drivers
            const nearbyDrivers = [
                {
                    driverId: 1, // Integer ID to match database schema
                    distance: '1.2',
                    coordinates: [longitude + 0.01, latitude + 0.01]
                },
                {
                    driverId: 2, // Integer ID to match database schema 
                    distance: '2.5',
                    coordinates: [longitude - 0.01, latitude - 0.01]
                }
            ];

            const availableDrivers = [];

            for (const driver of nearbyDrivers) {
                const driverId = driver.driverId;
                const distance = parseFloat(driver.distance);
                const coordinates = {
                    longitude: driver.coordinates[0],
                    latitude: driver.coordinates[1]
                };

                // Check if driver is available (not assigned to another order)
                const isAvailable = await this.isDriverAvailable(driverId);
                if (isAvailable) {
                    availableDrivers.push({
                        driverId,
                        distance,
                        coordinates
                    });
                }
            }

            return availableDrivers;

        } catch (error) {
            console.error('Driver Assignment Service: Error finding available drivers:', error);
            return [];
        }
    }

    async isDriverAvailable(driverId) {
        try {
            // Check if driver has active orders
            const activeOrdersKey = `driver:${driverId}:active_orders`;
            const activeOrders = await this.redisClient.get(activeOrdersKey);
            
            if (!activeOrders) {
                return true; // No active orders
            }

            const orders = JSON.parse(activeOrders);
            return orders.length === 0;

        } catch (error) {
            console.error('Driver Assignment Service: Error checking driver availability:', error);
            return false; // Assume unavailable on error
        }
    }

    async prioritizeDrivers(drivers, restaurantLat, restaurantLon, preparationTime, customerLat, customerLon) {
        const prioritizedDrivers = [];

        for (const driver of drivers) {
            // Calculate ETA from driver to restaurant
            const driverToRestaurantETA = this.calculateETA(
                driver.coordinates.latitude,
                driver.coordinates.longitude,
                restaurantLat,
                restaurantLon
            );

            // Calculate ETA from restaurant to customer
            const restaurantToCustomerETA = this.calculateETA(
                restaurantLat,
                restaurantLon,
                customerLat,
                customerLon
            );

            // Calculate total ETA
            const totalETA = driverToRestaurantETA + restaurantToCustomerETA;

            // Calculate slack (time buffer between driver arrival and order readiness)
            const slack = preparationTime - driverToRestaurantETA;

            // Priority score: higher score = higher priority
            // Factors: slack time (positive is good), total distance, driver rating
            const priorityScore = this.calculatePriorityScore(slack, driver.distance, totalETA);

            prioritizedDrivers.push({
                ...driver,
                driverToRestaurantETA,
                restaurantToCustomerETA,
                totalETA,
                slack,
                priorityScore
            });
        }

        // Sort by priority score (descending)
        return prioritizedDrivers.sort((a, b) => b.priorityScore - a.priorityScore);
    }

    calculatePriorityScore(slack, distance, totalETA) {
        // Base score starts at 100
        let score = 100;

        // Slack factor: positive slack is good, negative is bad
        if (slack > 0) {
            score += Math.min(slack * 10, 50); // Bonus for positive slack, max 50
        } else {
            score -= Math.abs(slack) * 20; // Penalty for negative slack
        }

        // Distance factor: closer is better
        score -= distance * 5; // Penalty for distance

        // ETA factor: shorter is better
        score -= totalETA * 2; // Penalty for longer ETA

        return Math.max(score, 0); // Ensure non-negative score
    }

    calculateETA(lat1, lon1, lat2, lon2) {
        // Simple ETA calculation (in production, use proper routing service)
        const distance = this.calculateDistance(lat1, lon1, lat2, lon2);
        const avgSpeedKmh = 30; // Assume average speed of 30 km/h in city
        const etaMinutes = Math.ceil((distance / avgSpeedKmh) * 60);
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

    async attemptDriverAssignment(orderId, prioritizedDrivers, request) {
        console.log('🎪 Driver Assignment: Starting driver assignment loop...');
        // Try to assign the highest priority driver
        for (const driver of prioritizedDrivers) {
            try {
                console.log(`🚗 Driver Assignment: Trying driver ${driver.driverId}...`);
                const assignmentKey = `driver:${driver.driverId}:active_orders`;
                
                console.log(`🔍 Driver Assignment: Checking availability for driver ${driver.driverId}`);
                // Simplified Redis operation without multi for now
                const currentOrdersStr = await this.redisClient.get(assignmentKey);
                const currentOrders = currentOrdersStr ? JSON.parse(currentOrdersStr) : [];
                console.log(`📋 Driver Assignment: Driver ${driver.driverId} has ${currentOrders.length} active orders`);
                
                // Check if driver is still available
                if (currentOrders.length > 0) {
                    console.log(`❌ Driver Assignment: Driver ${driver.driverId} is busy, trying next driver`);
                    continue; // Try next driver
                }

                console.log(`✅ Driver Assignment: Driver ${driver.driverId} is available! Assigning order ${orderId}`);
                // Assign order to driver
                const updatedOrders = [...currentOrders, orderId];
                await this.redisClient.setEx(assignmentKey, 3600, JSON.stringify(updatedOrders)); // Set with TTL
                console.log(`💾 Driver Assignment: Updated active orders for driver ${driver.driverId}`);

                // Store order details for ETA calculations
                const orderDetailsKey = `order:${orderId}:details`;
                const orderDetails = {
                    orderId,
                    driverId: driver.driverId,
                    restaurantLatitude: request.restaurantLatitude,
                    restaurantLongitude: request.restaurantLongitude,
                    customerLatitude: request.customerLatitude,
                    customerLongitude: request.customerLongitude,
                    preparationTime: request.preparationTime,
                    assignedAt: new Date().toISOString()
                };
                
                await this.redisClient.setEx(orderDetailsKey, 3600, JSON.stringify(orderDetails)); // Set with TTL
                console.log(`💾 Driver Assignment: Stored order details for order ${orderId}`);

                return {
                    success: true,
                    driverId: driver.driverId,
                    eta: driver.totalETA,
                    driverToRestaurantETA: driver.driverToRestaurantETA,
                    restaurantToCustomerETA: driver.restaurantToCustomerETA
                };

            } catch (error) {
                console.error(`Driver Assignment Service: Error assigning driver ${driver.driverId}:`, error);
                continue; // Try next driver
            }
        }

        return {
            success: false,
            error: 'All drivers are currently busy'
        };
    }

    async sendDriverAssigned(orderId, driverId, eta) {
        try {
            console.log('📤 Driver Assignment: Preparing success message for order:', orderId);
            const message = {
                orderId,
                driverId,
                eta,
                assignedAt: new Date().toISOString(),
                status: 'assigned'
            };

            console.log('📤 Driver Assignment: Publishing success message to Kafka:', message);
            await this.publishToKafka('driver_assignment.responses', message);
            console.log('✅ Driver Assignment: Success message published successfully');

        } catch (error) {
            console.error('❌ Driver Assignment Service: Error sending driver assigned message:', error);
        }
    }

    async sendAssignmentFailed(orderId, error) {
        try {
            console.log('📤 Driver Assignment: Preparing failure message for order:', orderId);
            const message = {
                orderId,
                error,
                failedAt: new Date().toISOString(),
                status: 'failed'
            };

            console.log('📤 Driver Assignment: Publishing failure message to Kafka:', message);
            await this.publishToKafka('driver_assignment.responses', message);
            console.log('✅ Driver Assignment: Failure message published successfully');

        } catch (error) {
            console.error('❌ Driver Assignment Service: Error sending assignment failed message:', error);
        }
    }

    async publishToKafka(topic, data) {
        return new Promise((resolve, reject) => {
            if (!this.producer) {
                reject(new Error('Kafka producer not initialized'));
                return;
            }

            const message = {
                topic: topic,
                messages: JSON.stringify(data),
                partition: 0
            };

            this.producer.send([message], (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });
    }

    /**
     * Health check endpoint
     */
    getHealth() {
        const uptime = Date.now() - this.stats.startTime;
        const requestsPerSecond = this.stats.requestsProcessed / (uptime / 1000);
        
        return {
            status: this.isHealthy ? 'healthy' : 'unhealthy',
            uptime: uptime,
            requestsProcessed: this.stats.requestsProcessed,
            assignmentsSuccessful: this.stats.assignmentsSuccessful,
            assignmentsFailed: this.stats.assignmentsFailed,
            requestsPerSecond: requestsPerSecond.toFixed(2),
            lastRequestTime: this.stats.lastRequestTime,
            kafkaConnected: !!(this.producer && this.consumer),
            redisConnected: !!this.redisClient
        };
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('Driver Assignment Service: Shutting down...');
        
        if (this.producer) {
            this.producer.close();
        }
        
        if (this.consumer) {
            this.consumer.close();
        }
        
        if (this.redisClient) {
            this.redisClient.quit();
        }
        
        this.isHealthy = false;
    }
}

module.exports = { DriverAssignmentService };
