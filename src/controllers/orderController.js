const { query, getClient } = require('../utils/database');
const { cache } = require('../utils/redis');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class OrderController {
  /**
   * Create a new order
   */
  static async createOrder(customerId, destination, restaurantId, items, specialInstructions) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Get customer information
      const customerSql = `
        SELECT name, location FROM customers WHERE _id = $1
      `;
      const customerResult = await client.query(customerSql, [customerId]);
      
      if (customerResult.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const customer = customerResult.rows[0];

      // Get restaurant information
      const restaurantSql = `
        SELECT name, location FROM restaurants WHERE _id = $1
      `;
      const restaurantResult = await client.query(restaurantSql, [restaurantId]);
      
      if (restaurantResult.rows.length === 0) {
        throw new Error('Restaurant not found');
      }

      const restaurant = restaurantResult.rows[0];

      // Validate and reserve inventory for each item
      const orderItems = [];
      let totalAmount = 0;

      for (const item of items) {
        const availability = await this.checkAndReserveInventory(
          client, 
          item.id, 
          item.quantity
        );

        if (!availability.available) {
          throw new Error(`Item ${item.name} is not available in requested quantity`);
        }

        // Get item details
        const itemSql = `
          SELECT name, price FROM food_items WHERE _id = $1
        `;
        const itemResult = await client.query(itemSql, [item.id]);
        
        if (itemResult.rows.length === 0) {
          throw new Error(`Food item not found: ${item.id}`);
        }

        const foodItem = itemResult.rows[0];
        const itemTotal = foodItem.price * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          id: item.id,
          name: foodItem.name,
          quantity: item.quantity,
          price: foodItem.price,
          specialInstructions: item.specialInstructions
        });
      }

      // Create the order
      const orderId = uuidv4();
      const orderSql = `
        INSERT INTO orders (
          _id, customer_id, customer_name, restaurant_id, restaurant_name,
          items, current_status, total_amount, destination, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const orderResult = await client.query(orderSql, [
        orderId,
        customerId,
        customer.name,
        restaurantId,
        restaurant.name,
        JSON.stringify(orderItems),
        'new_order',
        totalAmount,
        JSON.stringify(destination),
        new Date()
      ]);

      const order = orderResult.rows[0];

      // Update inventory counts
      for (const item of items) {
        await this.updateInventoryCount(client, item.id, item.quantity);
      }

      await client.query('COMMIT');

      // Clear relevant caches
      await this.clearOrderCaches(customerId);

      logger.info('Order created successfully', {
        orderId,
        customerId,
        restaurantId,
        itemCount: items.length,
        totalAmount
      });

      return this.transformOrder(order);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error creating order:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get customer orders
   */
  static async getCustomerOrders(customerId, status, limit, offset) {
    try {
      // Try to get from cache first
      const cacheKey = `customer_orders:${customerId}:${status || 'all'}:${limit}:${offset}`;
      const cachedResult = await cache.get(cacheKey);
      
      if (cachedResult) {
        logger.debug('Customer orders found in cache');
        return cachedResult;
      }

      let sql = `
        SELECT * FROM orders 
        WHERE customer_id = $1
      `;
      
      const params = [customerId];
      let paramIndex = 2;

      if (status) {
        sql += ` AND current_status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      sql += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await query(sql, params);
      
      // Get total count
      let countSql = `
        SELECT COUNT(*) as total FROM orders WHERE customer_id = $1
      `;
      
      const countParams = [customerId];
      if (status) {
        countSql += ` AND current_status = $2`;
        countParams.push(status);
      }
      
      const countResult = await query(countSql, countParams);
      const totalCount = parseInt(countResult.rows[0].total);

      const orders = result.rows.map(order => this.transformOrder(order));

      const response = {
        orders,
        totalCount
      };

      // Cache the result for 2 minutes
      await cache.set(cacheKey, response, 120);

      logger.info('Customer orders retrieved', {
        customerId,
        status,
        count: orders.length,
        totalCount
      });

      return response;
    } catch (error) {
      logger.error('Error getting customer orders:', error);
      throw error;
    }
  }

  /**
   * Get order by ID
   */
  static async getOrderById(orderId, customerId) {
    try {
      const sql = `
        SELECT * FROM orders 
        WHERE _id = $1 AND customer_id = $2
      `;

      const result = await query(sql, [orderId, customerId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const order = result.rows[0];
      logger.info('Order retrieved by ID', { orderId, customerId });

      return this.transformOrder(order);
    } catch (error) {
      logger.error('Error getting order by ID:', error);
      throw error;
    }
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(orderId, customerId, status, driverId, estimatedDeliveryTime) {
    const client = await getClient();
    
    try {
      await client.query('BEGIN');

      // Verify order exists and belongs to customer
      const orderSql = `
        SELECT * FROM orders WHERE _id = $1 AND customer_id = $2
      `;
      const orderResult = await client.query(orderSql, [orderId, customerId]);
      
      if (orderResult.rows.length === 0) {
        return null;
      }

      const order = orderResult.rows[0];

      // Update order status
      let updateSql = `
        UPDATE orders 
        SET current_status = $1, updated_at = $2
      `;
      
      const params = [status, new Date()];
      let paramIndex = 3;

      if (driverId) {
        updateSql += `, driver_id = $${paramIndex}`;
        params.push(driverId);
        paramIndex++;
      }

      if (estimatedDeliveryTime) {
        updateSql += `, estimated_delivery_time = $${paramIndex}`;
        params.push(estimatedDeliveryTime);
        paramIndex++;
      }

      updateSql += ` WHERE _id = $${paramIndex} RETURNING *`;
      params.push(orderId);

      const updateResult = await client.query(updateSql, params);
      const updatedOrder = updateResult.rows[0];

      // If assigning driver, update driver status
      if (driverId && status === 'assigned_driver') {
        await this.assignDriverToOrder(client, driverId, orderId);
      }

      await client.query('COMMIT');

      // Clear relevant caches
      await this.clearOrderCaches(customerId);

      logger.info('Order status updated', {
        orderId,
        customerId,
        newStatus: status,
        driverId
      });

      return this.transformOrder(updatedOrder);
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Error updating order status:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check and reserve inventory for an item
   */
  static async checkAndReserveInventory(client, foodItemId, quantity) {
    const sql = `
      SELECT available, inventory_count 
      FROM food_items 
      WHERE _id = $1
      FOR UPDATE
    `;

    const result = await client.query(sql, [foodItemId]);
    
    if (result.rows.length === 0) {
      return { available: false, inventoryCount: 0 };
    }

    const foodItem = result.rows[0];
    
    if (!foodItem.available || foodItem.inventory_count < quantity) {
      return { available: false, inventoryCount: foodItem.inventory_count };
    }

    return { available: true, inventoryCount: foodItem.inventory_count };
  }

  /**
   * Update inventory count after order
   */
  static async updateInventoryCount(client, foodItemId, quantity) {
    const sql = `
      UPDATE food_items 
      SET inventory_count = inventory_count - $1,
          updated_at = $2
      WHERE _id = $2
    `;

    await client.query(sql, [quantity, new Date(), foodItemId]);
  }

  /**
   * Assign driver to order
   */
  static async assignDriverToOrder(client, driverId, orderId) {
    const sql = `
      UPDATE drivers 
      SET busy = true, current_order = $1, status = 'order_assigned'
      WHERE _id = $2
    `;

    await client.query(sql, [orderId, driverId]);
  }

  /**
   * Clear order-related caches
   */
  static async clearOrderCaches(customerId) {
    try {
      const pattern = `customer_orders:${customerId}:*`;
      // Note: Redis doesn't support pattern deletion in the version we're using
      // In production, you might want to use Redis SCAN command or maintain a list of keys
      await cache.delete(`customer_orders:${customerId}:all:20:0`);
    } catch (error) {
      logger.warn('Error clearing order caches:', error);
    }
  }

  /**
   * Transform order data for API response
   */
  static transformOrder(order) {
    return {
      _id: order._id,
      customerId: order.customer_id,
      customerName: order.customer_name,
      driverId: order.driver_id,
      driverName: order.driver_name,
      restaurantId: order.restaurant_id,
      restaurantName: order.restaurant_name,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
      currentStatus: order.current_status,
      totalAmount: order.total_amount,
      destination: typeof order.destination === 'string' ? JSON.parse(order.destination) : order.destination,
      createdAt: order.created_at,
      estimatedDeliveryTime: order.estimated_delivery_time,
      actualDeliveryTime: order.actual_delivery_time
    };
  }
}

module.exports = OrderController;
