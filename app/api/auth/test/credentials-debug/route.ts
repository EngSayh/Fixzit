/**
 * @fileoverview Credentials Debug API (Development Only)
 * @description Test endpoint for debugging credentials authentication flow.
 * Simulates NextAuth credentials callback to help diagnose auth issues.
 * @module api/auth/test/credentials-debug
 *
 * @security FORBIDDEN in production - returns 403
 * @security Development-only debugging tool
 *
 * @example
 * // POST /api/auth/test/credentials-debug (dev only)
 * // Body: { identifier: "test@example.com", password: "password" }
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req
    .json()
    .catch(() => ({} as { identifier?: string; email?: string; password?: string; csrfToken?: string }));

  const identifier = body.identifier || body.email;
  const password = body.password;
  const csrfToken = body.csrfToken || "csrf-disabled";

  if (!identifier || !password) {
    return NextResponse.json(
      { error: "identifier and password required" },
      { status: 400 },
    );
  }

  const form = new URLSearchParams({
    identifier,
    password,
    csrfToken,
    rememberMe: "on",
    redirect: "false",
    callbackUrl: "/dashboard",
    json: "true",
  });

  const callbackUrl = new URL("/api/auth/callback/credentials", req.nextUrl.origin);

  const resp = await fetch(callbackUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
    redirect: "manual",
  });

  // Next.js fetch polyfill supports getSetCookie() for multi-cookie responses
  const setCookies =
    (resp.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? undefined;

  return NextResponse.json({
    status: resp.status,
    ok: resp.ok,
    setCookie: resp.headers.get("set-cookie"),
    setCookies,
    headers: Array.from(resp.headers.entries()),
  });
}
