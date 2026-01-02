/**
 * @module app/api/superadmin/mfa-approvals/route
 * @description API for managing MFA approval tokens
 * 
 * Allows superadmins to issue time-limited approval tokens for MFA operations
 * (disable/reset/bypass) when users have lost access to their authenticator.
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { 
  createMFAApprovalToken, 
  MFAApprovalToken,
} from "@/server/models/MFAApprovalToken";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";
import { ObjectId } from "mongodb";

/**
 * GET /api/superadmin/mfa-approvals
 * List MFA approval tokens (with pagination)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const status = searchParams.get("status"); // pending, used, expired, revoked
    const targetUserId = searchParams.get("targetUserId");
    const orgId = searchParams.get("orgId");

    // Build query
    const query: Record<string, unknown> = {};
    
    if (orgId) {
      query.orgId = orgId;
    }

    if (targetUserId) {
      query.targetUserId = new ObjectId(targetUserId);
    }

    if (status === "pending") {
      query.used = false;
      query.revoked = false;
      query.expiresAt = { $gt: new Date() };
    } else if (status === "used") {
      query.used = true;
    } else if (status === "expired") {
      query.used = false;
      query.revoked = false;
      query.expiresAt = { $lte: new Date() };
    } else if (status === "revoked") {
      query.revoked = true;
    }

    const [tokens, total] = await Promise.all([
      MFAApprovalToken.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      MFAApprovalToken.countDocuments(query),
    ]);

    return NextResponse.json({
      tokens,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error("[MFA Approvals] Failed to list tokens", { error });
    return NextResponse.json(
      { error: "Failed to list MFA approval tokens" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/superadmin/mfa-approvals
 * Create a new MFA approval token
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      orgId,
      targetUserId,
      action,
      justification,
      ticketReference,
      expiryMinutes,
    } = body;

    // Validate required fields
    if (!orgId || !targetUserId || !action || !justification) {
      return NextResponse.json(
        { error: "Missing required fields: orgId, targetUserId, action, justification" },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = ["disable_mfa", "reset_mfa", "bypass_mfa"];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Must be one of: ${validActions.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate justification length
    if (justification.length < 10) {
      return NextResponse.json(
        { error: "Justification must be at least 10 characters" },
        { status: 400 }
      );
    }

    // Get target user's email
    const db = await getDatabase();
    const targetUser = await db.collection("users").findOne({
      _id: new ObjectId(targetUserId),
      orgId,
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    // Create the approval token
    const result = await createMFAApprovalToken({
      orgId,
      targetUserId,
      targetUserEmail: targetUser.email || targetUser.username || "unknown",
      action,
      issuedBy: session.username,
      issuedByEmail: session.username,
      issuedByRole: "superadmin",
      justification,
      ticketReference,
      expiryMinutes: expiryMinutes || 15,
    });

    logger.info("[MFA Approvals] Token created", {
      orgId,
      targetUserId,
      action,
      issuedBy: session.username,
      expiresAt: result.expiresAt,
    });

    return NextResponse.json({
      success: true,
      token: result.token,
      expiresAt: result.expiresAt,
      message: "MFA approval token created successfully. Provide this token to the user.",
    });
  } catch (error) {
    logger.error("[MFA Approvals] Failed to create token", { error });
    return NextResponse.json(
      { error: "Failed to create MFA approval token" },
      { status: 500 }
    );
  }
}
