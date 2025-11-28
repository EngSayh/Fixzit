import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import authConfig from "@/auth.config";
import jwt from "jsonwebtoken";
import {
  ACCESS_COOKIE,
  ACCESS_TTL_SECONDS,
  REFRESH_COOKIE,
  REFRESH_TTL_SECONDS,
} from "@/app/api/auth/refresh/route";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authConfig);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const sub = session.user?.id;
  if (!sub || typeof sub !== "string") {
    return NextResponse.json(
      { error: "Invalid session: missing user id" },
      { status: 401 },
    );
  }

  const accessPayload: Record<string, unknown> = { sub };
  if (session.user?.role) accessPayload.role = session.user.role;
  const orgId = (session.user as { orgId?: string })?.orgId;
  if (orgId) accessPayload.orgId = orgId;

  const accessToken = jwt.sign(accessPayload, secret, {
    expiresIn: ACCESS_TTL_SECONDS,
  });

  const refreshToken = jwt.sign({ sub, type: "refresh" }, secret, {
    expiresIn: REFRESH_TTL_SECONDS,
  });

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
  return res;
}
