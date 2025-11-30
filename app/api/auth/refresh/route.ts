import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import jwt from "jsonwebtoken";

export const REFRESH_COOKIE = "fxz.refresh";
export const ACCESS_COOKIE = "fxz.access";
export const ACCESS_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Refresh endpoint: revalidates session and issues a fresh short-lived JWT
 * signed with NEXTAUTH_SECRET for clients that need a renewed token.
 * Also sets an httpOnly access cookie for client-side fetchers that rely on it.
 * 
 * UPGRADED: Uses NextAuth v5 `auth()` API instead of deprecated `getServerSession()`.
 */
export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
    if (!refreshToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const secret = process.env.NEXTAUTH_SECRET;
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
    const newRefresh = jwt.sign(
      {
        sub: session.user?.id,
        // Add jti (JWT ID) for potential blacklisting in future
        jti: crypto.randomUUID(),
      },
      secret,
      { expiresIn: REFRESH_TTL_SECONDS },
    );

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
    logger.error("[auth/refresh] Error", { error });
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}
