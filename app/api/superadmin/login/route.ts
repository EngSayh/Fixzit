/**
 * Superadmin Login API
 * Authenticates superadmin users with separate credentials
 * 
 * @module app/api/superadmin/login/route
 */

import { NextRequest, NextResponse } from "next/server";
import {
  applySuperadminCookies,
  isIpAllowed,
  isRateLimited,
  signSuperadminToken,
  validateSecondFactor,
  verifySuperadminPassword,
} from "@/lib/superadmin/auth";
import { getClientIP } from "@/server/security/headers";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { logger } from "@/lib/logger";

const SUPERADMIN_USERNAME = process.env.SUPERADMIN_USERNAME || "superadmin";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };
const INCLUDE_ERROR_DETAILS = process.env.NODE_ENV !== "production";

export async function POST(request: NextRequest) {
  // Primary rate limiting via enforceRateLimit middleware (5 req/min for login)
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin:login",
    requests: 5,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const ip = getClientIP(request);

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

    // Validate input with field-specific errors
    if (!username || !username.trim()) {
      return NextResponse.json(
        { error: "Username is required", field: "username", code: "MISSING_USERNAME" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: "Password is required", field: "password", code: "MISSING_PASSWORD" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    if (username !== SUPERADMIN_USERNAME) {
      logger.warn("[SUPERADMIN] Failed login attempt - invalid username", { username });
      return NextResponse.json(
        { error: "Username is incorrect", field: "username", code: "INVALID_USERNAME" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    const passwordResult = await verifySuperadminPassword(password);
    if (!passwordResult.ok) {
      if (passwordResult.reason === 'not_configured') {
        logger.error("[SUPERADMIN] Server misconfigured - no password set", { ip });
        return NextResponse.json(
          {
            error: "Superadmin login temporarily unavailable.",
            code: "PASSWORD_NOT_CONFIGURED",
            ...(INCLUDE_ERROR_DETAILS
              ? {
                  details:
                    "Contact system administrator to configure SUPERADMIN_PASSWORD or SUPERADMIN_PASSWORD_HASH in environment variables.",
                }
              : {}),
          },
          { status: 500, headers: ROBOTS_HEADER }
        );
      }
      logger.warn("[SUPERADMIN] Failed password attempt", { username, ip });
      return NextResponse.json(
        { error: "Password is incorrect", field: "password", code: "INVALID_PASSWORD" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    const secondFactorResult = validateSecondFactor(secretKey);
    if (!secondFactorResult) {
      const envSecret = process.env.SUPERADMIN_SECRET_KEY;
      if (envSecret && !secretKey) {
        logger.warn("[SUPERADMIN] Missing required access key", { username, ip });
        return NextResponse.json(
          { error: "Access key is required by server policy", field: "secretKey", code: "ACCESS_KEY_REQUIRED" },
          { status: 401, headers: ROBOTS_HEADER }
        );
      }
      logger.warn("[SUPERADMIN] Invalid access key", { username, ip });
      return NextResponse.json(
        { error: "Access key is incorrect", field: "secretKey", code: "INVALID_ACCESS_KEY" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    let token: string;
    try {
      token = await signSuperadminToken(username);
    } catch (tokenError) {
      // Handle missing org id configuration
      logger.error("[SUPERADMIN] Token signing failed", tokenError instanceof Error ? tokenError : new Error(String(tokenError)));
      return NextResponse.json(
        {
          error: "Superadmin login temporarily unavailable.",
          ...(INCLUDE_ERROR_DETAILS
            ? {
                details:
                  tokenError instanceof Error ? tokenError.message : "Token generation failed",
              }
            : {}),
        },
        { status: 500, headers: ROBOTS_HEADER }
      );
    }

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
