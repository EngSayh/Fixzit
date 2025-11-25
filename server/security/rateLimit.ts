import { LRUCache } from "lru-cache";

const cache = new LRUCache<string, { count: number; resetAt: number }>({
  max: 5000,
});

export function rateLimit(key: string, limit = 60, windowMs = 60_000) {
  const now = Date.now();
  const entry = cache.get(key);
  if (!entry || now > entry.resetAt) {
    cache.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  if (entry.count >= limit) return { allowed: false, remaining: 0 };
  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count };
}
