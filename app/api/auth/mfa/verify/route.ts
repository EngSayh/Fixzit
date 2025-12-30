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
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { verifyMFACode, MFAMethod, trustDevice as trustDeviceFn } from "@/lib/auth/mfaService";

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
  // Rate limit: 5 requests per minute per IP to prevent brute-force code guessing
  const rateLimited = enforceRateLimit(request, {
    keyPrefix: "auth:mfa:verify",
    requests: 5,
    windowMs: 60_000,
  });
  if (rateLimited) return rateLimited;

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
    
    const orgId = session.user.orgId;
    if (!orgId || typeof orgId !== "string" || orgId.trim() === "") {
      // Return 400 Bad Request for missing session fields (consistent with userId check below)
      return NextResponse.json(
        { error: { code: "FIXZIT-TENANT-001", message: "Organization required" } },
        { status: 400 }
      );
    }
    const userId = typeof session.user.id === "string" ? session.user.id.trim() : "";
    if (!userId) {
      logger.warn("[MFA Verify] Missing or invalid userId on session", {
        hasUser: !!session.user,
        orgId,
      });
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-400", message: "User ID required" } },
        { status: 400 }
      );
    }
    const email = session.user.email || "";
    // Note: request.ip is only available in Edge runtime; Node.js runtime uses headers
    const ipAddress = (request as unknown as { ip?: string }).ip ??
                      (request.headers.get("x-forwarded-for")?.split(",")[0] || 
                      request.headers.get("x-real-ip") || 
                      "unknown");
    
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
    
    // Optionally trust device - wrapped in try-catch to not fail MFA verification
    if (body.trustDevice && body.deviceId) {
      try {
        await trustDeviceFn(
          orgId,
          userId,
          body.deviceId,
          body.deviceName || "Unknown Device"
        );
      } catch (trustError) {
        // Log error but don't fail the MFA verification
        logger.warn("Failed to trust device after MFA verification", {
          orgId,
          userId,
          deviceId: body.deviceId,
          error: trustError instanceof Error ? trustError.message : "Unknown error",
        });
      }
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
