/**
 * @fileoverview MFA Setup API Route
 * @route POST /api/auth/mfa/setup
 * 
 * Initialize or complete MFA setup for the authenticated user.
 * 
 * @author [AGENT-001-A]
 * @created 2025-12-28
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import {
  initMFASetup,
  completeMFASetup,
  MFAMethod,
} from "@/lib/auth/mfaService";

/**
 * POST /api/auth/mfa/setup
 * 
 * Body (init):
 * {
 *   action: "init",
 *   method?: "TOTP" | "SMS" | "EMAIL"
 * }
 * 
 * Body (complete):
 * {
 *   action: "complete",
 *   code: string,
 *   recoveryCodes: string[]
 * }
 */
export async function POST(request: NextRequest) {
  // Rate limit: 10 requests per minute per IP to prevent brute-force
  const rateLimited = enforceRateLimit(request, {
    keyPrefix: "auth:mfa:setup",
    requests: 10,
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
    
    let body: { action?: string; method?: string; code?: string; recoveryCodes?: string[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-400", message: "Invalid JSON body" } },
        { status: 400 }
      );
    }
    
    const { action } = body;
    
    if (!action) {
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-400", message: "Missing required field: action" } },
        { status: 400 }
      );
    }
    
    const orgId = session.user.orgId;
    if (!orgId || typeof orgId !== "string" || orgId.trim() === "") {
      return NextResponse.json(
        { error: { code: "FIXZIT-TENANT-001", message: "Organization required" } },
        { status: 403 }
      );
    }
    const userId = typeof session.user.id === "string" ? session.user.id.trim() : "";
    if (!userId) {
      logger.warn("[MFA Setup] Missing or invalid userId on session", {
        hasUser: !!session.user,
        orgId,
      });
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-400", message: "User ID required" } },
        { status: 400 }
      );
    }
    const email = session.user.email || "";
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] || 
                      request.headers.get("x-real-ip") || 
                      "unknown";
    
    if (action === "init") {
      // Validate MFA method against enum to prevent invalid values
      const validMethods = Object.values(MFAMethod);
      const method = validMethods.includes(body.method as MFAMethod) 
        ? (body.method as MFAMethod) 
        : MFAMethod.TOTP;
      
      const result = await initMFASetup(orgId, userId, email, method);
      
      if (!result.success) {
        return NextResponse.json(
          { error: { code: "FIXZIT-AUTH-002", message: result.error ?? "Unknown error initializing MFA setup" } },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        {
          success: true,
          data: {
            secret: result.secret,
            qrCodeUrl: result.qrCodeUrl,
            recoveryCodes: result.recoveryCodes,
          },
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, private",
            "Pragma": "no-cache",
          },
        }
      );
    }
    
    if (action === "complete") {
      const { code, recoveryCodes } = body;
      
      if (!code || !recoveryCodes || !Array.isArray(recoveryCodes)) {
        return NextResponse.json(
          { error: { code: "FIXZIT-AUTH-003", message: "Missing code or recovery codes" } },
          { status: 400 }
        );
      }
      
      // Validate recovery codes array is non-empty and contains only valid strings
      if (recoveryCodes.length === 0) {
        return NextResponse.json(
          { error: { code: "FIXZIT-AUTH-003", message: "Recovery codes array cannot be empty" } },
          { status: 400 }
        );
      }
      
      const invalidCodes = recoveryCodes.some(c => typeof c !== "string" || c.trim().length === 0);
      if (invalidCodes) {
        return NextResponse.json(
          { error: { code: "FIXZIT-AUTH-003", message: "All recovery codes must be non-empty strings" } },
          { status: 400 }
        );
      }
      
      // Sanitize recovery codes (trim whitespace)
      const sanitizedRecoveryCodes = recoveryCodes.map(c => c.trim());
      
      const result = await completeMFASetup(
        orgId,
        userId,
        email,
        code,
        sanitizedRecoveryCodes,
        ipAddress
      );
      
      if (!result.success) {
        return NextResponse.json(
          { error: { code: "FIXZIT-AUTH-004", message: result.error ?? "Unknown error while completing MFA setup" } },
          { status: 400 }
        );
      }
      
      return NextResponse.json({
        success: true,
        message: "MFA enabled successfully",
      });
    }
    
    return NextResponse.json(
      { error: { code: "FIXZIT-AUTH-005", message: "Invalid action" } },
      { status: 400 }
    );
  } catch (error) {
    logger.error("MFA setup error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    
    return NextResponse.json(
      { error: { code: "FIXZIT-AUTH-500", message: "Internal server error" } },
      { status: 500 }
    );
  }
}
