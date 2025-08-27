const express = require('express');
const { GPSService, createGPSMiddleware } = require('./services/gpsService');

class GPSServer {
    constructor() {
        this.app = express();
        this.gpsService = new GPSService();
        this.port = process.env.GPS_SERVICE_PORT || 3002;
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupGracefulShutdown();
    }

    setupMiddleware() {
        // Body parsing middleware
        this.app.use(express.json({ limit: '1mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '1mb' }));

        // GPS Service middleware
        this.app.use(createGPSMiddleware(this.gpsService));

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
            const health = this.gpsService.getHealth();
            res.status(200).json(health);
        });

        // GPS location update endpoint (handled by middleware)
        this.app.post('/gps/location', (req, res) => {
            // This is handled by the GPS middleware
            // The middleware will process the request and send the response
        });

        // Batch location updates endpoint
        this.app.post('/gps/location/batch', async (req, res) => {
            try {
                const { locations } = req.body;
                
                if (!Array.isArray(locations) || locations.length === 0) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid batch data'
                    });
                }

                // Limit batch size to prevent overload
                if (locations.length > 100) {
                    return res.status(400).json({
                        success: false,
                        error: 'Batch size too large (max 100)'
                    });
                }

                const results = [];
                const startTime = Date.now();

                // Process locations in parallel with concurrency limit
                const concurrencyLimit = 10;
                for (let i = 0; i < locations.length; i += concurrencyLimit) {
                    const batch = locations.slice(i, i + concurrencyLimit);
                    const batchPromises = batch.map(location => 
                        this.gpsService.processLocationUpdate(location)
                    );
                    
                    const batchResults = await Promise.allSettled(batchPromises);
                    results.push(...batchResults.map(result => 
                        result.status === 'fulfilled' ? result.value : { success: false, error: result.reason.message }
                    ));
                }

                const totalTime = Date.now() - startTime;
                const successCount = results.filter(r => r.success).length;
                const failureCount = results.length - successCount;

                res.status(200).json({
                    success: true,
                    totalProcessed: results.length,
                    successful: successCount,
                    failed: failureCount,
                    processingTime: totalTime,
                    results: results
                });

            } catch (error) {
                console.error('GPS Server: Batch processing error:', error);
                res.status(500).json({
                    success: false,
                    error: 'Internal server error'
                });
            }
        });

        // Service statistics endpoint
        this.app.get('/stats', (req, res) => {
            const health = this.gpsService.getHealth();
            res.status(200).json({
                service: 'GPS Service',
                version: '1.0.0',
                ...health
            });
        });

        // Error handling middleware
        this.app.use((error, req, res, next) => {
            console.error('GPS Server: Unhandled error:', error);
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
            console.log(`GPS Server: Received ${signal}, shutting down gracefully...`);
            
            try {
                await this.gpsService.shutdown();
                console.log('GPS Server: Graceful shutdown completed');
                process.exit(0);
            } catch (error) {
                console.error('GPS Server: Error during shutdown:', error);
                process.exit(1);
            }
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    }

    start() {
        this.server = this.app.listen(this.port, () => {
            console.log(`GPS Service running on port ${this.port}`);
            console.log(`Health check: http://localhost:${this.port}/health`);
            console.log(`Location updates: POST http://localhost:${this.port}/gps/location`);
            console.log(`Batch updates: POST http://localhost:${this.port}/gps/location/batch`);
        });

        this.server.on('error', (error) => {
            console.error('GPS Server: Failed to start:', error);
            process.exit(1);
        });
    }
}

// Start the server if this file is run directly
if (require.main === module) {
    const server = new GPSServer();
    server.start();
}

module.exports = GPSServer;
