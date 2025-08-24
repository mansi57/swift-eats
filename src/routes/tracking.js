const express = require('express');
const { validate, schemas } = require('../middleware/validation');
const { authMiddleware } = require('../middleware/auth');
const TrackingController = require('../controllers/trackingController');
const logger = require('../utils/logger');

const router = express.Router();

// GET /tracking/{orderId} - Real-time order tracking
router.get('/:orderId',
  authMiddleware,
  validate(schemas.uuid, 'params'),
  async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const customerId = req.user.id;

      logger.info('Fetching order tracking:', { orderId, customerId });

      const trackingInfo = await TrackingController.getOrderTracking(orderId, customerId);
      
      if (!trackingInfo) {
        return res.status(404).json({
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'Order not found'
          }
        });
      }

      res.json(trackingInfo);
    } catch (error) {
      next(error);
    }
  }
);

// GET /tracking/{orderId}/driver-location - Get driver's current location
router.get('/:orderId/driver-location',
  authMiddleware,
  validate(schemas.uuid, 'params'),
  async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const customerId = req.user.id;

      logger.info('Fetching driver location:', { orderId, customerId });

      const driverLocation = await TrackingController.getDriverLocation(orderId, customerId);
      
      if (!driverLocation) {
        return res.status(404).json({
          error: {
            code: 'DRIVER_LOCATION_NOT_FOUND',
            message: 'Driver location not available'
          }
        });
      }

      res.json({
        orderId,
        driverId: driverLocation.driverId,
        driverName: driverLocation.driverName,
        currentLocation: driverLocation.currentLocation,
        status: driverLocation.status,
        lastUpdated: driverLocation.lastUpdated
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /tracking/{orderId}/eta - Get estimated delivery time
router.get('/:orderId/eta',
  authMiddleware,
  validate(schemas.uuid, 'params'),
  async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const customerId = req.user.id;

      logger.info('Fetching order ETA:', { orderId, customerId });

      const eta = await TrackingController.getOrderETA(orderId, customerId);
      
      if (!eta) {
        return res.status(404).json({
          error: {
            code: 'ETA_NOT_FOUND',
            message: 'ETA not available for this order'
          }
        });
      }

      res.json({
        orderId,
        estimatedDeliveryTime: eta.estimatedDeliveryTime,
        currentStatus: eta.currentStatus,
        lastUpdated: eta.lastUpdated
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
