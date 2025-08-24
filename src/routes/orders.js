const express = require('express');
const { validate, schemas } = require('../middleware/validation');
const { authMiddleware } = require('../middleware/auth');
const OrderController = require('../controllers/orderController');
const logger = require('../utils/logger');

const router = express.Router();

// GET /orders - Get customer orders
router.get('/',
  authMiddleware,
  validate(schemas.pagination, 'query'),
  async (req, res, next) => {
    try {
      const { customerId, status, limit, offset } = req.query;
      
      // Ensure customer can only access their own orders
      if (customerId !== req.user.id) {
        return res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You can only access your own orders'
          }
        });
      }

      logger.info('Fetching customer orders:', {
        customerId,
        status,
        limit,
        offset
      });

      const result = await OrderController.getCustomerOrders(
        customerId,
        status,
        limit,
        offset
      );

      res.json({
        orders: result.orders,
        totalCount: result.totalCount
      });
    } catch (error) {
      next(error);
    }
  }
);

// POST /orders - Create new order
router.post('/',
  authMiddleware,
  validate(schemas.orderCreation, 'body'),
  async (req, res, next) => {
    try {
      const { destination, restaurant, items, specialInstructions } = req.body;
      const customerId = req.user.id;

      logger.info('Creating new order:', {
        customerId,
        restaurantId: restaurant,
        itemCount: items.length,
        destination
      });

      const order = await OrderController.createOrder(
        customerId,
        destination,
        restaurant,
        items,
        specialInstructions
      );

      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  }
);

// GET /orders/{id} - Get order by ID
router.get('/:id',
  authMiddleware,
  validate(schemas.uuid, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const customerId = req.user.id;

      logger.info('Fetching order by ID:', { orderId: id, customerId });

      const order = await OrderController.getOrderById(id, customerId);
      
      if (!order) {
        return res.status(404).json({
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'Order not found'
          }
        });
      }

      res.json(order);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /orders/{id}/status - Update order status
router.put('/:id/status',
  authMiddleware,
  validate(schemas.uuid, 'params'),
  validate(schemas.orderStatusUpdate, 'body'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status, driverId, estimatedDeliveryTime } = req.body;
      const customerId = req.user.id;

      logger.info('Updating order status:', {
        orderId: id,
        customerId,
        newStatus: status,
        driverId,
        estimatedDeliveryTime
      });

      const updatedOrder = await OrderController.updateOrderStatus(
        id,
        customerId,
        status,
        driverId,
        estimatedDeliveryTime
      );

      if (!updatedOrder) {
        return res.status(404).json({
          error: {
            code: 'ORDER_NOT_FOUND',
            message: 'Order not found'
          }
        });
      }

      res.json(updatedOrder);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
