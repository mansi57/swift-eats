const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const RestaurantService = require('./services/restaurantService');
const restaurantRoutes = require('./routes/restaurants');
const searchRoutes = require('./routes/search');
const foodItemRoutes = require('./routes/foodItems');
const logger = require('./utils/logger');

class RestaurantServer {
    constructor() {
        this.app = express();
        this.port = process.env.RESTAURANT_SERVICE_PORT || 3002;
        this.restaurantService = new RestaurantService();
        
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        // Security middleware
        this.app.use(helmet());
        
        // CORS
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
            credentials: true
        }));

        // Request parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Compression
        this.app.use(compression());

        // Logging
        if (process.env.NODE_ENV !== 'test') {
            this.app.use(morgan('combined', {
                stream: {
                    write: (message) => logger.info(message.trim())
                }
            }));
        }

        // Request timing
        this.app.use((req, res, next) => {
            req.startTime = Date.now();
            next();
        });
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            const health = this.restaurantService.getHealth();
            res.json(health);
        });

        // Service statistics
        this.app.get('/stats', (req, res) => {
            const stats = this.restaurantService.getStats();
            res.json(stats);
        });

        // API routes
        this.app.use('/restaurants', restaurantRoutes);
        this.app.use('/search', searchRoutes);
        this.app.use('/food-items', foodItemRoutes);

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                service: 'Restaurant Service',
                version: '1.0.0',
                status: 'running',
                endpoints: {
                    health: '/health',
                    stats: '/stats',
                    restaurants: '/restaurants',
                    search: '/search',
                    foodItems: '/food-items'
                },
                documentation: '/docs'
            });
        });

        // Documentation endpoint
        this.app.get('/docs', (req, res) => {
            res.json({
                service: 'Restaurant Service API Documentation',
                version: '1.0.0',
                endpoints: {
                    'GET /health': 'Service health check',
                    'GET /stats': 'Service statistics',
                    'GET /': 'Service information',
                    'GET /restaurants': 'Get restaurants by location',
                    'GET /restaurants/:id': 'Get restaurant by ID',
                    'GET /restaurants/:id/menu': 'Get restaurant menu',
                    'POST /search': 'Search restaurants and food items',
                    'GET /food-items': 'Get food items'
                },
                examples: {
                    'Get restaurants by location': 'GET /restaurants?customer_lat=40.7128&customer_lng=-74.0060&radius=5',
                    'Get restaurant menu': 'GET /restaurants/123/menu',
                    'Search for pizza': 'POST /search {"foodItem": "pizza", "customerLocation": {"latitude": 40.7128, "longitude": -74.0060}, "radius": 5}'
                }
            });
        });
    }

    setupErrorHandling() {
        // 404 handler
        this.app.use((req, res, next) => {
            res.status(404).json({
                error: {
                    code: 'ENDPOINT_NOT_FOUND',
                    message: `Endpoint ${req.method} ${req.path} not found`
                }
            });
        });

        // Global error handler
        this.app.use((error, req, res, next) => {
            const processingTime = Date.now() - req.startTime;
            
            logger.error('Restaurant Server Error:', {
                error: error.message,
                stack: error.stack,
                method: req.method,
                path: req.path,
                processingTime
            });

            // Don't expose internal errors in production
            const errorMessage = process.env.NODE_ENV === 'production' 
                ? 'Internal server error' 
                : error.message;

            res.status(error.status || 500).json({
                error: {
                    code: error.code || 'INTERNAL_SERVER_ERROR',
                    message: errorMessage
                },
                processingTime
            });
        });
    }

    async start() {
        try {
            // Test database connection
            const { query } = require('./utils/database');
            await query('SELECT 1');
            logger.info('Database connection successful');

            // Test Redis connection with error handling
            try {
                const { client } = require('./utils/redis');
                if (client.isOpen) {
                    await client.ping();
                    logger.info('Redis connection successful');
                } else {
                    logger.warn('Redis client not connected, attempting to connect...');
                    await client.connect();
                    await client.ping();
                    logger.info('Redis connection successful');
                }
            } catch (redisError) {
                logger.warn('Redis connection failed, continuing without Redis:', redisError.message);
                // Continue without Redis - the service can still work with database-only
            }

            this.server = this.app.listen(this.port, () => {
                logger.info(`Restaurant Service started on port ${this.port}`);
                logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
                logger.info(`Health check: http://localhost:${this.port}/health`);
                logger.info(`Documentation: http://localhost:${this.port}/docs`);
            });

            // Graceful shutdown
            process.on('SIGTERM', () => this.shutdown());
            process.on('SIGINT', () => this.shutdown());

        } catch (error) {
            logger.error('Failed to start Restaurant Service:', error);
            process.exit(1);
        }
    }

    async shutdown() {
        logger.info('Restaurant Service shutting down...');
        
        try {
            await this.restaurantService.shutdown();
            
            if (this.server) {
                this.server.close(() => {
                    logger.info('Restaurant Service stopped');
                    process.exit(0);
                });
            } else {
                process.exit(0);
            }
        } catch (error) {
            logger.error('Error during shutdown:', error);
            process.exit(1);
        }
    }
}

// Start the server if this file is run directly
if (require.main === module) {
    const server = new RestaurantServer();
    server.start().catch(error => {
        logger.error('Failed to start server:', error);
        process.exit(1);
    });
}

module.exports = RestaurantServer;
