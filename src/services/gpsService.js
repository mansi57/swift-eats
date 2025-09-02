const kafka = require('kafka-node');
const { v4: uuidv4 } = require('uuid');

class GPSService {
    constructor() {
        this.producer = null;
        this.isHealthy = true;
        this.stats = {
            eventsProcessed: 0,
            eventsFailed: 0,
            lastEventTime: null,
            startTime: Date.now()
        };
        this.initializeKafka();
    }

    async initializeKafka() {
        try {
            const client = new kafka.KafkaClient({
                kafkaHost: process.env.KAFKA_HOST || 'localhost:9092',
                connectTimeout: 1000,
                requestTimeout: 30000,
                autoConnect: true,
                maxAsyncRequests: 100
            });

            this.producer = new kafka.Producer(client, {
                requireAcks: 1,
                ackTimeoutMs: 100,
                partitionerType: 1 // Hash-based partitioner for ordered messages per driver
            });

            this.producer.on('ready', () => {
                console.log('GPS Service: Kafka producer ready');
            });

            this.producer.on('error', (error) => {
                console.error('GPS Service: Kafka producer error:', error);
                this.isHealthy = false;
            });

        } catch (error) {
            console.error('GPS Service: Failed to initialize Kafka:', error);
            this.isHealthy = false;
        }
    }

    /**
     * Process GPS location update from driver app
     * Target: 2,000 events/second peak load
     * Processing time: 10-25ms per event
     */
    async processLocationUpdate(locationData) {
        const startTime = Date.now();
        
        try {
            // Validate location data
            const validatedData = this.validateLocationData(locationData);
            if (!validatedData) {
                this.stats.eventsFailed++;
                return { success: false, error: 'Invalid location data' };
            }

            // Enrich with metadata
            const enrichedData = this.enrichLocationData(validatedData);

            // Publish to Kafka topic
            await this.publishToKafka(enrichedData);

            // Update stats
            this.stats.eventsProcessed++;
            this.stats.lastEventTime = Date.now();

            const processingTime = Date.now() - startTime;
            
            // Log slow events (>25ms)
            if (processingTime > 25) {
                console.warn(`GPS Service: Slow event processing: ${processingTime}ms`);
            }

            return { 
                success: true, 
                processingTime,
                eventId: enrichedData.eventId 
            };

        } catch (error) {
            this.stats.eventsFailed++;
            console.error('GPS Service: Error processing location update:', error);
            return { success: false, error: error.message };
        }
    }

    validateLocationData(data) {
        const required = ['driverId', 'latitude', 'longitude', 'timestamp'];
        
        // Check required fields
        for (const field of required) {
            if (!data[field]) {
                console.log(`GPS Service: Missing field: ${field}`, data);
                return null;
            }
        }

        // Validate coordinates
        if (data.latitude < -90 || data.latitude > 90) {
            console.log(`GPS Service: Invalid latitude: ${data.latitude}`);
            return null;
        }
        if (data.longitude < -180 || data.longitude > 180) {
            console.log(`GPS Service: Invalid longitude: ${data.longitude}`);
            return null;
        }

        // Validate timestamp (within last 5 minutes and up to 2 minutes in future to account for clock skew)
        const now = Date.now();
        const timestamp = new Date(data.timestamp).getTime();
        if (timestamp < now - 300000 || timestamp > now + 120000) {
            console.log(`GPS Service: Invalid timestamp: ${data.timestamp}, now: ${now}, timestamp: ${timestamp}, diff: ${now - timestamp}`);
            return null;
        }

        console.log(`GPS Service: Validation passed for driver ${data.driverId}`);
        return data;
    }

    enrichLocationData(data) {
        return {
            eventId: uuidv4(),
            driverId: data.driverId,
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude),
            timestamp: data.timestamp,
            accuracy: data.accuracy || null,
            speed: data.speed || null,
            heading: data.heading || null,
            altitude: data.altitude || null,
            batteryLevel: data.batteryLevel || null,
            networkType: data.networkType || null,
            processedAt: new Date().toISOString(),
            serviceInstance: process.env.SERVICE_INSTANCE_ID || 'gps-1'
        };
    }

    async publishToKafka(data) {
        return new Promise((resolve, reject) => {
            if (!this.producer) {
                reject(new Error('Kafka producer not initialized'));
                return;
            }

            // Determine topic based on geo-region
            const geoRegion = this.getGeoRegion(data.latitude, data.longitude);
            const topic = `driver_location.${geoRegion}`;

            const message = {
                topic: topic,
                messages: JSON.stringify(data),
                key: data.driverId, // Hash by driverId for ordered messages per driver
                partition: 0 // Will be handled by hash-based partitioner
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

    getGeoRegion(latitude, longitude) {
        // Simple geo-region mapping based on coordinates
        // In production, use a proper geo-sharding strategy
        const latRegion = Math.floor(latitude / 10);
        const lonRegion = Math.floor(longitude / 10);
        return `${latRegion}_${lonRegion}`;
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
            eventsPerSecond: eventsPerSecond.toFixed(2),
            lastEventTime: this.stats.lastEventTime,
            kafkaConnected: !!this.producer
        };
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        console.log('GPS Service: Shutting down...');
        
        if (this.producer) {
            this.producer.close();
        }
        
        this.isHealthy = false;
    }
}

// Express.js middleware for GPS Service
const createGPSMiddleware = (gpsService) => {
    return async (req, res, next) => {
        if (req.path === '/gps/location' && req.method === 'POST') {
            try {
                const result = await gpsService.processLocationUpdate(req.body);
                
                if (result.success) {
                    res.status(200).json({
                        success: true,
                        eventId: result.eventId,
                        processingTime: result.processingTime
                    });
                } else {
                    res.status(400).json({
                        success: false,
                        error: result.error
                    });
                }
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

module.exports = { GPSService, createGPSMiddleware };
