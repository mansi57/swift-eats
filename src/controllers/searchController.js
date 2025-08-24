const { query } = require('../utils/database');
const { cache } = require('../utils/redis');
const logger = require('../utils/logger');

class SearchController {
  /**
   * Search restaurants and food items based on various criteria
   */
  static async search(customerLocation, radius, foodItem, cuisine, dietary, maxPrice) {
    const startTime = Date.now();
    
    try {
      // Try to get from cache first
      const cacheKey = `search:${customerLocation.latitude}:${customerLocation.longitude}:${radius}:${foodItem || 'all'}:${cuisine || 'all'}:${dietary || 'all'}:${maxPrice || 'all'}`;
      const cachedResult = await cache.get(cacheKey);
      
      if (cachedResult) {
        logger.debug('Search results found in cache');
        return cachedResult;
      }

      const results = {
        restaurants: [],
        foodItems: [],
        totalResults: 0,
        searchTime: 0
      };

      // Search restaurants
      if (!foodItem || cuisine) {
        const restaurants = await this.searchRestaurants(
          customerLocation, 
          radius, 
          cuisine, 
          dietary, 
          maxPrice
        );
        results.restaurants = restaurants;
      }

      // Search food items
      if (foodItem) {
        const foodItems = await this.searchFoodItems(
          customerLocation, 
          radius, 
          foodItem, 
          cuisine, 
          dietary, 
          maxPrice
        );
        results.foodItems = foodItems;
      }

      results.totalResults = results.restaurants.length + results.foodItems.length;
      results.searchTime = Date.now() - startTime;

      // Cache the result for 3 minutes
      await cache.set(cacheKey, results, 180);

      logger.info('Search completed', {
        foodItem,
        cuisine,
        dietary,
        maxPrice,
        restaurantsFound: results.restaurants.length,
        foodItemsFound: results.foodItems.length,
        totalResults: results.totalResults,
        searchTime: results.searchTime
      });

      return results;
    } catch (error) {
      logger.error('Error performing search:', error);
      throw error;
    }
  }

  /**
   * Search restaurants based on criteria
   */
  static async searchRestaurants(customerLocation, radius, cuisine, dietary, maxPrice) {
    try {
      let sql = `
        SELECT DISTINCT
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
        AND r.is_open = true
      `;

      const params = [customerLocation.longitude, customerLocation.latitude, radius];
      let paramIndex = 4;

      // Add cuisine filter
      if (cuisine) {
        sql += ` AND r.tags->>'cuisine' = $${paramIndex}`;
        params.push(cuisine);
        paramIndex++;
      }

      // Add dietary filter
      if (dietary) {
        sql += ` AND r.tags->'dietary' ? $${paramIndex}`;
        params.push(dietary);
        paramIndex++;
      }

      // Add price filter (if maxPrice is specified, check if restaurant has items within range)
      if (maxPrice) {
        sql += ` AND EXISTS (
          SELECT 1 FROM food_items fi 
          WHERE fi.restaurant_id = r._id 
          AND fi.price <= $${paramIndex}
        )`;
        params.push(maxPrice);
        paramIndex++;
      }

      sql += ` ORDER BY distance ASC LIMIT 50`;

      const result = await query(sql, params);
      
      return result.rows.map(row => ({
        _id: row._id,
        name: row.name,
        location: row.location,
        tags: row.tags,
        pictures: row.pictures,
        rating: row.rating,
        operatingHours: row.operating_hours,
        isOpen: row.is_open,
        distance: Math.round(row.distance)
      }));
    } catch (error) {
      logger.error('Error searching restaurants:', error);
      throw error;
    }
  }

  /**
   * Search food items based on criteria
   */
  static async searchFoodItems(customerLocation, radius, foodItem, cuisine, dietary, maxPrice) {
    try {
      let sql = `
        SELECT DISTINCT
          fi._id,
          fi.name,
          fi.picture,
          fi.description,
          fi.type,
          fi.tags,
          fi.preparation_time,
          fi.available,
          fi.price,
          fi.restaurant_id,
          fi.restaurant_name,
          fi.restaurant_location,
          ST_Distance(
            fi.restaurant_location::geography, 
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          ) as distance
        FROM food_items fi
        WHERE ST_DWithin(
          fi.restaurant_location::geography, 
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
          $3 * 1000
        )
        AND fi.available = true
      `;

      const params = [customerLocation.longitude, customerLocation.latitude, radius];
      let paramIndex = 4;

      // Add food item name filter
      if (foodItem) {
        sql += ` AND (
          fi.name ILIKE $${paramIndex} 
          OR fi.description ILIKE $${paramIndex}
          OR fi.type ILIKE $${paramIndex}
        )`;
        params.push(`%${foodItem}%`);
        paramIndex++;
      }

      // Add cuisine filter
      if (cuisine) {
        sql += ` AND fi.tags->>'cuisine' = $${paramIndex}`;
        params.push(cuisine);
        paramIndex++;
      }

      // Add dietary filter
      if (dietary) {
        sql += ` AND fi.tags->>'dietary' = $${paramIndex}`;
        params.push(dietary);
        paramIndex++;
      }

      // Add price filter
      if (maxPrice) {
        sql += ` AND fi.price <= $${paramIndex}`;
        params.push(maxPrice);
        paramIndex++;
      }

      sql += ` ORDER BY distance ASC, fi.name ASC LIMIT 100`;

      const result = await query(sql, params);
      
      return result.rows.map(row => ({
        _id: row._id,
        name: row.name,
        picture: row.picture,
        description: row.description,
        type: row.type,
        tags: row.tags,
        preparationTime: row.preparation_time,
        available: row.available,
        price: row.price,
        restaurantId: row.restaurant_id,
        restaurantName: row.restaurant_name,
        restaurantLocation: row.restaurant_location,
        distance: Math.round(row.distance)
      }));
    } catch (error) {
      logger.error('Error searching food items:', error);
      throw error;
    }
  }

  /**
   * Get search suggestions based on partial input
   */
  static async getSearchSuggestions(query, limit = 10) {
    try {
      const sql = `
        SELECT DISTINCT
          name,
          type,
          'food_item' as category
        FROM food_items 
        WHERE name ILIKE $1 AND available = true
        UNION
        SELECT DISTINCT
          name,
          tags->>'cuisine' as type,
          'restaurant' as category
        FROM restaurants 
        WHERE name ILIKE $1 AND is_open = true
        ORDER BY category, name
        LIMIT $2
      `;

      const result = await query(sql, [`%${query}%`, limit]);
      
      return result.rows.map(row => ({
        name: row.name,
        type: row.type,
        category: row.category
      }));
    } catch (error) {
      logger.error('Error getting search suggestions:', error);
      throw error;
    }
  }
}

module.exports = SearchController;
