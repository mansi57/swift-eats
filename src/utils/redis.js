const redis = require('redis');
const logger = require('./logger');

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      logger.error('Redis server refused connection');
      return new Error('Redis server refused connection');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      logger.error('Redis retry time exhausted');
      return new Error('Redis retry time exhausted');
    }
    if (options.attempt > 10) {
      logger.error('Redis max retry attempts reached');
      return undefined;
    }
    return Math.min(options.attempt * 100, 3000);
  }
};

// Create Redis client
const client = redis.createClient(redisConfig);

// Handle Redis events
client.on('connect', () => {
  logger.info('✅ Redis client connected');
});

client.on('ready', () => {
  logger.info('✅ Redis client ready');
});

client.on('error', (err) => {
  logger.error('❌ Redis client error:', err.message);
});

client.on('end', () => {
  logger.info('Redis client disconnected');
});

client.on('reconnecting', () => {
  logger.info('Redis client reconnecting...');
});

// Promisify Redis commands
const getAsync = (key) => {
  return new Promise((resolve, reject) => {
    client.get(key, (err, reply) => {
      if (err) reject(err);
      else resolve(reply);
    });
  });
};

const setAsync = (key, value, ttl = null) => {
  return new Promise((resolve, reject) => {
    if (ttl) {
      client.setex(key, ttl, value, (err, reply) => {
        if (err) reject(err);
        else resolve(reply);
      });
    } else {
      client.set(key, value, (err, reply) => {
        if (err) reject(err);
        else resolve(reply);
      });
    }
  });
};

const delAsync = (key) => {
  return new Promise((resolve, reject) => {
    client.del(key, (err, reply) => {
      if (err) reject(err);
      else resolve(reply);
    });
  });
};

const existsAsync = (key) => {
  return new Promise((resolve, reject) => {
    client.exists(key, (err, reply) => {
      if (err) reject(err);
      else resolve(reply);
    });
  });
};

const expireAsync = (key, ttl) => {
  return new Promise((resolve, reject) => {
    client.expire(key, ttl, (err, reply) => {
      if (err) reject(err);
      else resolve(reply);
    });
  });
};

// Cache utility functions
const cache = {
  async get(key) {
    try {
      const value = await getAsync(key);
      if (value) {
        logger.debug(`Cache hit for key: ${key}`);
        return JSON.parse(value);
      }
      logger.debug(`Cache miss for key: ${key}`);
      return null;
    } catch (error) {
      logger.error(`Cache get error for key ${key}:`, error.message);
      return null;
    }
  },

  async set(key, value, ttl = 3600) {
    try {
      const serializedValue = JSON.stringify(value);
      await setAsync(key, serializedValue, ttl);
      logger.debug(`Cache set for key: ${key}, TTL: ${ttl}s`);
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error.message);
      return false;
    }
  },

  async delete(key) {
    try {
      await delAsync(key);
      logger.debug(`Cache deleted for key: ${key}`);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error.message);
      return false;
    }
  },

  async exists(key) {
    try {
      return await existsAsync(key);
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error.message);
      return false;
    }
  },

  async expire(key, ttl) {
    try {
      return await expireAsync(key, ttl);
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error.message);
      return false;
    }
  }
};

// Close Redis connection
const closeConnection = () => {
  client.quit();
  logger.info('Redis connection closed');
};

module.exports = {
  client,
  cache,
  closeConnection
};
