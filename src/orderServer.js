const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const OrderController = require('./controllers/orderController');
const orderRoutes = require('./routes/orders');
const trackingRoutes = require('./routes/tracking');
const logger = require('./utils/logger');
const { AssignmentEventsConsumer } = require('./utils/assignmentMessaging');

class OrderServer {
    constructor() {
        this.app = express();
        this.port = process.env.ORDER_SERVICE_PORT || 3003;
        
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
            res.json({
                status: 'healthy',
                uptime: process.uptime() * 1000,
                service: 'order-service',
                timestamp: new Date().toISOString()
            });
        });

        // Service statistics
        this.app.get('/stats', (req, res) => {
            res.json({
                service: 'order-service',
                uptime: process.uptime() * 1000,
                memory: process.memoryUsage(),
                timestamp: new Date().toISOString()
            });
        });

        // API routes
        this.app.use('/api/orders', orderRoutes);
        this.app.use('/api/tracking', trackingRoutes);

        // Root endpoint
        this.app.get('/', (req, res) => {
            res.json({
                service: 'Order Service',
                version: '1.0.0',
                status: 'running',
                endpoints: {
                    health: '/health',
                    stats: '/stats',
                    orders: '/api/orders',
                    tracking: '/api/tracking'
                },
                documentation: '/docs'
            });
        });

        // Documentation endpoint
        this.app.get('/docs', (req, res) => {
            res.json({
                service: 'Order Service API Documentation',
                version: '1.0.0',
                endpoints: {
                    'GET /health': 'Service health check',
                    'GET /stats': 'Service statistics',
                    'GET /': 'Service information',
                    'GET /api/orders': 'Get customer orders',
                    'POST /api/orders': 'Create new order',
                    'GET /api/orders/:id': 'Get order by ID',
                    'PUT /api/orders/:id/status': 'Update order status',
                    'GET /api/tracking': 'Get order tracking information'
                },
                examples: {
                    'Create order': 'POST /api/orders {"destination": {"latitude": 40.7128, "longitude": -74.0060}, "restaurant": "restaurant-id", "items": [{"id": "item-id", "quantity": 2}], "specialInstructions": "Extra cheese"}',
                    'Get customer orders': 'GET /api/orders?customerId=customer-id&status=pending&limit=10&offset=0',
                    'Get order by ID': 'GET /api/orders/order-id',
                    'Update order status': 'PUT /api/orders/order-id/status {"status": "confirmed", "driverId": "driver-id", "estimatedDeliveryTime": "2025-08-28T21:00:00Z"}'
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
            
            logger.error('Order Server Error:', {
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
            try {
                const { query } = require('./utils/database');
                await query('SELECT 1');
                logger.info('Database connection successful');
            } catch (dbError) {
                logger.warn('Database connection failed, continuing without database:', dbError.message);
                // Continue without database for now to get the service running
            }

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

            // Start assignment events consumer
            try {
                console.log('🎯 Order Service: Initializing assignment events consumer...');
                const consumer = new AssignmentEventsConsumer({
                    geoKey: process.env.DEFAULT_GEO_KEY || 'default-geo',
                    onAssigned: OrderController.handleDriverAssigned,
                    onFailed: OrderController.handleAssignmentFailed
                });
                consumer.start();
                console.log('✅ Order Service: Assignment events consumer initialized');
                logger.info('Assignment events consumer started successfully');
            } catch (err) {
                console.error('❌ Order Service: Failed to start assignment consumer:', err);
                logger.warn('Assignment events consumer not started', { error: err.message });
            }

            this.server = this.app.listen(this.port, () => {
                logger.info(`Order Service started on port ${this.port}`);
                logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
                logger.info(`Health check: http://localhost:${this.port}/health`);
                logger.info(`Documentation: http://localhost:${this.port}/docs`);
            });

            // Graceful shutdown
            process.on('SIGTERM', () => this.shutdown());
            process.on('SIGINT', () => this.shutdown());

        } catch (error) {
            logger.error('Failed to start Order Service:', error);
            process.exit(1);
        }
    }

    async shutdown() {
        logger.info('Order Service shutting down...');
        
        try {
            if (this.server) {
                this.server.close(() => {
                    logger.info('Order Service stopped');
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
    const server = new OrderServer();
    server.start().catch(error => {
        logger.error('Failed to start server:', error);
        process.exit(1);
    });
}

module.exports = OrderServer;





