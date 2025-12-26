/**
 * Superadmin Cookie Check Endpoint
 * Simple endpoint to verify if the cookie is being sent by the browser
 * 
 * @module app/api/superadmin/check-cookie/route
 */

import { NextRequest, NextResponse } from "next/server";
import { SUPERADMIN_COOKIE_NAME } from "@/lib/superadmin/auth.edge";

export const runtime = "edge"; // Force Edge Runtime to match middleware

export async function GET(request: NextRequest) {
  const allCookies = request.cookies.getAll();
  const superadminCookie = request.cookies.get(SUPERADMIN_COOKIE_NAME);
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    runtime: "edge",
    cookies: {
      total: allCookies.length,
      names: allCookies.map(c => c.name),
      hasSuperadminCookie: !!superadminCookie,
      superadminCookieLength: superadminCookie?.value?.length || 0,
      // Show first/last 10 chars of token for debugging (safe)
      superadminCookiePreview: superadminCookie?.value 
        ? `${superadminCookie.value.slice(0, 10)}...${superadminCookie.value.slice(-10)}`
        : null,
    },
    headers: {
      cookie: request.headers.get("cookie")?.slice(0, 100) || null,
    },
  }, {
    headers: { "X-Robots-Tag": "noindex, nofollow" },
  });
}
