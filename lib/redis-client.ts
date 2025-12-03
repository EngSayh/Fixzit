/**
 * Redis Client Configuration
 * Used for caching, rate limiting, and BullMQ job queues.
 * Provides in-memory fallbacks when Redis is not configured.
 */

import Redis from "ioredis";
import { logger } from "@/lib/logger";

type MemoryEntry = { value: string; expiresAt: number };

// Support REDIS_URL or REDIS_KEY (Vercel/GitHub naming convention)
const redisUrl = process.env.REDIS_URL || process.env.REDIS_KEY;
const redisHost = process.env.REDIS_HOST;
const redisPort = parseInt(process.env.REDIS_PORT || "6379", 10);
const redisPassword = process.env.REDIS_PASSWORD;
const redisDb = parseInt(process.env.REDIS_DB || "0", 10);

const hasRedisConfig = Boolean(redisUrl || redisHost);

let redisClient: Redis | null = null;
let warnedMissingRedis = false;

const memoryStore = new Map<string, MemoryEntry>();
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function cleanupMemoryEntry(key: string): MemoryEntry | null {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (
    entry.expiresAt !== Number.POSITIVE_INFINITY &&
    entry.expiresAt <= Date.now()
  ) {
    memoryStore.delete(key);
    return null;
  }
  return entry;
}

function memoryGet(key: string): string | null {
  const entry = cleanupMemoryEntry(key);
  return entry ? entry.value : null;
}

function memorySet(key: string, value: string, ttlSeconds?: number): void {
  const expiresAt = ttlSeconds
    ? Date.now() + ttlSeconds * 1000
    : Number.POSITIVE_INFINITY;
  memoryStore.set(key, { value, expiresAt });
}

function memoryDel(key: string): void {
  memoryStore.delete(key);
}

function memoryDelPattern(pattern: string): void {
  const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
  for (const key of memoryStore.keys()) {
    if (regex.test(key)) {
      memoryStore.delete(key);
    }
  }
}

function memoryIncr(key: string): number {
  const current = Number(memoryGet(key) || "0");
  const next = current + 1;
  memorySet(key, next.toString());
  return next;
}

function memoryExpire(key: string, ttlSeconds: number): void {
  const entry = memoryStore.get(key);
  if (!entry) return;
  entry.expiresAt = Date.now() + ttlSeconds * 1000;
  memoryStore.set(key, entry);
}

