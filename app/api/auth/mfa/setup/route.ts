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
    const userId = session.user.id;
    const email = session.user.email || "";
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] || 
                      request.headers.get("x-real-ip") || 
                      "unknown";
    
    if (action === "init") {
      const method = (body.method as MFAMethod) || MFAMethod.TOTP;
      
      const result = await initMFASetup(orgId, userId, email, method);
      
      if (!result.success) {
        return NextResponse.json(
          { error: { code: "FIXZIT-AUTH-002", message: result.error } },
          { status: 400 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: {
          secret: result.secret,
          qrCodeUrl: result.qrCodeUrl,
          recoveryCodes: result.recoveryCodes,
        },
      });
    }
    
    if (action === "complete") {
      const { code, recoveryCodes } = body;
      
      if (!code || !recoveryCodes || !Array.isArray(recoveryCodes)) {
        return NextResponse.json(
          { error: { code: "FIXZIT-AUTH-003", message: "Missing code or recovery codes" } },
          { status: 400 }
        );
      }
      
      const result = await completeMFASetup(
        orgId,
        userId,
        email,
        code,
        recoveryCodes,
        ipAddress
      );
      
      if (!result.success) {
        return NextResponse.json(
          { error: { code: "FIXZIT-AUTH-004", message: result.error } },
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
