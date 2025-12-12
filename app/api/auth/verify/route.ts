/**
 * @description Verifies user email address using signed token.
 * Validates the HMAC-signed token and marks user as verified.
 * @route GET /api/auth/verify
 * @access Public
 * @param {string} token - Signed verification token (query param)
 * @returns {Object} success: true, email: string
 * @throws {400} If token is missing or invalid signature
 * @throws {410} If token has expired
 * @throws {500} If NEXTAUTH_SECRET not configured
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { User } from "@/server/models/User";
import { verifyVerificationToken } from "@/lib/auth/emailVerification";
import { UserStatus } from "@/types/user";
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }
    // STRICT v4.1 FIX: Support both NEXTAUTH_SECRET (preferred) and AUTH_SECRET (legacy/Auth.js name)
    // MUST align with auth.config.ts and signup/route.ts to prevent environment drift
    const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
    if (!secret) {
      return NextResponse.json(
        { error: "verification not configured (NEXTAUTH_SECRET or AUTH_SECRET required)" },
        { status: 500 },
      );
    }

    const result = verifyVerificationToken(token, secret);
    if (!result.ok) {
      const status = result.reason === "expired" ? 410 : 400;
      return NextResponse.json(
        { error: "invalid token", reason: result.reason },
        { status },
      );
    }

    // SECURITY: Resolve default organization for public auth flow
    // STRICT v4.1 FIX: In production, ONLY PUBLIC_ORG_ID is allowed to prevent
    // cross-tenant verification (mirrors signup/route.ts scoping rules)
    const resolvedOrgId =
      process.env.PUBLIC_ORG_ID ||
      (process.env.NODE_ENV !== "production" && (process.env.TEST_ORG_ID || process.env.DEFAULT_ORG_ID));

    await connectToDatabase();
    // SECURITY FIX: Scope findOneAndUpdate by orgId to prevent cross-tenant attacks (SEC-001)
    // STRICT v4.1: Also activate user (set status to ACTIVE) when email is verified
    const updateFields = { 
      emailVerifiedAt: new Date(),
      status: UserStatus.ACTIVE, // Activate user upon successful email verification
    };
    const updated = resolvedOrgId
      ? await User.findOneAndUpdate(
          { orgId: resolvedOrgId, email: result.email.toLowerCase() },
          { $set: updateFields },
          { new: true },
        )
          .select("email emailVerifiedAt status")
          .lean()
      : await User.findOneAndUpdate(
          { email: result.email.toLowerCase() },
          { $set: updateFields },
          { new: true },
        )
          .select("email emailVerifiedAt status")
          .lean();

    if (!updated) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, email: updated.email });
  } catch (_error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
