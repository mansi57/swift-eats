const express = require('express');
const { validate, schemas } = require('../middleware/validation');
const { optionalAuthMiddleware } = require('../middleware/auth');
const FoodItemController = require('../controllers/foodItemController');
const logger = require('../utils/logger');

const router = express.Router();

// GET /food-items/{id} - Get food item by ID
router.get('/:id',
  optionalAuthMiddleware,
  validate(schemas.uuid, 'params'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      
      logger.info('Fetching food item by ID:', { foodItemId: id });
      
      const foodItem = await FoodItemController.getFoodItemById(id);
      
      if (!foodItem) {
        return res.status(404).json({
          error: {
            code: 'FOOD_ITEM_NOT_FOUND',
            message: 'Food item not found'
          }
        });
      }

      res.json(foodItem);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
