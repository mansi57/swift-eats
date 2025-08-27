const redis = require('redis');
const logger = require('./logger');

// Redis configuration (v4 client)
const host = process.env.REDIS_HOST || 'localhost';
const port = Number(process.env.REDIS_PORT || 6379);
const password = process.env.REDIS_PASSWORD || undefined;
const database = Number(process.env.REDIS_DB || 0);

// Create Redis v4 client
const client = redis.createClient({
  socket: { host, port },
  password,
  database
});

// Handle Redis events
client.on('error', (err) => {
  logger.error('❌ Redis client error:', err.message);
});

client.on('connect', () => {
  logger.info('✅ Redis client connected');
});

client.on('ready', () => {
  logger.info('✅ Redis client ready');
});

client.on('end', () => {
  logger.info('Redis client disconnected');
});

// Connect immediately on startup (non-blocking)
(async () => {
  try {
    if (!client.isOpen) {
      await client.connect();
    }
  } catch (err) {
    logger.error('❌ Redis connect error:', err.message);
  }
})();

// Cache utility functions using v4 API
const cache = {
  async get(key) {
    try {
      const value = await client.get(key);
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
      if (ttl && Number(ttl) > 0) {
        await client.setEx(key, Number(ttl), serializedValue);
      } else {
        await client.set(key, serializedValue);
      }
      logger.debug(`Cache set for key: ${key}, TTL: ${ttl || 'none'}s`);
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}:`, error.message);
      return false;
    }
  },

  async delete(key) {
    try {
      await client.del(key);
      logger.debug(`Cache deleted for key: ${key}`);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}:`, error.message);
      return false;
    }
  },

  async exists(key) {
    try {
      const exists = await client.exists(key);
      return Boolean(exists);
    } catch (error) {
      logger.error(`Cache exists error for key ${key}:`, error.message);
      return false;
    }
  },

  async expire(key, ttl) {
    try {
      return await client.expire(key, Number(ttl));
    } catch (error) {
      logger.error(`Cache expire error for key ${key}:`, error.message);
      return false;
    }
  }
};

// Close Redis connection
const closeConnection = async () => {
  try {
    if (client.isOpen) {
      await client.quit();
      logger.info('Redis connection closed');
    }
  } catch (err) {
    logger.error('Error closing Redis connection:', err.message);
  }
};

module.exports = {
  client,
  cache,
  closeConnection
};
