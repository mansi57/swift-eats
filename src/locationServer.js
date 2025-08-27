const express = require('express');
const { LocationService, createLocationMiddleware } = require('./services/locationService');

class LocationServer {
    constructor() {
        this.app = express();
        this.locationService = new LocationService();
        this.port = process.env.LOCATION_SERVICE_PORT || 3003;
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupGracefulShutdown();
    }

    setupMiddleware() {
        // Body parsing middleware
        this.app.use(express.json({ limit: '1mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));

        // Location Service middleware
        this.app.use(createLocationMiddleware(this.locationService));

        // CORS middleware
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            
            if (req.method === 'OPTIONS') {
                res.sendStatus(200);
            } else {
                next();
            }
        });

        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            const health = this.locationService.getHealth();
            res.status(200).json(health);
        });

        // Driver location endpoint (handled by middleware)
        this.app.get('/location/driver/:driverId', (req, res) => {
            // This is handled by the Location middleware
            // The middleware will process the request and send the response
        });

        // Nearby drivers endpoint (handled by middleware)
        this.app.get('/location/nearby', (req, res) => {
            // This is handled by the Location middleware
            // The middleware will process the request and send the response
        });

        // Order ETA endpoint
        this.app.get('/location/order/:orderId/eta', async (req, res) => {
            try {
                const { orderId } = req.params;
                const etaData = await this.locationService.getOrderETA(orderId);
                
                if (etaData) {
                    res.status(200).json({
                        success: true,
                        orderId: orderId,
                        eta: etaData
                    });
                } else {
                    res.status(404).json({
                        success: false,
                        error: 'ETA not found for order'
                    });
                }
            } catch (error) {
                console.error('Location Server: Error getting order ETA:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        });

        // Driver status endpoint
        this.app.get('/location/driver/:driverId/status', async (req, res) => {
            try {
                const { driverId } = req.params;
                const status = await this.locationService.getDriverStatus(driverId);
                
                res.status(200).json({
                    success: true,
                    driverId: driverId,
                    status: status
                });
            } catch (error) {
                console.error('Location Server: Error getting driver status:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        });

        // Analytics endpoint
        this.app.get('/location/analytics/driver-activity', async (req, res) => {
            try {
                const { date } = req.query;
                const targetDate = date || new Date().toISOString().slice(0, 10);
                
                const analytics = await this.locationService.getDriverActivityAnalytics(targetDate);
                
                res.status(200).json({
                    success: true,
                    date: targetDate,
                    analytics: analytics
                });
            } catch (error) {
                console.error('Location Server: Error getting analytics:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        });

        // Service statistics endpoint
        this.app.get('/stats', (req, res) => {
            const health = this.locationService.getHealth();
            res.status(200).json({
                service: 'Location Service',
                version: '1.0.0',
                ...health
            });
        });

        // Error handling middleware
        this.app.use((error, req, res, next) => {
            console.error('Location Server: Unhandled error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        });

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({
                success: false,
                error: 'Endpoint not found'
            });
        });
    }

    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            console.log(`Location Server: Received ${signal}, shutting down gracefully...`);
            
            try {
                await this.locationService.shutdown();
                console.log('Location Server: Graceful shutdown completed');
                process.exit(0);
            } catch (error) {
                console.error('Location Server: Error during shutdown:', error);
                process.exit(1);
            }
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }

    start() {
        this.server = this.app.listen(this.port, () => {
            console.log(`Location Service running on port ${this.port}`);
            console.log(`Health check: http://localhost:${this.port}/health`);
            console.log(`Driver location: GET http://localhost:${this.port}/location/driver/:driverId`);
            console.log(`Nearby drivers: GET http://localhost:${this.port}/location/nearby?latitude=X&longitude=Y&radius=Z`);
            console.log(`Order ETA: GET http://localhost:${this.port}/location/order/:orderId/eta`);
        });

        this.server.on('error', (error) => {
            console.error('Location Server: Failed to start:', error);
            process.exit(1);
        });
    }
}

// Start the server if this file is run directly
if (require.main === module) {
    const server = new LocationServer();
    server.start();
}

module.exports = LocationServer;
