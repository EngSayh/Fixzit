import { logger } from "@/lib/logger";
import { getRedisClient, safeRedisOp } from "@/lib/redis";

/**
 * @module lib/refresh-token-store
 * @description Distributed refresh token replay protection with Redis/memory fallback.
 *
 * Stores refresh token JTIs with TTL to detect reuse across instances.
 * Falls back to in-memory storage when Redis unavailable (development only).
 *
 * @features
 * - Redis-backed JTI storage (shared across instances)
 * - In-memory fallback (development/single-instance)
 * - TTL-based expiration (matches token lifetime)
 * - Replay attack detection (JTI validation)
 * - Production-critical warnings (Redis unavailable alerts)
 * - User-scoped keys (userId + JTI composite key)
 *
 * @usage
 * ```typescript
 * import { persistRefreshJti, validateRefreshJti, revokeRefreshJti } from '@/lib/refresh-token-store';
 * 
 * // After issuing refresh token
 * await persistRefreshJti(userId, jti, 7 * 24 * 3600); // 7 days
 * 
 * // Before accepting refresh token
 * const isValid = await validateRefreshJti(userId, jti);
 * if (!isValid) {
 *   throw new Error('Token replay detected');
 * }
 * 
 * // On logout
 * await revokeRefreshJti(userId, jti);
 * ```
 *
 * @security
 * Critical for preventing refresh token replay attacks in distributed deployments.
 */
const memoryStore = new Map<string, number>();
let warnedMemoryFallback = false;

function key(userId: string, jti: string): string {
  return `refresh:${userId}:${jti}`;
}

function warnMemory(): void {
  if (warnedMemoryFallback || process.env.NODE_ENV !== "production") return;
  logger.error(
    "[auth/refresh] CRITICAL: Redis unavailable; using in-memory refresh store. Replay protection NOT shared across instances.",
    { severity: "ops_critical", feature: "auth_refresh_replay" },
  );
  warnedMemoryFallback = true;
}

/**
 * Persist a refresh token JTI with TTL (seconds).
 */
export async function persistRefreshJti(
  userId: string,
  jti: string,
  ttlSeconds: number,
): Promise<void> {
  const client = getRedisClient();
  if (client) {
    await safeRedisOp(
      async (c) => c.setex(key(userId, jti), ttlSeconds, "1"),
      undefined,
    );
    return;
  }

  warnMemory();
  memoryStore.set(key(userId, jti), Date.now() + ttlSeconds * 1000);
}

/**
 * Validate a refresh token JTI exists (and not expired).
 */
export async function validateRefreshJti(
  userId: string,
  jti: string,
): Promise<boolean> {
  const client = getRedisClient();
  if (client) {
    const exists = await safeRedisOp(
      async (c) => c.exists(key(userId, jti)),
      0,
    );
    return exists === 1;
  }

  warnMemory();
  const expiresAt = memoryStore.get(key(userId, jti));
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    memoryStore.delete(key(userId, jti));
    return false;
  }
  return true;
}

/**
 * Revoke a refresh token JTI (optional cleanup).
 */
export async function revokeRefreshJti(
  userId: string,
  jti: string,
): Promise<void> {
  const client = getRedisClient();
  if (client) {
    await safeRedisOp(async (c) => c.del(key(userId, jti)), 0);
    return;
  }

  warnMemory();
  memoryStore.delete(key(userId, jti));
}
