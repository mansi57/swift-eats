const express = require('express');
const { DriverAssignmentService } = require('./services/driverAssignmentService');

class DriverAssignmentServer {
    constructor() {
        this.app = express();
        this.driverAssignmentService = new DriverAssignmentService();
        this.port = process.env.DRIVER_ASSIGNMENT_SERVICE_PORT || 3004;
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupGracefulShutdown();
    }

    setupMiddleware() {
        // Body parsing middleware
        this.app.use(express.json({ limit: '1mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));

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
            const health = this.driverAssignmentService.getHealth();
            res.status(200).json(health);
        });

        // Service statistics endpoint
        this.app.get('/stats', (req, res) => {
            const health = this.driverAssignmentService.getHealth();
            res.status(200).json({
                service: 'Driver Assignment Service',
                version: '1.0.0',
                ...health
            });
        });

        // Manual driver assignment endpoint (for testing/debugging)
        this.app.post('/assign', async (req, res) => {
            try {
                const assignmentRequest = req.body;
                
                // Validate request
                if (!this.validateAssignmentRequest(assignmentRequest)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid assignment request data'
                    });
                }

                // Create a mock message for processing
                const mockMessage = {
                    value: JSON.stringify(assignmentRequest)
                };

                // Process the assignment request
                await this.driverAssignmentService.processAssignmentRequest(mockMessage);

                res.status(200).json({
                    success: true,
                    message: 'Assignment request processed successfully'
                });

            } catch (error) {
                console.error('Driver Assignment Server: Error processing manual assignment:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        });

        // Error handling middleware
        this.app.use((error, req, res, next) => {
            console.error('Driver Assignment Server: Unhandled error:', error);
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

    setupGracefulShutdown() {
        const shutdown = async (signal) => {
            console.log(`Driver Assignment Server: Received ${signal}, shutting down gracefully...`);
            
            try {
                await this.driverAssignmentService.shutdown();
                console.log('Driver Assignment Server: Graceful shutdown completed');
                process.exit(0);
            } catch (error) {
                console.error('Driver Assignment Server: Error during shutdown:', error);
                process.exit(1);
            }
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }

    start() {
        this.server = this.app.listen(this.port, () => {
            console.log(`Driver Assignment Service running on port ${this.port}`);
            console.log(`Health check: http://localhost:${this.port}/health`);
            console.log(`Manual assignment: POST http://localhost:${this.port}/assign`);
        });

        this.server.on('error', (error) => {
            console.error('Driver Assignment Server: Failed to start:', error);
            process.exit(1);
        });
    }
}

// Start the server if this file is run directly
if (require.main === module) {
    const server = new DriverAssignmentServer();
    server.start();
}

module.exports = DriverAssignmentServer;
