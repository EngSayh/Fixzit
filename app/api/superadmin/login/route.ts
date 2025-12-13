/**
 * Superadmin Login API
 * Authenticates superadmin users with separate credentials
 * 
 * @module app/api/superadmin/login/route
 */

import { NextRequest, NextResponse } from "next/server";
import {
  applySuperadminCookies,
  getClientIp,
  isIpAllowed,
  isRateLimited,
  signSuperadminToken,
  validateSecondFactor,
  verifySuperadminPassword,
} from "@/lib/superadmin/auth";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { logger } from "@/lib/logger";

const SUPERADMIN_USERNAME = process.env.SUPERADMIN_USERNAME || "superadmin";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

export async function POST(request: NextRequest) {
  // Primary rate limiting via enforceRateLimit middleware (5 req/min for login)
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin:login",
    requests: 5,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const ip = getClientIp(request);

  if (!isIpAllowed(ip)) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403, headers: ROBOTS_HEADER }
    );
  }

  // Secondary rate limiting (defense-in-depth, per-IP in-memory)
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429, headers: ROBOTS_HEADER }
    );
  }

  try {
    const body = typeof (request as any).json === "function"
      ? await (request as any).json().catch(() => null)
      : null;
    const { username, password, secretKey } = body || {};

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password required" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    if (username !== SUPERADMIN_USERNAME) {
      logger.warn("[SUPERADMIN] Failed login attempt", { username });
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    const passwordOk = await verifySuperadminPassword(password);
    if (!passwordOk) {
      logger.warn("[SUPERADMIN] Failed password attempt", { username, ip });
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    if (!validateSecondFactor(secretKey)) {
      logger.warn("[SUPERADMIN] Missing/invalid second factor", { username, ip });
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    const token = await signSuperadminToken(username);
    const response = NextResponse.json(
      {
        success: true,
        message: "Authenticated successfully",
        role: "super_admin",
      },
      { headers: ROBOTS_HEADER }
    );

    applySuperadminCookies(response, token, 8 * 60 * 60);

    logger.info("[SUPERADMIN] Successful login", { username });

    return response;
  } catch (error) {
    logger.error("[SUPERADMIN] Login error", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
