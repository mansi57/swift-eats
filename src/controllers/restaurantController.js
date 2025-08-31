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
          r.id,
          r.name,
          r.description,
          r.cuisine_type,
          r.address,
          r.latitude,
          r.longitude,
          r.phone,
          r.rating,
          r.is_active,
          ST_Distance(
            ST_SetSRID(ST_MakePoint(r.longitude, r.latitude), 4326)::geography, 
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          ) as distance
        FROM restaurants r
        WHERE ST_DWithin(
          ST_SetSRID(ST_MakePoint(r.longitude, r.latitude), 4326)::geography, 
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
          $3 * 1000
        )
        AND r.is_active = true
      `;

      const params = [customerLocation.longitude, customerLocation.latitude, radius];
      let paramIndex = 4;

      // Add cuisine filter if specified
      if (cuisine) {
        sql += ` AND r.cuisine_type = $${paramIndex}`;
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
          ST_SetSRID(ST_MakePoint(r.longitude, r.latitude), 4326)::geography, 
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
          $3 * 1000
        )
        AND r.is_active = true
      `;
      
      const countParams = [customerLocation.longitude, customerLocation.latitude, radius];
      if (cuisine) {
        countSql += ` AND r.cuisine_type = $4`;
        countParams.push(cuisine);
      }
      
      const countResult = await query(countSql, countParams);
      const totalCount = parseInt(countResult.rows[0].total);

      // Transform results
      const restaurants = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        cuisine_type: row.cuisine_type,
        address: row.address,
        latitude: row.latitude,
        longitude: row.longitude,
        phone: row.phone,
        rating: row.rating,
        is_active: row.is_active,
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
          id,
          name,
          description,
          cuisine_type,
          address,
          latitude,
          longitude,
          phone,
          email,
          rating,
          is_active,
          created_at,
          updated_at
        FROM restaurants 
        WHERE id = $1
      `;

      const result = await query(sql, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const restaurant = result.rows[0];
      const transformedRestaurant = {
        id: restaurant.id,
        name: restaurant.name,
        description: restaurant.description,
        cuisine_type: restaurant.cuisine_type,
        address: restaurant.address,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        phone: restaurant.phone,
        email: restaurant.email,
        rating: restaurant.rating,
        is_active: restaurant.is_active,
        created_at: restaurant.created_at,
        updated_at: restaurant.updated_at
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
        SELECT name FROM restaurants WHERE id = $1
      `;
      const restaurantResult = await query(restaurantSql, [restaurantId]);
      
      if (restaurantResult.rows.length === 0) {
        return null;
      }

      // Get food items for the restaurant
      const menuSql = `
        SELECT 
          id,
          name,
          description,
          price,
          category,
          is_vegetarian,
          is_vegan,
          is_gluten_free,
          is_available,
          image_url,
          restaurant_id
        FROM food_items 
        WHERE restaurant_id = $1 AND is_available = true
        ORDER BY category, name
      `;

      const menuResult = await query(menuSql, [restaurantId]);
      
      const menu = {
        restaurantId,
        restaurantName: restaurantResult.rows[0].name,
        items: menuResult.rows.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          is_vegetarian: item.is_vegetarian,
          is_vegan: item.is_vegan,
          is_gluten_free: item.is_gluten_free,
          is_available: item.is_available,
          image_url: item.image_url,
          restaurant_id: item.restaurant_id
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
