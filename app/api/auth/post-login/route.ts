/**
 * @fileoverview Post-Login Token Issuance API
 * @description Issues JWT access and refresh tokens after successful NextAuth authentication.
 * Performs server-side user status validation to prevent token issuance for disabled accounts.
 * @module api/auth/post-login
 *
 * @security Validates user status from DB before issuing tokens
 * @security Stores refresh token JTI for revocation support
 * @security Sets HTTP-only cookies for token storage
 *
 * @example
 * // POST /api/auth/post-login
 * // Requires valid NextAuth session
 * // Returns: { success: true } with Set-Cookie headers
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { User } from "@/server/models/User";
import { UserStatus } from "@/types/user";
import {
  ACCESS_COOKIE,
  ACCESS_TTL_SECONDS,
  REFRESH_COOKIE,
  REFRESH_TTL_SECONDS,
} from "@/app/api/auth/refresh/route";
import { persistRefreshJti } from "@/lib/refresh-token-store";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";

export async function POST(req: NextRequest) {
  // Rate limit: 30 post-login attempts per minute per IP
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`auth:post-login:${clientIp}`, 30, 60_000);
  if (!rl.allowed) return rateLimitError();

  try {
    const session = await auth();
    if (!session) {
      logger.warn("[auth/post-login] No session found", { hasSession: false });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Support both NEXTAUTH_SECRET (preferred) and AUTH_SECRET (legacy/Auth.js name)
    // MUST align with auth.config.ts to prevent environment drift
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret) {
      logger.error("[auth/post-login] NEXTAUTH_SECRET/AUTH_SECRET not configured", {
        severity: "ops_critical",
        hint: "Set NEXTAUTH_SECRET or AUTH_SECRET env var in Vercel/production",
      });
      return NextResponse.json({ error: "Not configured" }, { status: 500 });
    }

    const sub = session.user?.id;
    if (!sub || typeof sub !== "string") {
      logger.warn("[auth/post-login] Invalid session: missing user id", {
        hasSession: !!session,
        hasUserId: !!sub,
        userIdType: typeof sub,
      });
      return NextResponse.json(
        { error: "Invalid session: missing user id" },
        { status: 401 },
      );
    }

    // SECURITY: Revalidate user status/role/org from DB to prevent issuing tokens for disabled users or stale roles
    await connectToDatabase();
    const user = await User.findById(sub)
      .select("status professional.role orgId")
      .lean() as { status?: string; professional?: { role?: string }; orgId?: string } | null;

    if (!user || user.status !== UserStatus.ACTIVE) {
      logger.warn("[auth/post-login] User inactive or not found during token issuance", {
        userId: sub,
        status: user?.status,
      });
      return NextResponse.json(
        { error: "Account not active" },
        { status: 401 },
      );
    }

    const accessPayload: Record<string, unknown> = { sub };
    if (user.professional?.role) accessPayload.role = user.professional.role;
    if (user.orgId) accessPayload.orgId = user.orgId;

    const accessToken = jwt.sign(accessPayload, secret, {
      expiresIn: ACCESS_TTL_SECONDS,
    });

    // Add jti for consistency with refresh route's replay protection
    const refreshToken = jwt.sign(
      { sub, type: "refresh", jti: crypto.randomUUID() },
      secret,
      { expiresIn: REFRESH_TTL_SECONDS },
    );
    await persistRefreshJti(sub, (jwt.decode(refreshToken) as jwt.JwtPayload)?.jti as string, REFRESH_TTL_SECONDS);

    const res = NextResponse.json({ ok: true });
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
    res.cookies.set(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: "strict",
      secure,
      path: "/",
      maxAge: REFRESH_TTL_SECONDS,
    });

    logger.info("[auth/post-login] Tokens issued successfully", {
      userId: sub,
      hasOrgId: !!user?.orgId,
      hasRole: !!user?.professional?.role,
    });
    return res;
  } catch (_error) {
    logger.error("[auth/post-login] Unexpected error", { error: String(_error) });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
