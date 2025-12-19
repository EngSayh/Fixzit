/**
 * @fileoverview Superadmin Impersonation Status API
 * @description GET endpoint to check if impersonation context is active
 * @route GET /api/superadmin/impersonate/status
 * @access Superadmin only
 * @module api/superadmin/impersonate/status
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";

/**
 * GET /api/superadmin/impersonate/status
 * Check if impersonation context is active
 */
export async function GET(request: NextRequest) {
  try {
    // Verify superadmin session
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401 }
      );
    }

    const orgId = request.cookies.get("support_org_id")?.value || null;

    return NextResponse.json({
      success: true,
      active: !!orgId,
      orgId,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to check impersonation status" },
      { status: 500 }
    );
  }
}
