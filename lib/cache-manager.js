const Redis = require('redis');
const NodeCache = require('node-cache');
const LRU = require('lru-cache');

class CacheManager {
  constructor(options = {}) {
    this.config = {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD,
        db: process.env.REDIS_DB || 0,
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'fixzit:',
      },
      memory: {
        stdTTL: 600, // 10 minutes default
        checkPeriod: 120, // Check every 2 minutes
        maxKeys: 1000,
      },
      lru: {
        max: 500,
        ttl: 1000 * 60 * 10, // 10 minutes
      },
      ...options
    };

    this.redisClient = null;
    this.memoryCache = new NodeCache(this.config.memory);
    this.lruCache = new LRU(this.config.lru);
    this.compressionThreshold = 1024; // Compress values larger than 1KB
    
    this.initialize();
  }

  async initialize() {
    try {
      // Initialize Redis client
      if (process.env.REDIS_URL || process.env.REDIS_HOST) {
        this.redisClient = Redis.createClient({
          url: process.env.REDIS_URL,
          host: this.config.redis.host,
          port: this.config.redis.port,
          password: this.config.redis.password,
          db: this.config.redis.db,
        });

        this.redisClient.on('error', (err) => {
          console.error('Redis Client Error:', err);
        });

        this.redisClient.on('connect', () => {
          console.log('✅ Redis connected');
        });

        await this.redisClient.connect();
      }

      console.log('✅ Cache Manager initialized');
    } catch (error) {
      console.warn('⚠️ Redis not available, using memory cache only:', error.message);
    }
  }

  // Multi-level caching strategy
  async get(key, options = {}) {
    const { useMemory = true, useRedis = true, decompress = true } = options;
    
    try {
      // Level 1: LRU Cache (fastest)
      if (useMemory) {
        const lruValue = this.lruCache.get(key);
        if (lruValue !== undefined) {
          return this.deserializeValue(lruValue, decompress);
        }

        // Level 2: Memory Cache
        const memValue = this.memoryCache.get(key);
        if (memValue !== undefined) {
          // Promote to LRU cache
          this.lruCache.set(key, memValue);
          return this.deserializeValue(memValue, decompress);
        }
      }

      // Level 3: Redis Cache
      if (useRedis && this.redisClient) {
        const redisValue = await this.redisClient.get(this.getRedisKey(key));
        if (redisValue !== null) {
          const deserializedValue = this.deserializeValue(redisValue, decompress);
          
          // Promote to memory caches
          if (useMemory) {
            this.memoryCache.set(key, redisValue);
            this.lruCache.set(key, redisValue);
          }
          
          return deserializedValue;
        }
      }

      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = null, options = {}) {
    const { useMemory = true, useRedis = true, compress = true } = options;
    
    try {
      const serializedValue = this.serializeValue(value, compress);
      const cacheTTL = ttl || this.config.memory.stdTTL;

      // Set in all available cache levels
      if (useMemory) {
        this.lruCache.set(key, serializedValue);
        this.memoryCache.set(key, serializedValue, cacheTTL);
      }

      if (useRedis && this.redisClient) {
        const redisKey = this.getRedisKey(key);
        if (ttl) {
          await this.redisClient.setEx(redisKey, ttl, serializedValue);
        } else {
          await this.redisClient.set(redisKey, serializedValue);
        }
      }

      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    try {
      // Delete from all cache levels
      this.lruCache.delete(key);
      this.memoryCache.del(key);

      if (this.redisClient) {
        await this.redisClient.del(this.getRedisKey(key));
      }

      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async flush(pattern = '*') {
    try {
      // Clear memory caches
      if (pattern === '*') {
        this.lruCache.clear();
        this.memoryCache.flushAll();
      }

      // Clear Redis with pattern
      if (this.redisClient) {
        if (pattern === '*') {
          await this.redisClient.flushDb();
        } else {
          const keys = await this.redisClient.keys(this.getRedisKey(pattern));
          if (keys.length > 0) {
            await this.redisClient.del(keys);
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  // Cache-aside pattern for database queries
  async cacheQuery(key, queryFunction, ttl = 600, options = {}) {
    const cachedResult = await this.get(key, options);
    
    if (cachedResult !== null) {
      return cachedResult;
    }

    try {
      const result = await queryFunction();
      await this.set(key, result, ttl, options);
      return result;
    } catch (error) {
      console.error('Cache query error:', error);
      throw error;
    }
  }

  // Cache warming
  async warmCache(cacheMap) {
    console.log('🔥 Warming cache...');
    const promises = Object.entries(cacheMap).map(async ([key, { queryFunction, ttl, options }]) => {
      try {
        const result = await queryFunction();
        await this.set(key, result, ttl, options);
        console.log(`✅ Warmed cache for key: ${key}`);
      } catch (error) {
        console.error(`❌ Failed to warm cache for key: ${key}`, error);
      }
    });

    await Promise.all(promises);
    console.log('🔥 Cache warming completed');
  }

  // Cache invalidation patterns
  async invalidatePattern(pattern) {
    try {
      // Invalidate memory cache
      const memoryKeys = this.memoryCache.keys();
      memoryKeys.forEach(key => {
        if (this.matchPattern(key, pattern)) {
          this.memoryCache.del(key);
          this.lruCache.delete(key);
        }
      });

      // Invalidate Redis cache
      if (this.redisClient) {
        const redisPattern = this.getRedisKey(pattern);
        const keys = await this.redisClient.keys(redisPattern);
        if (keys.length > 0) {
          await this.redisClient.del(keys);
        }
      }

      return true;
    } catch (error) {
      console.error('Cache invalidation error:', error);
      return false;
    }
  }

  async invalidateByTags(tags) {
    const tagArray = Array.isArray(tags) ? tags : [tags];
    
    for (const tag of tagArray) {
      await this.invalidatePattern(`tag:${tag}:*`);
    }
  }

  // Distributed locking for cache updates
  async lock(key, ttl = 30) {
    if (!this.redisClient) return null;

    const lockKey = `lock:${key}`;
    const lockValue = `${Date.now()}_${Math.random()}`;

    try {
      const result = await this.redisClient.set(lockKey, lockValue, {
        PX: ttl * 1000,
        NX: true
      });

      return result === 'OK' ? lockValue : null;
    } catch (error) {
      console.error('Lock error:', error);
      return null;
    }
  }

  async unlock(key, lockValue) {
    if (!this.redisClient || !lockValue) return false;

    const lockKey = `lock:${key}`;
    
    try {
      const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      
      const result = await this.redisClient.eval(script, {
        keys: [lockKey],
        arguments: [lockValue]
      });

      return result === 1;
    } catch (error) {
      console.error('Unlock error:', error);
      return false;
    }
  }

  // Cache statistics
  getStats() {
    const stats = {
      memory: {
        keys: this.memoryCache.keys().length,
        hits: this.memoryCache.getStats().hits,
        misses: this.memoryCache.getStats().misses,
        size: this.memoryCache.getStats().ksize + this.memoryCache.getStats().vsize
      },
      lru: {
        size: this.lruCache.size,
        max: this.lruCache.max
      },
      redis: {
        connected: this.redisClient ? this.redisClient.isOpen : false
      }
    };

    return stats;
  }

  // Utility methods
  serializeValue(value, compress = true) {
    let serialized = JSON.stringify(value);
    
    if (compress && serialized.length > this.compressionThreshold) {
      // In production, use a compression library like zlib
      serialized = `compressed:${serialized}`;
    }
    
    return serialized;
  }

  deserializeValue(serializedValue, decompress = true) {
    if (typeof serializedValue !== 'string') {
      return serializedValue;
    }

    if (decompress && serializedValue.startsWith('compressed:')) {
      // In production, decompress using zlib
      serializedValue = serializedValue.replace('compressed:', '');
    }

    try {
      return JSON.parse(serializedValue);
    } catch (error) {
      return serializedValue;
    }
  }

  getRedisKey(key) {
    return `${this.config.redis.keyPrefix}${key}`;
  }

  matchPattern(str, pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(str);
  }

  // Health check
  async healthCheck() {
    const health = {
      memory: {
        status: 'healthy',
        stats: this.getStats().memory
      },
      redis: {
        status: 'unknown',
        connected: false
      }
    };

    if (this.redisClient) {
      try {
        await this.redisClient.ping();
        health.redis.status = 'healthy';
        health.redis.connected = true;
      } catch (error) {
        health.redis.status = 'unhealthy';
        health.redis.error = error.message;
      }
    } else {
      health.redis.status = 'not_configured';
    }

    return health;
  }
}

// Specialized cache implementations
class QueryCache extends CacheManager {
  constructor(options = {}) {
    super({
      ...options,
      redis: {
        ...options.redis,
        keyPrefix: 'fixzit:query:'
      }
    });
  }

  async cacheDbQuery(sql, params, ttl = 300) {
    const key = this.generateQueryKey(sql, params);
    return await this.cacheQuery(key, async () => {
      // Execute database query
      return await this.executeQuery(sql, params);
    }, ttl);
  }

  generateQueryKey(sql, params) {
    const hash = require('crypto')
      .createHash('md5')
      .update(sql + JSON.stringify(params))
      .digest('hex');
    return `query:${hash}`;
  }

  async executeQuery(sql, params) {
    // Implement database query execution
    throw new Error('executeQuery must be implemented by subclass');
  }
}

class ApiCache extends CacheManager {
  constructor(options = {}) {
    super({
      ...options,
      redis: {
        ...options.redis,
        keyPrefix: 'fixzit:api:'
      }
    });
  }

  async cacheApiResponse(endpoint, params, ttl = 300) {
    const key = this.generateApiKey(endpoint, params);
    return await this.get(key);
  }

  async setApiResponse(endpoint, params, response, ttl = 300) {
    const key = this.generateApiKey(endpoint, params);
    return await this.set(key, response, ttl);
  }

  generateApiKey(endpoint, params) {
    const hash = require('crypto')
      .createHash('md5')
      .update(endpoint + JSON.stringify(params))
      .digest('hex');
    return `api:${hash}`;
  }
}

class SessionCache extends CacheManager {
  constructor(options = {}) {
    super({
      ...options,
      redis: {
        ...options.redis,
        keyPrefix: 'fixzit:session:'
      }
    });
  }

  async getSession(sessionId) {
    return await this.get(`session:${sessionId}`);
  }

  async setSession(sessionId, sessionData, ttl = 3600) {
    return await this.set(`session:${sessionId}`, sessionData, ttl);
  }

  async deleteSession(sessionId) {
    return await this.del(`session:${sessionId}`);
  }

  async refreshSession(sessionId, ttl = 3600) {
    if (this.redisClient) {
      const key = this.getRedisKey(`session:${sessionId}`);
      return await this.redisClient.expire(key, ttl);
    }
    return false;
  }
}

module.exports = {
  CacheManager,
  QueryCache,
  ApiCache,
  SessionCache
};