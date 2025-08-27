const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const rateLimiter = require('./middleware/rateLimiter');
const authMiddleware = require('./middleware/auth');

// Import routes
const restaurantRoutes = require('./routes/restaurants');
const foodItemRoutes = require('./routes/foodItems');
const searchRoutes = require('./routes/search');
const orderRoutes = require('./routes/orders');
const trackingRoutes = require('./routes/tracking');
const { AssignmentEventsConsumer } = require('./utils/assignmentMessaging');
const { query } = require('./utils/database');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = process.env.API_VERSION || 'v1';

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Rate limiting
app.use(rateLimiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use(`/api/${API_VERSION}/restaurants`, restaurantRoutes);
app.use(`/api/${API_VERSION}/food-items`, foodItemRoutes);
app.use(`/api/${API_VERSION}/search`, searchRoutes);
app.use(`/api/${API_VERSION}/orders`, orderRoutes);
app.use(`/api/${API_VERSION}/tracking`, trackingRoutes);

// API documentation
app.get(`/api/${API_VERSION}`, (req, res) => {
  res.json({
    name: 'Swift Eats API',
    version: '1.0.0',
    description: 'Real-time Food Delivery Platform API',
    endpoints: {
      restaurants: `/api/${API_VERSION}/restaurants`,
      foodItems: `/api/${API_VERSION}/food-items`,
      search: `/api/${API_VERSION}/search`,
      orders: `/api/${API_VERSION}/orders`,
      tracking: `/api/${API_VERSION}/tracking`
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} not found`,
      details: {
        method: req.method,
        path: req.path
      }
    }
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Swift Eats API server running on port ${PORT}`);
  logger.info(`📚 API Documentation available at /api/${API_VERSION}`);
  logger.info(`🏥 Health check available at /health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Start assignment events consumer (orders service side)
try {
  const OrderController = require('./controllers/orderController');
  const consumer = new AssignmentEventsConsumer({
    geoKey: process.env.DEFAULT_GEO_KEY || 'default-geo',
    onAssigned: OrderController.handleDriverAssigned,
    onFailed: OrderController.handleAssignmentFailed
  });
  consumer.start();
  logger.info('Assignment events consumer started successfully');
} catch (err) {
  logger.warn('Assignment events consumer not started', { error: err.message });
}

module.exports = app;
