const { query } = require('../utils/database');
const { cache } = require('../utils/redis');
const logger = require('../utils/logger');

class RestaurantController {
  /**
   * Get restaurants by location with distance-based sorting
   */
  static async getRestaurantsByLocation(customerLocation, radius, cuisine, limit, offset) {
    const startTime = Date.now();
    
    try {
      // Try to get from cache first
      const cacheKey = `restaurants:${customerLocation.latitude}:${customerLocation.longitude}:${radius}:${cuisine || 'all'}:${limit}:${offset}`;
      const cachedResult = await cache.get(cacheKey);
      
      if (cachedResult) {
        logger.debug('Restaurants found in cache');
        return cachedResult;
      }

      // Build the SQL query with PostGIS distance calculation
      let sql = `
        SELECT 
          r._id,
          r.name,
          r.location,
          r.tags,
          r.pictures,
          r.rating,
          r.operating_hours,
          r.is_open,
          ST_Distance(
            r.location::geography, 
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          ) as distance
        FROM restaurants r
        WHERE ST_DWithin(
          r.location::geography, 
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
          $3 * 1000
        )
      `;

      const params = [customerLocation.longitude, customerLocation.latitude, radius];
      let paramIndex = 4;

      // Add cuisine filter if specified
      if (cuisine) {
        sql += ` AND r.tags->>'cuisine' = $${paramIndex}`;
        params.push(cuisine);
        paramIndex++;
      }

      // Add ordering and pagination
      sql += `
        ORDER BY distance ASC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      // Execute query
      const result = await query(sql, params);
      
      // Get total count for pagination
      let countSql = `
        SELECT COUNT(*) as total
        FROM restaurants r
        WHERE ST_DWithin(
          r.location::geography, 
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
          $3 * 1000
        )
      `;
      
      const countParams = [customerLocation.longitude, customerLocation.latitude, radius];
      if (cuisine) {
        countSql += ` AND r.tags->>'cuisine' = $4`;
        countParams.push(cuisine);
      }
      
      const countResult = await query(countSql, countParams);
      const totalCount = parseInt(countResult.rows[0].total);

      // Transform results
      const restaurants = result.rows.map(row => ({
        _id: row._id,
        name: row.name,
        location: row.location,
        tags: row.tags,
        pictures: row.pictures,
        rating: row.rating,
        operatingHours: row.operating_hours,
        isOpen: row.is_open,
        distance: Math.round(row.distance) // Distance in meters
      }));

      const searchTime = Date.now() - startTime;
      const response = {
        restaurants,
        totalCount,
        searchTime
      };

      // Cache the result for 5 minutes
      await cache.set(cacheKey, response, 300);

      logger.info('Restaurants search completed', {
        found: restaurants.length,
        totalCount,
        searchTime,
        radius,
        cuisine
      });

      return response;
    } catch (error) {
      logger.error('Error searching restaurants by location:', error);
      throw error;
    }
  }

  /**
   * Get restaurant by ID
   */
  static async getRestaurantById(id) {
    try {
      // Try to get from cache first
      const cacheKey = `restaurant:${id}`;
      const cachedResult = await cache.get(cacheKey);
      
      if (cachedResult) {
        logger.debug('Restaurant found in cache');
        return cachedResult;
      }

      const sql = `
        SELECT 
          _id,
          name,
          location,
          tags,
          pictures,
          rating,
          operating_hours,
          is_open
        FROM restaurants 
        WHERE _id = $1
      `;

      const result = await query(sql, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const restaurant = result.rows[0];
      const transformedRestaurant = {
        _id: restaurant._id,
        name: restaurant.name,
        location: restaurant.location,
        tags: restaurant.tags,
        rating: restaurant.rating,
        pictures: restaurant.pictures,
        operatingHours: restaurant.operating_hours,
        isOpen: restaurant.is_open
      };

      // Cache the result for 10 minutes
      await cache.set(cacheKey, transformedRestaurant, 600);

      logger.info('Restaurant retrieved by ID', { restaurantId: id });
      return transformedRestaurant;
    } catch (error) {
      logger.error('Error getting restaurant by ID:', error);
      throw error;
    }
  }

  /**
   * Get restaurant menu with food items
   */
  static async getRestaurantMenu(restaurantId) {
    try {
      // Try to get from cache first
      const cacheKey = `restaurant_menu:${restaurantId}`;
      const cachedResult = await cache.get(cacheKey);
      
      if (cachedResult) {
        logger.debug('Restaurant menu found in cache');
        return cachedResult;
      }

      // Get restaurant info
      const restaurantSql = `
        SELECT name FROM restaurants WHERE _id = $1
      `;
      const restaurantResult = await query(restaurantSql, [restaurantId]);
      
      if (restaurantResult.rows.length === 0) {
        return null;
      }

      // Get food items for the restaurant
      const menuSql = `
        SELECT 
          _id,
          name,
          picture,
          description,
          type,
          tags,
          preparation_time,
          available,
          price,
          restaurant_id,
          restaurant_name,
          restaurant_location
        FROM food_items 
        WHERE restaurant_id = $1 AND available = true
        ORDER BY type, name
      `;

      const menuResult = await query(menuSql, [restaurantId]);
      
      const menu = {
        restaurantId,
        restaurantName: restaurantResult.rows[0].name,
        items: menuResult.rows.map(item => ({
          _id: item._id,
          name: item.name,
          picture: item.picture,
          description: item.description,
          type: item.type,
          tags: item.tags,
          preparationTime: item.preparation_time,
          available: item.available,
          price: item.price,
          restaurantId: item.restaurant_id,
          restaurantName: item.restaurant_name,
          restaurantLocation: item.restaurant_location
        })),
        lastUpdated: new Date().toISOString()
      };

      // Cache the result for 2 minutes (menu changes frequently)
      await cache.set(cacheKey, menu, 120);

      logger.info('Restaurant menu retrieved', { 
        restaurantId, 
        itemCount: menu.items.length 
      });

      return menu;
    } catch (error) {
      logger.error('Error getting restaurant menu:', error);
      throw error;
    }
  }
}

module.exports = RestaurantController;
