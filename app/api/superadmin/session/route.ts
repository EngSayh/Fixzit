/**
 * Superadmin Session Verification API
 * Validates superadmin token and returns session info
 * 
 * @module app/api/superadmin/session/route
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac } from "crypto";
import { logger } from "@/lib/logger";

const SUPERADMIN_JWT_SECRET = process.env.SUPERADMIN_JWT_SECRET || process.env.NEXTAUTH_SECRET || "default-secret-change-in-production";

interface TokenPayload {
  sub: string;
  role: string;
  iat: number;
  exp: number;
}

function verifyToken(token: string): TokenPayload | null {
  try {
    const [payloadStr, signature] = token.split(".");
    if (!payloadStr || !signature) return null;

    // Verify signature
    const expectedSignature = createHmac("sha256", SUPERADMIN_JWT_SECRET)
      .update(payloadStr)
      .digest("base64url");
    
    if (signature !== expectedSignature) return null;

    // Decode payload
    const payload = JSON.parse(Buffer.from(payloadStr, "base64url").toString()) as TokenPayload;

    // Check expiration
    if (payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("superadmin_token")?.value;

    if (!token) {
      return NextResponse.json(
        { authenticated: false, error: "No session" },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { authenticated: false, error: "Invalid or expired session" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        username: payload.sub,
        role: payload.role,
      },
      expiresAt: new Date(payload.exp).toISOString(),
    });
  } catch (error) {
    logger.error("[SUPERADMIN] Session check error", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { authenticated: false, error: "Session verification failed" },
      { status: 500 }
    );
  }
}
