const Joi = require('joi');
const logger = require('../utils/logger');

// Validation middleware factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false
    });

    if (error) {
      const validationErrors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      logger.warn('Validation failed:', {
        errors: validationErrors,
        endpoint: req.originalUrl,
        method: req.method
      });

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: validationErrors
        }
      });
    }

    // Replace request data with validated data
    req[property] = value;
    next();
  };
};

// Common validation schemas
const schemas = {
  // Location validation
  location: Joi.object({
    latitude: Joi.number().min(-90).max(90).required()
      .messages({
        'number.base': 'Latitude must be a number',
        'number.min': 'Latitude must be between -90 and 90',
        'number.max': 'Latitude must be between -90 and 90',
        'any.required': 'Latitude is required'
      }),
    longitude: Joi.number().min(-180).max(180).required()
      .messages({
        'number.base': 'Longitude must be a number',
        'number.min': 'Longitude must be between -180 and 180',
        'number.max': 'Longitude must be between -180 and 180',
        'any.required': 'Longitude is required'
      })
  }),

  // UUID validation
  uuid: Joi.string().guid({ version: 'uuidv4' }).required()
    .messages({
      'string.guid': 'Invalid UUID format',
      'any.required': 'ID is required'
    }),

  // Pagination validation
  pagination: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20)
      .messages({
        'number.base': 'Limit must be a number',
        'number.integer': 'Limit must be an integer',
        'number.min': 'Limit must be at least 1',
        'number.max': 'Limit cannot exceed 100'
      }),
    offset: Joi.number().integer().min(0).default(0)
      .messages({
        'number.base': 'Offset must be a number',
        'number.integer': 'Offset must be an integer',
        'number.min': 'Offset cannot be negative'
      })
  }),

  // Search request validation
  searchRequest: Joi.object({
    customerLocation: schemas.location.required(),
    foodItem: Joi.string().min(1).max(100).optional()
      .messages({
        'string.min': 'Food item name must be at least 1 character',
        'string.max': 'Food item name cannot exceed 100 characters'
      }),
    radius: Joi.number().min(0).max(100).default(10)
      .messages({
        'number.base': 'Radius must be a number',
        'number.min': 'Radius cannot be negative',
        'number.max': 'Radius cannot exceed 100km'
      }),
    cuisine: Joi.string().min(1).max(50).optional()
      .messages({
        'string.min': 'Cuisine must be at least 1 character',
        'string.max': 'Cuisine cannot exceed 50 characters'
      }),
    dietary: Joi.string().valid('veg', 'non-veg', 'vegan').optional()
      .messages({
        'any.only': 'Dietary preference must be one of: veg, non-veg, vegan'
      }),
    maxPrice: Joi.number().min(0).optional()
      .messages({
        'number.base': 'Max price must be a number',
        'number.min': 'Max price cannot be negative'
      })
  }),

  // Order item validation
  orderItem: Joi.object({
    id: schemas.uuid.required(),
    name: Joi.string().min(1).max(100).required()
      .messages({
        'string.min': 'Item name must be at least 1 character',
        'string.max': 'Item name cannot exceed 100 characters',
        'any.required': 'Item name is required'
      }),
    quantity: Joi.number().integer().min(1).max(50).required()
      .messages({
        'number.base': 'Quantity must be a number',
        'number.integer': 'Quantity must be an integer',
        'number.min': 'Quantity must be at least 1',
        'number.max': 'Quantity cannot exceed 50'
      }),
    price: Joi.number().min(0).required()
      .messages({
        'number.base': 'Price must be a number',
        'number.min': 'Price cannot be negative',
        'any.required': 'Price is required'
      }),
    specialInstructions: Joi.string().max(500).optional()
      .messages({
        'string.max': 'Special instructions cannot exceed 500 characters'
      })
  }),

  // Order creation validation
  orderCreation: Joi.object({
    destination: schemas.location.required(),
    restaurant: schemas.uuid.required(),
    items: Joi.array().items(schemas.orderItem).min(1).required()
      .messages({
        'array.min': 'Order must contain at least one item',
        'any.required': 'Order items are required'
      }),
    specialInstructions: Joi.string().max(1000).optional()
      .messages({
        'string.max': 'Special instructions cannot exceed 1000 characters'
      })
  }),

  // Order status update validation
  orderStatusUpdate: Joi.object({
    status: Joi.string().valid(
      'new_order', 'order_received', 'food_preparing', 
      'ready_pickup', 'assigned_driver', 'picked_up', 
      'out_delivery', 'delivered'
    ).required()
      .messages({
        'any.only': 'Invalid order status',
        'any.required': 'Status is required'
      }),
    driverId: Joi.when('status', {
      is: 'assigned_driver',
      then: schemas.uuid.required(),
      otherwise: schemas.uuid.optional()
    }).messages({
      'any.required': 'Driver ID is required when assigning driver'
    }),
    estimatedDeliveryTime: Joi.date().iso().optional()
      .messages({
        'date.format': 'Estimated delivery time must be a valid ISO date'
      })
  })
};

module.exports = {
  validate,
  schemas
};
