/**
 * Enhanced CORS middleware with monitoring
 * Updates middleware.ts CORS handling
 */

import { NextRequest, NextResponse } from "next/server";
import {
  isOriginAllowed,
  resolveAllowedOrigin,
} from "@/lib/security/cors-allowlist";
import { trackCorsViolation } from "@/lib/security/monitoring";

export function handleCorsRequest(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  const pathname = new URL(request.url).pathname;

  // Check if origin is allowed
  if (origin && !isOriginAllowed(origin)) {
    // Track CORS violation for monitoring
    trackCorsViolation(origin, pathname);

    return new NextResponse("Forbidden: Origin not allowed", {
      status: 403,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  // Origin is allowed - add CORS headers
  const allowedOrigin = resolveAllowedOrigin(origin);

  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": allowedOrigin || "*",
        "Access-Control-Allow-Methods":
          "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, X-Tenant-ID, X-Org-ID",
        "Access-Control-Max-Age": "86400",
        "Access-Control-Allow-Credentials": "true",
      },
    });
  }

  return null;
}

export function addCorsHeaders(
  response: NextResponse,
  origin: string | null,
): NextResponse {
  const allowedOrigin = resolveAllowedOrigin(origin);

  if (allowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", allowedOrigin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }

  return response;
}
