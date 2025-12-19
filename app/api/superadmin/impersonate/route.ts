/**
 * @fileoverview Superadmin Impersonation API
 * @description POST/DELETE endpoints for setting/clearing organization impersonation context
 * @route POST /api/superadmin/impersonate - Set support_org_id cookie
 * @route DELETE /api/superadmin/impersonate - Clear support_org_id cookie
 * @access Superadmin only
 * @module api/superadmin/impersonate
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { z } from "zod";

const ImpersonateSchema = z.object({
  orgId: z.string().min(1, "Organization ID is required"),
});

/**
 * POST /api/superadmin/impersonate
 * Set organization impersonation context (support_org_id cookie)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify superadmin session
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const validation = ImpersonateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid organization ID" },
        { status: 400 }
      );
    }

    const { orgId } = validation.data;

    // Log impersonation action for audit trail
    logger.info("Superadmin impersonation context set", {
      superadminUsername: session.username,
      targetOrgId: orgId,
      timestamp: new Date().toISOString(),
      ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown",
    });

    // Set secure cookie (same settings as superadmin session)
    const response = NextResponse.json({
      success: true,
      message: "Impersonation context set",
      orgId,
    });

    response.cookies.set("support_org_id", orgId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours (same as superadmin session)
    });

    return response;
  } catch (error) {
    logger.error("Failed to set impersonation context", { error });
    return NextResponse.json(
      { error: "Failed to set impersonation context" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/superadmin/impersonate
 * Clear organization impersonation context (remove support_org_id cookie)
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify superadmin session
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401 }
      );
    }

    const currentOrgId = request.cookies.get("support_org_id")?.value;

    // Log impersonation clear for audit trail
    logger.info("Superadmin impersonation context cleared", {
      superadminUsername: session.username,
      previousOrgId: currentOrgId || "none",
      timestamp: new Date().toISOString(),
    });

    // Clear cookie
    const response = NextResponse.json({
      success: true,
      message: "Impersonation context cleared",
    });

    response.cookies.delete("support_org_id");

    return response;
  } catch (error) {
    logger.error("Failed to clear impersonation context", { error });
    return NextResponse.json(
      { error: "Failed to clear impersonation context" },
      { status: 500 }
    );
  }
}
