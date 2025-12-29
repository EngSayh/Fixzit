/**
 * @fileoverview MFA Verify API Route
 * @route POST /api/auth/mfa/verify
 * 
 * Verify MFA code during login or for sensitive operations.
 * 
 * @author [AGENT-001-A]
 * @created 2025-12-28
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { verifyMFACode, MFAMethod } from "@/lib/auth/mfaService";

/**
 * POST /api/auth/mfa/verify
 * 
 * Body:
 * {
 *   code: string,
 *   method?: "TOTP" | "RECOVERY",
 *   trustDevice?: boolean,
 *   deviceId?: string,
 *   deviceName?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-001", message: "Unauthorized" } },
        { status: 401 }
      );
    }
    
    let body: { code?: string; method?: string; trustDevice?: boolean; deviceId?: string; deviceName?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-002", message: "Invalid or malformed JSON body" } },
        { status: 400 }
      );
    }
    
    const { code, method = "TOTP" } = body;
    
    if (!code) {
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-002", message: "Verification code required" } },
        { status: 400 }
      );
    }
    
    const orgId = session.user.orgId || "default";
    const userId = session.user.id;
    const email = session.user.email || "";
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] || 
                      request.headers.get("x-real-ip") || 
                      "unknown";
    
    const mfaMethod = method === "RECOVERY" ? MFAMethod.RECOVERY : MFAMethod.TOTP;
    
    const result = await verifyMFACode(
      orgId,
      userId,
      email,
      code,
      mfaMethod,
      ipAddress
    );
    
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-003", message: result.error } },
        { status: 400 }
      );
    }
    
    // Optionally trust device
    if (body.trustDevice && body.deviceId) {
      const { trustDevice: trustDeviceFn } = await import("@/lib/auth/mfaService");
      await trustDeviceFn(
        orgId,
        userId,
        body.deviceId,
        body.deviceName || "Unknown Device"
      );
    }
    
    return NextResponse.json({
      success: true,
      verified: true,
      recoveryCodeUsed: result.recoveryCodeUsed,
    });
  } catch (error) {
    logger.error("MFA verify error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    
    return NextResponse.json(
      { error: { code: "FIXZIT-AUTH-500", message: "Internal server error" } },
      { status: 500 }
    );
  }
}
