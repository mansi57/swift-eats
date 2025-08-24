const { query } = require('../utils/database');
const { cache } = require('../utils/redis');
const logger = require('../utils/logger');

class FoodItemController {
  /**
   * Get food item by ID
   */
  static async getFoodItemById(id) {
    try {
      // Try to get from cache first
      const cacheKey = `food_item:${id}`;
      const cachedResult = await cache.get(cacheKey);
      
      if (cachedResult) {
        logger.debug('Food item found in cache');
        return cachedResult;
      }

      const sql = `
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
        WHERE _id = $1
      `;

      const result = await query(sql, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const foodItem = result.rows[0];
      const transformedFoodItem = {
        _id: foodItem._id,
        name: foodItem.name,
        picture: foodItem.picture,
        description: foodItem.description,
        type: foodItem.type,
        tags: foodItem.tags,
        preparationTime: foodItem.preparation_time,
        available: foodItem.available,
        price: foodItem.price,
        restaurantId: foodItem.restaurant_id,
        restaurantName: foodItem.restaurant_name,
        restaurantLocation: foodItem.restaurant_location
      };

      // Cache the result for 15 minutes
      await cache.set(cacheKey, transformedFoodItem, 900);

      logger.info('Food item retrieved by ID', { foodItemId: id });
      return transformedFoodItem;
    } catch (error) {
      logger.error('Error getting food item by ID:', error);
      throw error;
    }
  }

  /**
   * Get food items by type
   */
  static async getFoodItemsByType(type, limit = 20, offset = 0) {
    try {
      const cacheKey = `food_items_by_type:${type}:${limit}:${offset}`;
      const cachedResult = await cache.get(cacheKey);
      
      if (cachedResult) {
        logger.debug('Food items by type found in cache');
        return cachedResult;
      }

      const sql = `
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
        WHERE type = $1 AND available = true
        ORDER BY name
        LIMIT $2 OFFSET $3
      `;

      const result = await query(sql, [type, limit, offset]);
      
      const foodItems = result.rows.map(item => ({
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
      }));

      // Cache the result for 10 minutes
      await cache.set(cacheKey, foodItems, 600);

      logger.info('Food items retrieved by type', { 
        type, 
        count: foodItems.length 
      });

      return foodItems;
    } catch (error) {
      logger.error('Error getting food items by type:', error);
      throw error;
    }
  }

  /**
   * Check food item availability
   */
  static async checkAvailability(foodItemId) {
    try {
      const sql = `
        SELECT 
          available,
          inventory_count
        FROM food_items 
        WHERE _id = $1
      `;

      const result = await query(sql, [foodItemId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const foodItem = result.rows[0];
      return {
        available: foodItem.available,
        inventoryCount: foodItem.inventory_count
      };
    } catch (error) {
      logger.error('Error checking food item availability:', error);
      throw error;
    }
  }
}

module.exports = FoodItemController;
