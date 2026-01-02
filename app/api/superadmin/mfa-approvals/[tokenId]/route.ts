/**
 * @module app/api/superadmin/mfa-approvals/[tokenId]/route
 * @description API for managing individual MFA approval tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { 
  MFAApprovalToken,
  revokeMFAApprovalToken,
} from "@/server/models/MFAApprovalToken";
import { logger } from "@/lib/logger";

interface RouteParams {
  params: Promise<{ tokenId: string }>;
}

/**
 * GET /api/superadmin/mfa-approvals/[tokenId]
 * Get details of a specific MFA approval token
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tokenId } = await params;

    const token = await MFAApprovalToken.findOne({ tokenId }).lean();

    if (!token) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    // Compute status
    let status = "pending";
    if (token.revoked) {
      status = "revoked";
    } else if (token.used) {
      status = "used";
    } else if (new Date() > new Date(token.expiresAt)) {
      status = "expired";
    }

    return NextResponse.json({
      ...token,
      computedStatus: status,
    });
  } catch (error) {
    logger.error("[MFA Approvals] Failed to get token", { error });
    return NextResponse.json(
      { error: "Failed to get MFA approval token" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/superadmin/mfa-approvals/[tokenId]
 * Revoke an MFA approval token
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tokenId } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason } = body as { reason?: string };

    // Get the token to find its orgId
    const token = await MFAApprovalToken.findOne({ tokenId }).lean();
    
    if (!token) {
      return NextResponse.json({ error: "Token not found" }, { status: 404 });
    }

    if (token.used) {
      return NextResponse.json(
        { error: "Cannot revoke a token that has already been used" },
        { status: 400 }
      );
    }

    if (token.revoked) {
      return NextResponse.json(
        { error: "Token is already revoked" },
        { status: 400 }
      );
    }

    const revoked = await revokeMFAApprovalToken({
      tokenId,
      orgId: token.orgId,
      revokedBy: session.username,
      reason: reason || "Revoked by superadmin",
    });

    if (!revoked) {
      return NextResponse.json(
        { error: "Failed to revoke token" },
        { status: 500 }
      );
    }

    logger.info("[MFA Approvals] Token revoked", {
      tokenId,
      revokedBy: session.username,
      reason,
    });

    return NextResponse.json({
      success: true,
      message: "Token revoked successfully",
    });
  } catch (error) {
    logger.error("[MFA Approvals] Failed to revoke token", { error });
    return NextResponse.json(
      { error: "Failed to revoke MFA approval token" },
      { status: 500 }
    );
  }
}
