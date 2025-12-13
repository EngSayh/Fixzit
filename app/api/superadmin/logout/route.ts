/**
 * Superadmin Logout API
 * Clears superadmin session
 * 
 * @module app/api/superadmin/logout/route
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { clearSuperadminCookies } from "@/lib/superadmin/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

export async function POST(request: NextRequest) {
  // Rate limit: 10 logout requests per minute
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin:logout",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    }, { headers: { "X-Robots-Tag": "noindex, nofollow" } });

    clearSuperadminCookies(response);

    return response;
  } catch (error) {
    logger.error("[SUPERADMIN] Logout error", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Logout failed" },
      { status: 500, headers: { "X-Robots-Tag": "noindex, nofollow" } }
    );
  }
}

export async function GET(request: NextRequest) {
  // Allow GET for simple logout links
  return POST(request);
}
