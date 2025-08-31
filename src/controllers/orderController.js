const { query, getClient } = require('../utils/database');
const { cache } = require('../utils/redis');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const { DriverAssignmentPublisher } = require('../utils/assignmentMessaging');

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
        SELECT name, latitude, longitude FROM customers WHERE id = $1
      `;
      const customerResult = await client.query(customerSql, [customerId]);
      
      if (customerResult.rows.length === 0) {
        throw new Error('Customer not found');
      }

      const customer = customerResult.rows[0];

      // Get restaurant information
      const restaurantSql = `
        SELECT name, latitude, longitude FROM restaurants WHERE id = $1
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
          SELECT name, price FROM food_items WHERE id = $1
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

      // Create the order (database auto-generates ID)
      const orderSql = `
        INSERT INTO orders (
          customer_id, restaurant_id, status, total_amount, 
          delivery_address, delivery_latitude, delivery_longitude,
          special_instructions
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const orderResult = await client.query(orderSql, [
        customerId,
        restaurantId,
        'pending',
        totalAmount,
        `${destination.latitude}, ${destination.longitude}`, // Simple address format
        destination.latitude,
        destination.longitude,
        specialInstructions || ''
      ]);

      const order = orderResult.rows[0];
      const orderId = order.id;

      // Create order items
      for (const item of orderItems) {
        const orderItemSql = `
          INSERT INTO order_items (order_id, food_item_id, quantity, unit_price, total_price, special_instructions)
          VALUES ($1, $2, $3, $4, $5, $6)
        `;
        await client.query(orderItemSql, [
          orderId,
          item.id,
          item.quantity,
          item.price,
          item.price * item.quantity, // total_price = unit_price * quantity
          item.specialInstructions || ''
        ]);
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

      const transformed = this.transformOrder(order);

      // Publish driver assignment request after "payment" success (mocked here)
      try {
        const publisher = new DriverAssignmentPublisher();
        const prepTimeRemaining = 10; // TODO: compute from items/restaurant
        
        // Extract coordinates from restaurant and customer locations
        const restaurantLocation = {
          latitude: restaurant.latitude,
          longitude: restaurant.longitude
        };
        const customerLocation = destination;
        
        const assignmentRequest = {
          orderId: orderId,
          restaurantLatitude: restaurantLocation.latitude,
          restaurantLongitude: restaurantLocation.longitude,
          customerLatitude: customerLocation.latitude,
          customerLongitude: customerLocation.longitude,
          preparationTime: prepTimeRemaining,
          radius: 5, // Default search radius in km
          items: orderItems,
          totalAmount: totalAmount,
          specialInstructions: specialInstructions
        };
        
        await publisher.publishAssignmentRequested(assignmentRequest);
        logger.info('Driver assignment request published', { orderId, assignmentRequest });
      } catch (err) {
        logger.warn('Failed to publish AssignmentRequested', { error: err.message, orderId });
      }

      return transformed;
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
        sql += ` AND status = $${paramIndex}`;
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
        countSql += ` AND status = $2`;
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
        WHERE id = $1 AND customer_id = $2
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
        SELECT * FROM orders WHERE id = $1 AND customer_id = $2
      `;
      const orderResult = await client.query(orderSql, [orderId, customerId]);
      
      if (orderResult.rows.length === 0) {
        return null;
      }

      const order = orderResult.rows[0];

      // Update order status
      let updateSql = `
        UPDATE orders 
        SET status = $1
      `;
      
      const params = [status];
      let paramIndex = 2;

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

      updateSql += ` WHERE id = $${paramIndex} RETURNING *`;
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
      SELECT is_available 
      FROM food_items 
      WHERE id = $1
      FOR UPDATE
    `;

    const result = await client.query(sql, [foodItemId]);
    
    if (result.rows.length === 0) {
      return { available: false, inventoryCount: 0 };
    }

    const foodItem = result.rows[0];
    
    if (!foodItem.is_available) {
      return { available: false, inventoryCount: 0 };
    }

    // For MVP, we'll assume items are always in stock if available
    return { available: true, inventoryCount: 999 };
  }

  /**
   * Update inventory count after order
   */
  static async updateInventoryCount(client, foodItemId, quantity) {
    const sql = `
      UPDATE food_items 
      SET inventory_count = inventory_count - $1,
          updated_at = $2
      WHERE id = $2
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
      WHERE id = $2
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
   * Handle driver assignment response from Driver Assignment Service
   */
  static async handleDriverAssigned(event) {
    try {
      console.log('🎯 Order Service: handleDriverAssigned called with event:', event);
      const { orderId, driverId, eta } = event;
      
      console.log('🎯 Order Service: Updating order in database:', { orderId, driverId, eta });
      logger.info('Driver assigned to order', { orderId, driverId, eta });
      
      // Update order with driver assignment
      const client = await getClient();
      
      try {
        await client.query('BEGIN');
        
        // Update order status and driver information
        const updateSql = `
          UPDATE orders 
          SET status = 'assigned', 
              driver_id = $1, 
              estimated_delivery_time = $2
          WHERE id = $3
          RETURNING *
        `;
        
        const estimatedDeliveryTime = new Date(Date.now() + (eta || 30) * 60 * 1000); // Convert minutes to milliseconds
        
        console.log('🎯 Order Service: Executing SQL update with params:', {
          driverId,
          estimatedDeliveryTime,
          orderId
        });
        
        const result = await client.query(updateSql, [
          driverId, 
          estimatedDeliveryTime, 
          orderId
        ]);
        
        if (result.rows.length === 0) {
          throw new Error('Order not found');
        }
        
        // Driver assignment completed - order and driver are now linked
        console.log('✅ Order Service: Order successfully updated with driver assignment');
        
        await client.query('COMMIT');
        
        // Clear relevant caches
        const order = result.rows[0];
        await this.clearOrderCaches(order.customer_id);
        
        logger.info('Order updated with driver assignment', { orderId, driverId, eta });
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      logger.error('Error handling driver assignment', { error: error.message, event });
    }
  }

  /**
   * Handle driver assignment failure from Driver Assignment Service
   */
  static async handleAssignmentFailed(event) {
    try {
      const { orderId, error } = event;
      
      logger.warn('Driver assignment failed', { orderId, error });
      
      // Update order status to indicate assignment failure
      const client = await getClient();
      
      try {
        await client.query('BEGIN');
        
        const updateSql = `
          UPDATE orders 
          SET status = 'failed'
          WHERE id = $1
          RETURNING *
        `;
        
        const result = await client.query(updateSql, [orderId]);
        
        if (result.rows.length === 0) {
          throw new Error('Order not found');
        }
        
        await client.query('COMMIT');
        
        // Clear relevant caches
        const order = result.rows[0];
        await this.clearOrderCaches(order.customer_id);
        
        logger.info('Order updated with assignment failure', { orderId, error });
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      logger.error('Error handling assignment failure', { error: error.message, event });
    }
  }

  /**
   * Transform order data for API response
   */
  static transformOrder(order) {
    return {
      id: order.id,
      customerId: order.customer_id,
      customerName: order.customer_name,
      driverId: order.driver_id,
      driverName: order.driver_name,
      restaurantId: order.restaurant_id,
      restaurantName: order.restaurant_name,
      items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items,
      currentStatus: order.status,
      totalAmount: order.total_amount,
      destination: typeof order.destination === 'string' ? JSON.parse(order.destination) : order.destination,
      createdAt: order.created_at,
      estimatedDeliveryTime: order.estimated_delivery_time,
      actualDeliveryTime: order.actual_delivery_time
    };
  }
}

module.exports = OrderController;
