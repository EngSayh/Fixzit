import { NextRequest } from "next/server";
import { getClientIP } from "@/server/security/headers";

/**
 * Builds a consistent rate limit key that incorporates the request path,
 * authenticated user (if available), and client IP address.
 */
export function buildRateLimitKey(
  req: NextRequest,
  userId?: string | null,
  overridePath?: string,
): string {
  const path = overridePath ?? new URL(req.url).pathname;
  const keyParts = [path];
  if (userId) {
    keyParts.push(userId);
  }
  let ip = "unknown";
  try {
    ip = getClientIP(req);
  } catch {
    ip = "unknown";
  }
  keyParts.push(ip);
  return keyParts.join(":");
}
