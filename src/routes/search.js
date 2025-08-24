const express = require('express');
const { validate, schemas } = require('../middleware/validation');
const { optionalAuthMiddleware } = require('../middleware/auth');
const SearchController = require('../controllers/searchController');
const logger = require('../utils/logger');

const router = express.Router();

// POST /search - Search restaurants and food items
router.post('/',
  optionalAuthMiddleware,
  validate(schemas.searchRequest, 'body'),
  async (req, res, next) => {
    try {
      const {
        foodItem,
        customerLocation,
        radius,
        cuisine,
        dietary,
        maxPrice
      } = req.body;

      logger.info('Performing search:', {
        foodItem,
        customerLocation,
        radius,
        cuisine,
        dietary,
        maxPrice
      });

      const searchResult = await SearchController.search(
        customerLocation,
        radius,
        foodItem,
        cuisine,
        dietary,
        maxPrice
      );

      res.json({
        restaurants: searchResult.restaurants,
        foodItems: searchResult.foodItems,
        totalResults: searchResult.totalResults,
        searchTime: searchResult.searchTime
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
