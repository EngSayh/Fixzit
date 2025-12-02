import { logger } from "@/lib/logger";
import { getRedisClient, safeRedisOp } from "@/lib/redis";

/**
 * Distributed refresh token replay protection
 *
 * Stores refresh token JTIs with TTL to detect reuse across instances.
 * Falls back to in-memory storage when Redis is unavailable (development only).
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
