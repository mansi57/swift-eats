const { RateLimiterMemory } = require('rate-limiter-flexible');
const logger = require('../utils/logger');

// Create rate limiter instance
const rateLimiter = new RateLimiterMemory({
  keyGenerator: (req) => {
    // Use IP address as key, or user ID if authenticated
    return req.user ? req.user.id : req.ip;
  },
  points: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // Number of requests
  duration: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // Per 15 minutes (900000ms)
  blockDuration: 60 * 15, // Block for 15 minutes if limit exceeded
});

// Rate limiting middleware
const rateLimiterMiddleware = async (req, res, next) => {
  try {
    await rateLimiter.consume(req.user ? req.user.id : req.ip);
    next();
  } catch (rejRes) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    
    logger.warn('Rate limit exceeded:', {
      ip: req.ip,
      userId: req.user?.id,
      remainingPoints: rejRes.remainingPoints,
      msBeforeNext: rejRes.msBeforeNext
    });

    res.set('Retry-After', String(Math.round(secs / 1000)));
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        details: {
          retryAfter: secs,
          limit: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
          window: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000
        }
      }
    });
  }
};

module.exports = rateLimiterMiddleware;
