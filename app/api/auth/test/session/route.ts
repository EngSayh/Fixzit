import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { User } from "@/server/models/User";
import { encode } from "next-auth/jwt";
import { Types } from "mongoose";

export const runtime = "nodejs";

/**
 * Test-only session minting endpoint.
 * Generates a real NextAuth JWT session token and sets cookies directly.
 */
export async function POST(req: NextRequest) {
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

  await connectToDatabase().catch(() => {});
  const user = await User.findOne({ email }).lean<{
    _id: Types.ObjectId;
    email: string;
    professional?: { role?: string };
    orgId?: Types.ObjectId | string;
    isSuperAdmin?: boolean;
    permissions?: string[];
    roles?: string[];
  }>().catch(() => null);

  const fallbackOrg =
    body.orgId ||
    (user?.orgId ? user.orgId.toString() : undefined) ||
    process.env.PUBLIC_ORG_ID ||
    process.env.DEFAULT_ORG_ID ||
    process.env.TEST_ORG_ID ||
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
}
