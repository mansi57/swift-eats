const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { LocationService } = require('./services/locationService');

class LocationServer {
    constructor() {
        this.app = express();
        this.locationService = new LocationService();
        this.server = null;
        this.setupMiddleware();
        this.setupRoutes();
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet());
        
        // CORS middleware
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
            credentials: true
        }));

        // Body parsing middleware
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Compression middleware
        this.app.use(compression());

        // Logging middleware
        this.app.use(morgan('combined'));
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            const health = this.locationService.getHealth();
            res.status(200).json({
                service: 'Location Service',
                version: '1.0.0',
                status: 'healthy',
                ...health
            });
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

        // SSE endpoint for real-time location updates
        this.app.get('/sse/location/:customerId', (req, res) => {
            const { customerId } = req.params;
            this.locationService.createSSEConnection(req, res, customerId);
        });

        // Subscribe to driver location updates
        this.app.post('/sse/subscribe/driver/:customerId/:driverId', (req, res) => {
            try {
                const { customerId, driverId } = req.params;
                this.locationService.subscribeToDriverLocation(customerId, driverId);
                res.status(200).json({
                    success: true,
                    message: `Subscribed to driver ${driverId} location updates`
                });
            } catch (error) {
                console.error('Location Server: Error subscribing to driver location:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        });

        // Subscribe to order ETA updates
        this.app.post('/sse/subscribe/order/:customerId/:orderId', (req, res) => {
            try {
                const { customerId, orderId } = req.params;
                this.locationService.subscribeToOrderETA(customerId, orderId);
                res.status(200).json({
                    success: true,
                    message: `Subscribed to order ${orderId} ETA updates`
                });
            } catch (error) {
                console.error('Location Server: Error subscribing to order ETA:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        });

        // Unsubscribe from updates
        this.app.post('/sse/unsubscribe/:customerId', (req, res) => {
            try {
                const { customerId } = req.params;
                const { subscriptionType, id } = req.body;
                this.locationService.unsubscribeFromUpdates(customerId, subscriptionType, id);
                res.status(200).json({
                    success: true,
                    message: `Unsubscribed from ${subscriptionType}:${id}`
                });
            } catch (error) {
                console.error('Location Server: Error unsubscribing:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        });

        // Error handling middleware
        this.app.use((error, req, res, next) => {
            console.error('Location Server: Unhandled error:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        });
    }

    start(port = process.env.LOCATION_SERVICE_PORT || 3002) {
        this.server = this.app.listen(port, () => {
            console.log(`📍 Location Service running on port ${port}`);
            console.log(`🔗 REST API available at http://localhost:${port}`);
            console.log(`📡 SSE endpoint available at http://localhost:${port}/sse/location/:customerId`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('SIGTERM received, shutting down Location Service gracefully');
            this.server.close(() => {
                console.log('Location Service terminated');
                process.exit(0);
            });
        });

        process.on('SIGINT', () => {
            console.log('SIGINT received, shutting down Location Service gracefully');
            this.server.close(() => {
                console.log('Location Service terminated');
                process.exit(0);
            });
        });
    }
}

// Start server if run directly
if (require.main === module) {
    const server = new LocationServer();
    server.start();
}

module.exports = LocationServer;
