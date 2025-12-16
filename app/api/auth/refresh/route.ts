/**
 * JWT Token Refresh API Route Handler
 * POST /api/auth/refresh - Refresh JWT access token using refresh token
 * 
 * Issues new short-lived access tokens (5m) using valid refresh tokens (7d).
 * Implements token rotation for enhanced security - optionally rotates refresh
 * tokens and revokes old ones. Validates refresh token JTI against revocation list.
 * 
 * @module app/api/auth/refresh/route
 * @requires NEXTAUTH_SECRET environment variable
 * 
 * @requestCookies
 * - fx_refresh_token: Valid refresh token (7d expiry)
 * 
 * @response
 * - success: boolean
 * - Sets new httpOnly cookies: fx_access_token (5m), optionally fx_refresh_token (7d)
 * 
 * @errors
 * - 401: Refresh token missing, invalid, or expired
 * - 403: Refresh token JTI has been revoked
 * - 429: Rate limit exceeded (30 requests per minute per IP)
 * - 500: NEXTAUTH_SECRET not configured
 * 
 * @security
 * - Rate limited to prevent token harvesting
 * - Token rotation: old refresh token revoked when new one issued
 * - JTI-based revocation list (stored in refresh-token-store)
 * - HttpOnly, Secure, SameSite cookies
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import jwt from "jsonwebtoken";
import { validateRefreshJti, persistRefreshJti, revokeRefreshJti } from "@/lib/refresh-token-store";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";

export const REFRESH_COOKIE = "fxz.refresh";
export const ACCESS_COOKIE = "fxz.access";
export const ACCESS_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export async function POST(req: NextRequest) {
  // Rate limit: 10 refreshes per minute per IP
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`auth:refresh:${clientIp}`, 10, 60_000);
  if (!rl.allowed) return rateLimitError();

  try {
    const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
    if (!refreshToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Support both NEXTAUTH_SECRET (preferred) and AUTH_SECRET (legacy/Auth.js name)
    // MUST align with auth.config.ts to prevent environment drift
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret) {
      return NextResponse.json({ error: "Not configured" }, { status: 500 });
    }
    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(refreshToken, secret) as jwt.JwtPayload;
    } catch (_e) {
      logger.warn("[auth/refresh] Invalid refresh token", { error: "JWT verification failed" });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // STRICT v4.1 FIX: Require explicit refresh token type to prevent access-token replay
    if (payload.type !== "refresh") {
      logger.warn("[auth/refresh] Invalid token type", { type: payload.type });
      return NextResponse.json({ error: "Invalid token type" }, { status: 401 });
    }

    // SECURITY: Require JTI for replay protection (STRICT v4.1)
    const jti = payload.jti;
    if (!jti) {
      logger.warn("[auth/refresh] Token missing JTI", { sub: payload.sub });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // SECURITY: Validate JTI against refresh token store for replay protection
    const isValidJti = await validateRefreshJti(payload.sub as string, jti);
    if (!isValidJti) {
      // In production, reject unknown JTIs (potential replay attack)
      if (process.env.NODE_ENV === "production") {
        logger.warn("[auth/refresh] Unknown JTI - potential replay attack", {
          sub: payload.sub,
          jti,
        });
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      // In non-production, allow legacy tokens and register them (migration path)
      logger.info("[auth/refresh] Registering legacy JTI for first use", {
        sub: payload.sub,
        jti,
      });
      await persistRefreshJti(payload.sub as string, jti, REFRESH_TTL_SECONDS);
    }

    // Verify session is still valid using NextAuth v5 auth()
    const session = await auth();
    if (!session || session.user?.id !== payload.sub) {
      logger.warn("[auth/refresh] Session mismatch or expired", {
        hasSession: !!session,
        sessionUserId: session?.user?.id,
        tokenSub: payload.sub,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessToken = jwt.sign(
      {
        sub: session.user?.id,
        role: session.user?.role,
        orgId: (session.user as { orgId?: string })?.orgId,
      },
      secret,
      { expiresIn: ACCESS_TTL_SECONDS },
    );

    // Token rotation: issue new refresh token to prevent replay attacks
    const newJti = crypto.randomUUID();
    const newRefresh = jwt.sign(
      {
        sub: session.user?.id,
        type: "refresh",
        jti: newJti,
      },
      secret,
      { expiresIn: REFRESH_TTL_SECONDS },
    );
    
    // SECURITY: Persist new JTI and explicitly revoke old one (rotation)
    await persistRefreshJti(session.user?.id as string, newJti, REFRESH_TTL_SECONDS);
    await revokeRefreshJti(session.user?.id as string, jti);

    const res = NextResponse.json(
      { ok: true, accessToken },
      { status: 200 },
    );
    try {
      const secure =
        req.nextUrl.protocol === "https:" ||
        process.env.NODE_ENV === "production";
      res.cookies.set(ACCESS_COOKIE, accessToken, {
        httpOnly: true,
        sameSite: "strict",
        secure,
        path: "/",
        maxAge: ACCESS_TTL_SECONDS,
      });
      res.cookies.set(REFRESH_COOKIE, newRefresh, {
        httpOnly: true,
        sameSite: "strict",
        secure,
        path: "/",
        maxAge: REFRESH_TTL_SECONDS,
      });
    } catch (_cookieError) {
      logger.warn("[auth/refresh] Failed to set cookie");
    }
    
    logger.info("[auth/refresh] Token refreshed successfully", {
      userId: session.user?.id,
    });
    return res;
  } catch (error) {
    logger.error("[auth/refresh] Error", error as Error);
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}
