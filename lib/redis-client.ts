import { getRedisClient as getSharedRedisClient } from "@/lib/redis";
type RedisClient = ReturnType<typeof getSharedRedisClient>;

function client(): RedisClient {
  return getSharedRedisClient();
}

export function getRedisClient(): RedisClient {
  return client();
}

export async function connectRedis(): Promise<void> {
  await client().connect();
}

export async function disconnectRedis(): Promise<void> {
  await client().quit();
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const value = await client().get(key);
    return value ? (JSON.parse(value) as T) : null;
  },

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await client().setex(key, ttlSeconds, serialized);
    } else {
      await client().set(key, serialized);
    }
  },

  async del(key: string): Promise<void> {
    await client().del(key);
  },

  async delPattern(pattern: string): Promise<void> {
    const stream = client().scanStream({ match: pattern });
    for await (const chunk of stream as AsyncIterable<string[]>) {
      if (chunk.length) {
        await client().del(...chunk);
      }
    }
  },

  async exists(key: string): Promise<boolean> {
    return (await client().get(key)) !== null;
  },

  async incr(key: string): Promise<number> {
    return client().incr(key);
  },

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await client().expire(key, ttlSeconds);
  },
};

export const rateLimit = {
  async check(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
    const redis = client();
    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, windowSeconds);
    }
    const ttl = await redis.ttl(key);
    const resetAt = new Date(Date.now() + Math.max(0, ttl) * 1000);
    const remaining = Math.max(0, limit - current);
    return { allowed: current <= limit, remaining, resetAt };
  },
};

export default {
  getRedisClient,
  connectRedis,
  disconnectRedis,
  cache,
  rateLimit,
};
