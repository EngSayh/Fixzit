import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { User } from "@/server/models/User";
import { verifyVerificationToken } from "@/lib/auth/emailVerification";

/**
 * Stateless email verification endpoint.
 * Validates a signed token and returns 200 if valid/active, and marks user verified.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "verification not configured" },
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
  const resolvedOrgId =
    process.env.PUBLIC_ORG_ID ||
    process.env.TEST_ORG_ID ||
    process.env.DEFAULT_ORG_ID;

  await connectToDatabase();
  // SECURITY FIX: Scope findOneAndUpdate by orgId to prevent cross-tenant attacks (SEC-001)
  const updated = resolvedOrgId
    ? await User.findOneAndUpdate(
        { orgId: resolvedOrgId, email: result.email.toLowerCase() },
        { $set: { emailVerifiedAt: new Date() } },
        { new: true },
      )
        .select("email emailVerifiedAt")
        .lean()
    : await User.findOneAndUpdate(
        { email: result.email.toLowerCase() },
        { $set: { emailVerifiedAt: new Date() } },
        { new: true },
      )
        .select("email emailVerifiedAt")
        .lean();

  if (!updated) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, email: updated.email });
}
