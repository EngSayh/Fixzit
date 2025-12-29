/**
 * @fileoverview MFA Status API Route
 * @route GET /api/auth/mfa/status
 * 
 * Get MFA status for the authenticated user.
 * 
 * @author [AGENT-001-A]
 * @created 2025-12-28
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { getMFAStatus, disableMFA, regenerateRecoveryCodes } from "@/lib/auth/mfaService";

/**
 * GET /api/auth/mfa/status
 * 
 * Returns the MFA status for the current user.
 */
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-001", message: "Unauthorized" } },
        { status: 401 }
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
    
    if (!userId || typeof userId !== "string" || userId.trim() === "") {
      logger.warn("MFA status request with missing user ID", { orgId });
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-003", message: "User ID required" } },
        { status: 400 }
      );
    }
    
    const status = await getMFAStatus(orgId, userId as string);
    
    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error("MFA status error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    
    return NextResponse.json(
      { error: { code: "FIXZIT-AUTH-500", message: "Internal server error" } },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/mfa/status
 * 
 * Disable MFA for the current user.
 * 
 * Body:
 * {
 *   code: string // Current TOTP code for verification
 * }
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-001", message: "Unauthorized" } },
        { status: 401 }
      );
    }
    
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-003", message: "Invalid JSON body" } },
        { status: 400 }
      );
    }
    
    const { code } = body as { code?: string };
    
    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-002", message: "Verification code required" } },
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
    
    const result = await disableMFA(
      orgId,
      userId,
      email,
      code,
      userId, // Self-disabling
      ipAddress
    );
    
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-003", message: result.error } },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: "MFA disabled successfully",
    });
  } catch (error) {
    logger.error("MFA disable error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    
    return NextResponse.json(
      { error: { code: "FIXZIT-AUTH-500", message: "Internal server error" } },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/auth/mfa/status
 * 
 * Regenerate recovery codes.
 * 
 * Body:
 * {
 *   code: string // Current TOTP code for verification
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-001", message: "Unauthorized" } },
        { status: 401 }
      );
    }
    
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-003", message: "Invalid JSON body" } },
        { status: 400 }
      );
    }
    
    const { code } = body as { code?: string };
    
    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-002", message: "Verification code required" } },
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
    
    const result = await regenerateRecoveryCodes(
      orgId,
      userId,
      email,
      code,
      ipAddress
    );
    
    if (!result.success) {
      return NextResponse.json(
        { error: { code: "FIXZIT-AUTH-003", message: result.error } },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        recoveryCodes: result.codes,
      },
    });
  } catch (error) {
    logger.error("MFA regenerate codes error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    
    return NextResponse.json(
      { error: { code: "FIXZIT-AUTH-500", message: "Internal server error" } },
      { status: 500 }
    );
  }
}
