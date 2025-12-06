/**
 * Shared Health Token Verification
 *
 * Provides constant-time comparison for health check token validation
 * to prevent timing attacks. Used by all health endpoints.
 */
import { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * Check if the request is from an authorized internal tool.
 * Uses X-Health-Token header to authenticate monitoring systems.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function isAuthorizedHealthRequest(request: NextRequest): boolean {
  const token = process.env.HEALTH_CHECK_TOKEN;
  if (!token) return false;

  const provided =
    request.headers.get("X-Health-Token") ||
    request.headers.get("x-health-token");
  if (!provided) return false;

  try {
    return timingSafeEqual(
      Buffer.from(token, "utf8"),
      Buffer.from(provided, "utf8"),
    );
  } catch {
    // Buffers have different lengths - tokens don't match
    return false;
  }
}
