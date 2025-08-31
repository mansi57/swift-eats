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

      // Add cuisine filter
      if (cuisine) {
        sql += ` AND r.cuisine_type = $${paramIndex}`;
        params.push(cuisine);
        paramIndex++;
      }

      // Add dietary filter
      if (dietary) {
        sql += ` AND (r.cuisine_type ILIKE '%' || $${paramIndex} || '%')`;
        params.push(dietary);
        paramIndex++;
      }

      // Add price filter (if maxPrice is specified, check if restaurant has items within range)
      if (maxPrice) {
        sql += ` AND EXISTS (
          SELECT 1 FROM food_items fi 
          WHERE fi.restaurant_id = r.id 
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
          fi.id,
          fi.name,
          fi.description,
          fi.price,
          fi.category,
          fi.is_vegetarian,
          fi.is_vegan,
          fi.is_gluten_free,
          fi.is_available,
          fi.image_url,
          fi.restaurant_id,
          r.name as restaurant_name,
          r.address as restaurant_address,
          ST_Distance(
            ST_SetSRID(ST_MakePoint(r.longitude, r.latitude), 4326)::geography, 
            ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
          ) as distance
        FROM food_items fi
        JOIN restaurants r ON fi.restaurant_id = r.id
        WHERE ST_DWithin(
          ST_SetSRID(ST_MakePoint(r.longitude, r.latitude), 4326)::geography, 
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, 
          $3 * 1000
        )
        AND fi.is_available = true
        AND r.is_active = true
      `;

      const params = [customerLocation.longitude, customerLocation.latitude, radius];
      let paramIndex = 4;

      // Add food item name filter
      if (foodItem) {
        sql += ` AND (
          fi.name ILIKE $${paramIndex} 
          OR fi.description ILIKE $${paramIndex}
          OR fi.category ILIKE $${paramIndex}
        )`;
        params.push(`%${foodItem}%`);
        paramIndex++;
      }

      // Add cuisine filter
      if (cuisine) {
        sql += ` AND r.cuisine_type = $${paramIndex}`;
        params.push(cuisine);
        paramIndex++;
      }

      // Add dietary filter
      if (dietary) {
        if (dietary === 'vegetarian') {
          sql += ` AND fi.is_vegetarian = true`;
        } else if (dietary === 'vegan') {
          sql += ` AND fi.is_vegan = true`;
        } else if (dietary === 'gluten_free') {
          sql += ` AND fi.is_gluten_free = true`;
        }
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
        id: row.id,
        name: row.name,
        description: row.description,
        price: row.price,
        category: row.category,
        is_vegetarian: row.is_vegetarian,
        is_vegan: row.is_vegan,
        is_gluten_free: row.is_gluten_free,
        is_available: row.is_available,
        image_url: row.image_url,
        restaurant_id: row.restaurant_id,
        restaurant_name: row.restaurant_name,
        restaurant_address: row.restaurant_address,
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
          category as type,
          'food_item' as category
        FROM food_items 
        WHERE name ILIKE $1 AND is_available = true
        UNION
        SELECT DISTINCT
          name,
          cuisine_type as type,
          'restaurant' as category
        FROM restaurants 
        WHERE name ILIKE $1 AND is_active = true
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
