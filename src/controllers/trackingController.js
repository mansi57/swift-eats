const { query } = require('../utils/database');
const { cache } = require('../utils/redis');
const logger = require('../utils/logger');

class TrackingController {
  /**
   * Get order tracking information
   */
  static async getOrderTracking(orderId, customerId) {
    try {
      // Try to get from cache first
      const cacheKey = `order_tracking:${orderId}`;
      const cachedResult = await cache.get(cacheKey);
      
      if (cachedResult) {
        logger.debug('Order tracking found in cache');
        return cachedResult;
      }

      const sql = `
        SELECT 
          o.id,
          o.current_status,
          o.estimated_delivery_time,
          o.created_at,
          o.driver_id,
          o.driver_name,
          o.restaurant_name,
          o.destination,
          d.current_location,
          d.status as driver_status
        FROM orders o
        LEFT JOIN drivers d ON o.driver_id = d.id
        WHERE o.id = $1 AND o.customer_id = $2
      `;

      const result = await query(sql, [orderId, customerId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const order = result.rows[0];
      
      const trackingInfo = {
        orderId: order.id,
        currentStatus: order.current_status,
        estimatedDeliveryTime: order.estimated_delivery_time,
        createdAt: order.created_at,
        driverId: order.driver_id,
        driverName: order.driver_name,
        restaurantName: order.restaurant_name,
        destination: typeof order.destination === 'string' ? JSON.parse(order.destination) : order.destination,
        driverLocation: order.current_location,
        driverStatus: order.driver_status,
        lastUpdated: new Date().toISOString()
      };

      // Cache the result for 30 seconds (real-time data)
      await cache.set(cacheKey, trackingInfo, 30);

      logger.info('Order tracking retrieved', { orderId, customerId });
      return trackingInfo;
    } catch (error) {
      logger.error('Error getting order tracking:', error);
      throw error;
    }
  }

  /**
   * Get driver's current location
   */
  static async getDriverLocation(orderId, customerId) {
    try {
      // Try to get from cache first
      const cacheKey = `driver_location:${orderId}`;
      const cachedResult = await cache.get(cacheKey);
      
      if (cachedResult) {
        logger.debug('Driver location found in cache');
        return cachedResult;
      }

      const sql = `
        SELECT 
          d.id as driver_id,
          d.name as driver_name,
          d.current_location,
          d.status,
          d.last_location_update
        FROM orders o
        JOIN drivers d ON o.driver_id = d.id
        WHERE o.id = $1 AND o.customer_id = $2
      `;

      const result = await query(sql, [orderId, customerId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const driver = result.rows[0];
      
      const driverLocation = {
        driverId: driver.driver_id,
        driverName: driver.driver_name,
        currentLocation: driver.current_location,
        status: driver.status,
        lastUpdated: driver.last_location_update || new Date().toISOString()
      };

      // Cache the result for 10 seconds (very frequent updates)
      await cache.set(cacheKey, driverLocation, 10);

      logger.info('Driver location retrieved', { orderId, customerId });
      return driverLocation;
    } catch (error) {
      logger.error('Error getting driver location:', error);
      throw error;
    }
  }

  /**
   * Get order ETA
   */
  static async getOrderETA(orderId, customerId) {
    try {
      // Try to get from cache first
      const cacheKey = `order_eta:${orderId}`;
      const cachedResult = await cache.get(cacheKey);
      
      if (cachedResult) {
        logger.debug('Order ETA found in cache');
        return cachedResult;
      }

      const sql = `
        SELECT 
          o.id,
          o.current_status,
          o.estimated_delivery_time,
          o.created_at,
          o.destination,
          ST_SetSRID(ST_MakePoint(r.longitude, r.latitude), 4326) as restaurant_location,
          d.current_location as driver_location,
          d.status as driver_status
        FROM orders o
        JOIN restaurants r ON o.restaurant_id = r.id
        LEFT JOIN drivers d ON o.driver_id = d.id
        WHERE o.id = $1 AND o.customer_id = $2
      `;

      const result = await query(sql, [orderId, customerId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const order = result.rows[0];
      
      // Calculate ETA based on current status and location
      let estimatedDeliveryTime = order.estimated_delivery_time;
      
      if (!estimatedDeliveryTime && order.driver_location) {
        // Calculate ETA from driver's current location to destination
        estimatedDeliveryTime = await this.calculateETA(
          order.driver_location,
          order.destination
        );
      }

      const eta = {
        orderId: order.id,
        estimatedDeliveryTime: estimatedDeliveryTime || order.estimated_delivery_time,
        currentStatus: order.current_status,
        lastUpdated: new Date().toISOString()
      };

      // Cache the result for 1 minute
      await cache.set(cacheKey, eta, 60);

      logger.info('Order ETA retrieved', { orderId, customerId });
      return eta;
    } catch (error) {
      logger.error('Error getting order ETA:', error);
      throw error;
    }
  }

  /**
   * Calculate ETA from current location to destination
   */
  static async calculateETA(currentLocation, destination) {
    try {
      // This is a simplified ETA calculation
      // In production, you would integrate with a real-time traffic service
      // and use more sophisticated algorithms

      if (!currentLocation || !destination) {
        return null;
      }

      // Calculate distance using PostGIS
      const sql = `
        SELECT ST_Distance(
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
          ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography
        ) as distance
      `;

      const result = await query(sql, [
        currentLocation.longitude,
        currentLocation.latitude,
        destination.longitude,
        destination.latitude
      ]);

      if (result.rows.length === 0) {
        return null;
      }

      const distance = result.rows[0].distance; // Distance in meters
      
      // Assume average speed of 30 km/h (8.33 m/s) for delivery
      const averageSpeed = 8.33; // meters per second
      const estimatedTimeSeconds = distance / averageSpeed;
      
      // Add buffer time for traffic, stops, etc.
      const bufferTime = 300; // 5 minutes in seconds
      const totalTimeSeconds = estimatedTimeSeconds + bufferTime;
      
      // Calculate estimated arrival time
      const estimatedArrival = new Date();
      estimatedArrival.setSeconds(estimatedArrival.getSeconds() + totalTimeSeconds);
      
      return estimatedArrival.toISOString();
    } catch (error) {
      logger.error('Error calculating ETA:', error);
      return null;
    }
  }

  /**
   * Update driver location (called by driver app)
   */
  static async updateDriverLocation(driverId, location) {
    try {
      const sql = `
        UPDATE drivers 
        SET current_location = $1, last_location_update = $2
        WHERE id = $3
      `;

      await query(sql, [JSON.stringify(location), new Date(), driverId]);

      // Clear related caches
      await this.clearDriverLocationCaches(driverId);

      logger.info('Driver location updated', { driverId, location });
      return true;
    } catch (error) {
      logger.error('Error updating driver location:', error);
      throw error;
    }
  }

  /**
   * Clear driver location caches
   */
  static async clearDriverLocationCaches(driverId) {
    try {
      // Get orders for this driver
      const sql = `
        SELECT id FROM orders WHERE driver_id = $1
      `;
      
      const result = await query(sql, [driverId]);
      
      // Clear caches for each order
      for (const row of result.rows) {
        await cache.delete(`driver_location:${row.id}`);
        await cache.delete(`order_tracking:${row.id}`);
        await cache.delete(`order_eta:${row.id}`);
      }
    } catch (error) {
      logger.warn('Error clearing driver location caches:', error);
    }
  }

  /**
   * Get real-time order updates (for polling)
   */
  static async getOrderUpdates(orderId, customerId, lastUpdate) {
    try {
      const sql = `
        SELECT 
          o.id,
          o.current_status,
          o.updated_at,
          o.estimated_delivery_time,
          d.current_location,
          d.status as driver_status
        FROM orders o
        LEFT JOIN drivers d ON o.driver_id = d.id
        WHERE o.id = $1 AND o.customer_id = $2
        AND o.updated_at > $3
      `;

      const result = await query(sql, [orderId, customerId, lastUpdate]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const order = result.rows[0];
      
      return {
        orderId: order.id,
        currentStatus: order.current_status,
        updatedAt: order.updated_at,
        estimatedDeliveryTime: order.estimated_delivery_time,
        driverLocation: order.current_location,
        driverStatus: order.driver_status
      };
    } catch (error) {
      logger.error('Error getting order updates:', error);
      throw error;
    }
  }
}

module.exports = TrackingController;
