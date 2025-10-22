/**
 * Simple in-memory rate limiter (replace with Redis/Upstash for production)
 * @module lib/security/rate-limit
 */

type Options = { windowMs: number; max: number };

/**
 * Creates a rate limiter instance
 * @param opts Configuration with windowMs and max requests
 * @returns Rate limiter with check method
 */
export function rateLimit(opts: Options) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return {
    /**
     * Checks if key is within rate limit
     * @param key Unique identifier (e.g., IP, user ID)
     * @returns True if allowed, false if rate limited
     */
    async check(key: string): Promise<boolean> {
      const now = Date.now();
      const rec = hits.get(key);
      if (!rec || rec.resetAt < now) {
        hits.set(key, { count: 1, resetAt: now + opts.windowMs });
        return true;
      }
      if (rec.count >= opts.max) return false;
      rec.count += 1;
      return true;
    },
  };
}
