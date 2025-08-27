const RestaurantController = require('../controllers/restaurantController');
const SearchController = require('../controllers/searchController');
const logger = require('../utils/logger');

class RestaurantService {
    constructor() {
        this.isHealthy = true;
        this.stats = {
            requestsProcessed: 0,
            requestsFailed: 0,
            lastRequestTime: null,
            startTime: Date.now()
        };
    }

    /**
     * Get restaurants by location
     */
    async getRestaurantsByLocation(customerLocation, radius, cuisine, limit, offset) {
        const startTime = Date.now();
        
        try {
            logger.info('Restaurant Service: Processing restaurant search request', {
                location: customerLocation,
                radius,
                cuisine,
                limit,
                offset
            });

            const result = await RestaurantController.getRestaurantsByLocation(
                customerLocation,
                radius,
                cuisine,
                limit,
                offset
            );

            this.stats.requestsProcessed++;
            this.stats.lastRequestTime = Date.now();

            const processingTime = Date.now() - startTime;
            
            logger.info('Restaurant Service: Restaurant search completed', {
                found: result.restaurants.length,
                totalCount: result.totalCount,
                processingTime
            });

            return {
                success: true,
                data: result,
                processingTime
            };

        } catch (error) {
            this.stats.requestsFailed++;
            logger.error('Restaurant Service: Error in restaurant search:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get restaurant by ID
     */
    async getRestaurantById(id) {
        const startTime = Date.now();
        
        try {
            logger.info('Restaurant Service: Processing restaurant fetch request', { restaurantId: id });

            const restaurant = await RestaurantController.getRestaurantById(id);

            this.stats.requestsProcessed++;
            this.stats.lastRequestTime = Date.now();

            const processingTime = Date.now() - startTime;
            
            logger.info('Restaurant Service: Restaurant fetch completed', {
                restaurantId: id,
                found: !!restaurant,
                processingTime
            });

            return {
                success: true,
                data: restaurant,
                processingTime
            };

        } catch (error) {
            this.stats.requestsFailed++;
            logger.error('Restaurant Service: Error fetching restaurant:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get restaurant menu
     */
    async getRestaurantMenu(restaurantId) {
        const startTime = Date.now();
        
        try {
            logger.info('Restaurant Service: Processing menu fetch request', { restaurantId });

            const menu = await RestaurantController.getRestaurantMenu(restaurantId);

            this.stats.requestsProcessed++;
            this.stats.lastRequestTime = Date.now();

            const processingTime = Date.now() - startTime;
            
            logger.info('Restaurant Service: Menu fetch completed', {
                restaurantId,
                itemCount: menu ? menu.items.length : 0,
                processingTime
            });

            return {
                success: true,
                data: menu,
                processingTime
            };

        } catch (error) {
            this.stats.requestsFailed++;
            logger.error('Restaurant Service: Error fetching menu:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Search restaurants and food items
     */
    async search(customerLocation, radius, foodItem, cuisine, dietary, maxPrice) {
        const startTime = Date.now();
        
        try {
            logger.info('Restaurant Service: Processing search request', {
                foodItem,
                location: customerLocation,
                radius,
                cuisine,
                dietary,
                maxPrice
            });

            const result = await SearchController.search(
                customerLocation,
                radius,
                foodItem,
                cuisine,
                dietary,
                maxPrice
            );

            this.stats.requestsProcessed++;
            this.stats.lastRequestTime = Date.now();

            const processingTime = Date.now() - startTime;
            
            logger.info('Restaurant Service: Search completed', {
                restaurantsFound: result.restaurants.length,
                foodItemsFound: result.foodItems.length,
                totalResults: result.totalResults,
                processingTime
            });

            return {
                success: true,
                data: result,
                processingTime
            };

        } catch (error) {
            this.stats.requestsFailed++;
            logger.error('Restaurant Service: Error in search:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get search suggestions
     */
    async getSearchSuggestions(query, limit = 10) {
        const startTime = Date.now();
        
        try {
            logger.info('Restaurant Service: Processing search suggestions request', { query, limit });

            const suggestions = await SearchController.getSearchSuggestions(query, limit);

            this.stats.requestsProcessed++;
            this.stats.lastRequestTime = Date.now();

            const processingTime = Date.now() - startTime;
            
            logger.info('Restaurant Service: Search suggestions completed', {
                query,
                suggestionsFound: suggestions.length,
                processingTime
            });

            return {
                success: true,
                data: suggestions,
                processingTime
            };

        } catch (error) {
            this.stats.requestsFailed++;
            logger.error('Restaurant Service: Error getting search suggestions:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Health check endpoint
     */
    getHealth() {
        const uptime = Date.now() - this.stats.startTime;
        const requestsPerSecond = this.stats.requestsProcessed / (uptime / 1000);
        
        return {
            status: this.isHealthy ? 'healthy' : 'unhealthy',
            uptime: uptime,
            requestsProcessed: this.stats.requestsProcessed,
            requestsFailed: this.stats.requestsFailed,
            requestsPerSecond: requestsPerSecond.toFixed(2),
            lastRequestTime: this.stats.lastRequestTime,
            service: 'restaurant-service'
        };
    }

    /**
     * Get service statistics
     */
    getStats() {
        return {
            ...this.stats,
            service: 'restaurant-service',
            uptime: Date.now() - this.stats.startTime
        };
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        logger.info('Restaurant Service: Shutting down...');
        this.isHealthy = false;
    }
}

module.exports = RestaurantService;
