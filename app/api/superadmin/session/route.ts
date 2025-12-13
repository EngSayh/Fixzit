/**
 * Superadmin Session Verification API
 * Validates superadmin token and returns session info
 * 
 * @module app/api/superadmin/session/route
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { decodeSuperadminToken, SUPERADMIN_COOKIE_NAME } from "@/lib/superadmin/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

export async function GET(_request: NextRequest) {
  // Rate limit: 60 requests per minute for session checks
  const rateLimitResponse = enforceRateLimit(_request, {
    keyPrefix: "superadmin:session",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };
  try {
    const cookieHeader = _request.cookies.get(SUPERADMIN_COOKIE_NAME)?.value;
    const payload = await decodeSuperadminToken(cookieHeader);

    if (!payload) {
      return NextResponse.json(
        { authenticated: false, error: "No session" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        username: payload.username,
        role: payload.role,
      },
      orgId: payload.orgId,
      expiresAt: new Date(payload.expiresAt).toISOString(),
    }, { headers: ROBOTS_HEADER });
  } catch (error) {
    logger.error("[SUPERADMIN] Session check error", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { authenticated: false, error: "Session verification failed" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
