const express = require('express');
const { validate, schemas } = require('../middleware/validation');
const { optionalAuthMiddleware } = require('../middleware/auth');
const RestaurantController = require('../controllers/restaurantController');
const logger = require('../utils/logger');

const router = express.Router();

// GET /restaurants - Get restaurants by location
router.get('/', 
  optionalAuthMiddleware,
  validate(schemas.pagination, 'query'),
  async (req, res, next) => {
    try {
      const { location, radius, cuisine, limit, offset } = req.query;
      
      // Validate location parameter
      if (!location) {
        return res.status(400).json({
          error: {
            code: 'MISSING_LOCATION',
            message: 'Location parameter is required'
          }
        });
      }

      // Parse location from query string (format: "latitude,longitude")
      const [lat, lng] = location.split(',').map(Number);
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_LOCATION_FORMAT',
            message: 'Location must be in format: latitude,longitude'
          }
        });
      }

      const customerLocation = { latitude: lat, longitude: lng };
      const searchRadius = radius ? parseFloat(radius) : 10;
      const searchLimit = limit ? parseInt(limit) : 20;
      const searchOffset = offset ? parseInt(offset) : 0;

      logger.info('Searching restaurants:', {
        location: customerLocation,
        radius: searchRadius,
        cuisine,
        limit: searchLimit,
        offset: searchOffset
      });

      const result = await RestaurantController.getRestaurantsByLocation(
        customerLocation,
        searchRadius,
        cuisine,
        searchLimit,
        searchOffset
      );

      res.json({
        restaurants: result.restaurants,
        totalCount: result.totalCount,
        searchTime: result.searchTime
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /restaurants/{id} - Get restaurant by ID
router.get('/:id',
  optionalAuthMiddleware,
  validate(schemas.uuid, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      
      logger.info('Fetching restaurant by ID:', { restaurantId: id });
      
      const restaurant = await RestaurantController.getRestaurantById(id);
      
      if (!restaurant) {
        return res.status(404).json({
          error: {
            code: 'RESTAURANT_NOT_FOUND',
            message: 'Restaurant not found'
          }
        });
      }

      res.json(restaurant);
    } catch (error) {
      next(error);
    }
  }
);

// GET /restaurants/{id}/menu - Get restaurant menu
router.get('/:id/menu',
  optionalAuthMiddleware,
  validate(schemas.uuid, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      
      logger.info('Fetching restaurant menu:', { restaurantId: id });
      
      const menu = await RestaurantController.getRestaurantMenu(id);
      
      if (!menu) {
        return res.status(404).json({
          error: {
            code: 'RESTAURANT_NOT_FOUND',
            message: 'Restaurant not found'
          }
        });
      }

      res.json({
        restaurantId: id,
        restaurantName: menu.restaurantName,
        menu: menu.items,
        lastUpdated: menu.lastUpdated
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
