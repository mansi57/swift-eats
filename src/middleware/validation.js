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

// Define base schemas first
const locationSchema = Joi.object({
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
});

const uuidSchema = Joi.string().guid({ version: 'uuidv4' }).required()
  .messages({
    'string.guid': 'Invalid UUID format',
    'any.required': 'ID is required'
  });

const idSchema = Joi.alternatives().try(
  Joi.number().integer().positive(),
  Joi.string().pattern(/^\d+$/).custom((value) => parseInt(value))
).required()
  .messages({
    'alternatives.match': 'ID must be a positive integer',
    'any.required': 'ID is required'
  });

// Common validation schemas
const schemas = {
  // Location validation
  location: locationSchema,

  // UUID validation
  uuid: uuidSchema,

  // UUID param object validation
  uuidParam: Joi.object({
    id: uuidSchema
  }),

  // Integer ID param object validation
  idParam: Joi.object({
    id: idSchema
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

  // Restaurants query validation
  restaurantsQuery: Joi.object({
    // Either a combined string "lat,lng" or both numeric fields
    location: Joi.string()
      .pattern(/^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/)
      .messages({
        'string.pattern.base': 'Location must be in format: latitude,longitude'
      }),
    customer_lat: Joi.number().min(-90).max(90)
      .messages({
        'number.base': 'customer_lat must be a number',
        'number.min': 'customer_lat must be between -90 and 90',
        'number.max': 'customer_lat must be between -90 and 90'
      }),
    customer_lng: Joi.number().min(-180).max(180)
      .messages({
        'number.base': 'customer_lng must be a number',
        'number.min': 'customer_lng must be between -180 and 180',
        'number.max': 'customer_lng must be between -180 and 180'
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
  })
    .or('location', 'customer_lat')
    .and('customer_lat', 'customer_lng')
    .and('customer_lng', 'customer_lat')
    .messages({
      'object.missing': 'Location parameter is required. Use either "location=lat,lng" or "customer_lat=X&customer_lng=Y"'
    }),

  // Search request validation
  searchRequest: Joi.object({
    customerLocation: locationSchema.required(),
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
    id: idSchema.required(),
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
    destination: locationSchema.required(),
    restaurant: idSchema.required(),
    items: Joi.array().items(Joi.object({
      id: idSchema.required(),
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
    })).min(1).required()
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
      then: uuidSchema.required(),
      otherwise: uuidSchema.optional()
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