function buildRedisClient(): Redis | null {
  if (!hasRedisConfig) {
    if (!warnedMissingRedis && process.env.NODE_ENV !== "test") {
      logger.warn(
        "[Redis] REDIS_URL/REDIS_HOST not configured. Redis-backed features disabled.",
      );
      warnedMissingRedis = true;
    }
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  const baseConfig = {
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy(times: number) {
      return Math.min(times * 50, 2000);
    },
  };

  redisClient = redisUrl
    ? new Redis(redisUrl, baseConfig)
    : new Redis({
        host: redisHost!,
        port: redisPort,
        password: redisPassword,
        db: redisDb,
        ...baseConfig,
      });

  redisClient.on("connect", () => {
    logger.info(
      "🔴 Redis connected",
      redisUrl ? { url: redisUrl } : { host: redisHost, port: redisPort },
    );
  });

  redisClient.on("ready", () => {
    logger.info("✅ Redis ready for commands");
  });

  redisClient.on("reconnecting", () => {
    logger.info("Redis reconnecting...");
  });

  redisClient.on("close", () => {
    logger.warn("Redis connection closed");
  });

  redisClient.on("error", (error) => {
    logger.error("Redis connection error", { error });
  });

  return redisClient;
}

export function getRedisClient(): Redis | null {
  return buildRedisClient();
}

export async function connectRedis(): Promise<void> {
  const client = getRedisClient();
  if (!client) {
    logger.warn("connectRedis skipped - Redis not configured");
    return;
  }
  if (client.status === "ready") return;
  await client.connect();
  logger.info("Redis client connected successfully");
}

export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info("Redis client disconnected");
  }
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    if (client) {
      try {
        const value = await client.get(key);
        return value ? (JSON.parse(value) as T) : null;
      } catch (_error) {
        const error =
          _error instanceof Error ? _error : new Error(String(_error));
        void error;
        logger.error("Cache get error", { key, error });
      }
    }
    const memoryValue = memoryGet(key);
    return memoryValue ? (JSON.parse(memoryValue) as T) : null;
  },

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    const client = getRedisClient();
    if (client) {
      try {
        if (ttlSeconds) {
          await client.setex(key, ttlSeconds, serialized);
        } else {
          await client.set(key, serialized);
        }
        return;
      } catch (_error) {
        const error =
          _error instanceof Error ? _error : new Error(String(_error));
        void error;
        logger.error("Cache set error", { key, error });
      }
    }
    memorySet(key, serialized, ttlSeconds);
  },

  async del(key: string): Promise<void> {
    const client = getRedisClient();
    if (client) {
      try {
        await client.del(key);
        return;
      } catch (_error) {
        const error =
          _error instanceof Error ? _error : new Error(String(_error));
        void error;
        logger.error("Cache delete error", { key, error });
      }
    }
    memoryDel(key);
  },

  async delPattern(pattern: string): Promise<void> {
    const client = getRedisClient();
    if (client) {
      try {
        const keys = await client.keys(pattern);
        if (keys.length) {
          await client.del(...keys);
        }
        return;
      } catch (_error) {
        const error =
          _error instanceof Error ? _error : new Error(String(_error));
        void error;
        logger.error("Cache delete pattern error", { pattern, error });
      }
    }
    memoryDelPattern(pattern);
  },

  async exists(key: string): Promise<boolean> {
    const client = getRedisClient();
    if (client) {
      try {
        return (await client.exists(key)) === 1;
      } catch (_error) {
        const error =
          _error instanceof Error ? _error : new Error(String(_error));
        void error;
        logger.error("Cache exists error", { key, error });
      }
    }
    return memoryGet(key) !== null;
  },

  async incr(key: string): Promise<number> {
    const client = getRedisClient();
    if (client) {
      try {
        return await client.incr(key);
      } catch (_error) {
        const error =
          _error instanceof Error ? _error : new Error(String(_error));
        void error;
        logger.error("Cache increment error", { key, error });
      }
    }
    return memoryIncr(key);
  },

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const client = getRedisClient();
    if (client) {
      try {
        await client.expire(key, ttlSeconds);
        return;
      } catch (_error) {
        const error =
          _error instanceof Error ? _error : new Error(String(_error));
        void error;
        logger.error("Cache expire error", { key, error });
      }
    }
    memoryExpire(key, ttlSeconds);
  },
};

export const rateLimit = {
  async check(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const client = getRedisClient();
    if (client) {
      try {
        const rateKey = `ratelimit:${key}`;
        const current = await client.incr(rateKey);
        if (current === 1) {
          await client.expire(rateKey, windowSeconds);
        }
        const ttl = await client.ttl(rateKey);
        const resetAt = new Date(Date.now() + ttl * 1000);
        const remaining = Math.max(0, limit - current);
        return { allowed: current <= limit, remaining, resetAt };
      } catch (_error) {
        const error =
          _error instanceof Error ? _error : new Error(String(_error));
        void error;
        logger.error("Rate limit check error", { key, error });
      }
    }

    const now = Date.now();
    const bucket = rateLimitBuckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      const resetAt = now + windowSeconds * 1000;
      rateLimitBuckets.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt: new Date(resetAt),
      };
    }

    bucket.count += 1;
    const allowed = bucket.count <= limit;
    const remaining = Math.max(0, limit - bucket.count);
    rateLimitBuckets.set(key, bucket);
    return { allowed, remaining, resetAt: new Date(bucket.resetAt) };
  },
};

export default {
  getRedisClient,
  connectRedis,
  disconnectRedis,
  cache,
  rateLimit,
};
