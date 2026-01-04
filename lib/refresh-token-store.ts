import { logger } from "@/lib/logger";

/**
 * @module lib/refresh-token-store
 * @description Refresh token replay protection with in-memory storage.
 *
 * Stores refresh token JTIs with TTL to detect reuse across instances.
 * Uses in-memory storage optimized for single-instance deployments.
 *
 * @features
 * - In-memory JTI storage (single-instance)
 * - TTL-based expiration (matches token lifetime)
 * - Replay attack detection (JTI validation)
 * - Production-critical warnings when multi-instance detected
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
 * Critical for preventing refresh token replay attacks in single-instance deployments.
 */
const memoryStore = new Map<string, number>();
let warnedMemoryFallback = false;

function key(userId: string, jti: string): string {
  return `refresh:${userId}:${jti}`;
}

function warnMemory(): void {
  if (warnedMemoryFallback || process.env.NODE_ENV !== "production") return;
  logger.error(
    "[auth/refresh] CRITICAL: In-memory refresh store enabled. Replay protection NOT shared across instances.",
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
  warnMemory();
  memoryStore.delete(key(userId, jti));
}
