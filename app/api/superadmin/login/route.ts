/**
 * Superadmin Login API
 * Authenticates superadmin users with separate credentials
 * 
 * @module app/api/superadmin/login/route
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
import { logger } from "@/lib/logger";

// Environment variables for superadmin auth
const SUPERADMIN_USERNAME = process.env.SUPERADMIN_USERNAME || "superadmin";
const SUPERADMIN_PASSWORD_HASH = process.env.SUPERADMIN_PASSWORD_HASH || "";
const SUPERADMIN_JWT_SECRET = process.env.SUPERADMIN_JWT_SECRET || process.env.NEXTAUTH_SECRET || "default-secret-change-in-production";

// Simple JWT-like token generation (for superadmin session)
function generateToken(username: string): string {
  const payload = {
    sub: username,
    role: "superadmin",
    iat: Date.now(),
    exp: Date.now() + 8 * 60 * 60 * 1000, // 8 hours
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", SUPERADMIN_JWT_SECRET)
    .update(payloadStr)
    .digest("base64url");
  return `${payloadStr}.${signature}`;
}

// Hash password for comparison
function hashPassword(password: string): string {
  return createHmac("sha256", SUPERADMIN_JWT_SECRET)
    .update(password)
    .digest("hex");
}

// Safe string comparison
function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password required" },
        { status: 400 }
      );
    }

    // Check username
    if (username !== SUPERADMIN_USERNAME) {
      // Log failed attempt
      logger.warn("[SUPERADMIN] Failed login attempt", { username });
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Check password
    const passwordHash = hashPassword(password);
    
    // If no password hash is configured, use a development fallback
    const expectedHash = SUPERADMIN_PASSWORD_HASH || hashPassword("admin123");
    
    if (!safeCompare(passwordHash, expectedHash)) {
      logger.warn("[SUPERADMIN] Failed password attempt", { username });
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // Generate token
    const token = generateToken(username);

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("superadmin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 8 * 60 * 60, // 8 hours
      path: "/",
    });

    logger.info("[SUPERADMIN] Successful login", { username });

    return NextResponse.json({
      success: true,
      message: "Authenticated successfully",
    });
  } catch (error) {
    logger.error("[SUPERADMIN] Login error", error instanceof Error ? error : new Error(String(error)));
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}
