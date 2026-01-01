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
import { AuditLogModel } from "@/server/models/AuditLog";
import { connectToDatabase } from "@/lib/mongodb-unified";
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
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Log impersonation action for audit trail
    logger.info("Superadmin impersonation context set", {
      superadminUsername: session.username,
      targetOrgId: orgId,
      timestamp: new Date().toISOString(),
      ip: ipAddress,
    });

    // Persist to AuditLog for compliance (P1 security enhancement)
    try {
      await connectToDatabase();
      await AuditLogModel.create({
        orgId: orgId, // Target org being impersonated
        action: "LOGIN", // Using LOGIN as closest action type for impersonation start
        entityType: "USER",
        entityId: session.username,
        entityName: `Superadmin Impersonation: ${session.username}`,
        userId: session.username, // Superadmin doesn't have a MongoDB user ID
        userName: session.username,
        userEmail: session.username,
        userRole: "SUPER_ADMIN",
        description: `Superadmin ${session.username} started impersonating organization ${orgId}`,
        ipAddress,
        userAgent,
        success: true,
        metadata: {
          impersonationType: "START",
          targetOrgId: orgId,
          superadminUsername: session.username,
        },
      });
    } catch (auditErr) {
      // Don't fail the request if audit logging fails, but log it
      logger.warn("Failed to persist impersonation audit log", { error: auditErr });
    }

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
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";

    // Log impersonation clear for audit trail
    logger.info("Superadmin impersonation context cleared", {
      superadminUsername: session.username,
      previousOrgId: currentOrgId || "none",
      timestamp: new Date().toISOString(),
    });

    // Persist to AuditLog for compliance (P1 security enhancement)
    if (currentOrgId) {
      try {
        await connectToDatabase();
        await AuditLogModel.create({
          orgId: currentOrgId, // Org that was being impersonated
          action: "LOGOUT", // Using LOGOUT as closest action type for impersonation end
          entityType: "USER",
          entityId: session.username,
          entityName: `Superadmin Impersonation End: ${session.username}`,
          userId: session.username,
          userName: session.username,
          userEmail: session.username,
          userRole: "SUPER_ADMIN",
          description: `Superadmin ${session.username} ended impersonation of organization ${currentOrgId}`,
          ipAddress,
          userAgent,
          success: true,
          metadata: {
            impersonationType: "END",
            previousOrgId: currentOrgId,
            superadminUsername: session.username,
          },
        });
      } catch (auditErr) {
        logger.warn("Failed to persist impersonation end audit log", { error: auditErr });
      }
    }

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
