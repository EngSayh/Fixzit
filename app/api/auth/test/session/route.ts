/**
 * @description Test-only session minting endpoint for E2E testing.
 * Generates real NextAuth JWT session tokens and sets cookies directly.
 * FORBIDDEN in production environments.
 * @route POST /api/auth/test/session
 * @access Private - Development/test environments only
 * @param {Object} body - email, orgId (optional)
 * @returns {Object} success: true with session cookies set
 * @throws {400} If email is not provided
 * @throws {403} If called in production environment
 * @throws {404} If user not found
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { User } from "@/server/models/User";
import { encode } from "next-auth/jwt";
import { Types } from "mongoose";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  enforceRateLimit(req, { requests: 10, windowMs: 60_000, keyPrefix: "auth:test:session" });
  try {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const jwtSecret =
      process.env.NEXTAUTH_SECRET ||
      process.env.AUTH_SECRET ||
      "test-secret-session";
    // Use string secret directly for NextAuth JWT encode
    const secret = jwtSecret;

    const body = await req
      .json()
      .catch(() => ({}) as { email?: string; orgId?: string });
    const email = typeof body.email === "string" ? body.email.toLowerCase() : "";
    if (!email) {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }

    const resolvedOrgId =
      body.orgId ||
      process.env.PUBLIC_ORG_ID ||
      process.env.DEFAULT_ORG_ID ||
      process.env.TEST_ORG_ID;

    if (!resolvedOrgId) {
      return NextResponse.json(
        { error: "orgId required for test session" },
        { status: 400 },
      );
    }

    try {
      await connectToDatabase();
    } catch (error) {
      logger.error("[auth:test:session] Mongo connection failed", {
        error,
        email,
        orgId: resolvedOrgId,
      });
      return NextResponse.json(
        { error: "Service unavailable" },
        { status: 503 },
      );
    }

    type UserDoc = {
      _id: Types.ObjectId;
      email: string;
      professional?: { role?: string } | null;
      orgId?: Types.ObjectId | string;
      isSuperAdmin?: boolean;
      permissions?: string[];
      roles?: string[];
    };
    
    let user: UserDoc | null = null;
    try {
      user = (await User.findOne({ email, orgId: resolvedOrgId }).lean()) as UserDoc | null;
    } catch (error) {
      logger.error("[auth:test:session] User lookup failed", {
        error,
        email,
        orgId: resolvedOrgId,
      });
      return NextResponse.json(
        { error: "Service unavailable" },
        { status: 503 },
      );
    }

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const fallbackOrg =
      resolvedOrgId ||
      (user?.orgId ? user.orgId.toString() : undefined) ||
      "000000000000000000000001";

    const orgId = Types.ObjectId.isValid(fallbackOrg)
      ? new Types.ObjectId(fallbackOrg)
      : new Types.ObjectId("000000000000000000000001");

    const role = user?.professional?.role || "SUPER_ADMIN";
    const isSuperAdmin = user?.isSuperAdmin ?? true;
    const permissions = user?.permissions ?? ["*"];
    const roles = user?.roles ?? (isSuperAdmin ? ["SUPER_ADMIN", role] : [role]);
    const userId = user?._id?.toString() || new Types.ObjectId().toString();

    const sessionToken = await encode({
      token: {
        id: userId,
        sub: userId,
        email,
        role,
        orgId: orgId.toString(),
        isSuperAdmin,
        permissions,
        roles,
      },
      secret,
      salt: "authjs.session-token",
      maxAge: 15 * 60,
    });

    const host = req.nextUrl.hostname;
    const isHttps = req.nextUrl.protocol === "https:";
    const cookieName = isHttps
      ? "__Secure-authjs.session-token"
      : "authjs.session-token";
    const legacyName = isHttps
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    const resp = NextResponse.json({
      ok: true,
      appliedOrgId: orgId.toString(),
      foundUser: Boolean(user),
    });

    const cookieOpts = {
      path: "/",
      httpOnly: true,
      sameSite: "lax" as const,
      secure: isHttps,
      domain: host === "localhost" ? undefined : host,
    };

    resp.cookies.set(cookieName, sessionToken, cookieOpts);
    resp.cookies.set(legacyName, sessionToken, cookieOpts);

    return resp;
  } catch (_error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
