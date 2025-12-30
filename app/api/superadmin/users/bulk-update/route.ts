/**
 * @fileoverview Superadmin Bulk User Update API
 * @description POST endpoint for updating multiple users at once
 * @route POST /api/superadmin/users/bulk-update
 * @access Superadmin only
 * @module api/superadmin/users/bulk-update
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { connectDb } from "@/lib/mongodb-unified";
import { User } from "@/server/models/User";
import { isValidObjectId, Types } from "mongoose";
import { smartRateLimit } from "@/server/security/rateLimit";

const BulkUpdateSchema = z.object({
  userIds: z.array(z.string()).min(1, "At least one user ID is required")
    .refine(
      (ids) => ids.every((id) => isValidObjectId(id)),
      "All user IDs must be valid MongoDB ObjectIds"
    ),
  orgId: z.string().optional().refine(
    (value) => !value || isValidObjectId(value),
    { message: "orgId must be a valid MongoDB ObjectId" }
  ),
  updates: z.object({
    status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED", "PENDING"]).optional(),
  }).refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: "At least one update field is required" }
  ),
});

/**
 * POST /api/superadmin/users/bulk-update
 * Update multiple users' status or other fields
 */
export async function POST(request: NextRequest) {
  try {
    // Verify superadmin session FIRST (before rate limiting)
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401 }
      );
    }

    // Rate limiting for bulk operations - 5 requests per minute (per authenticated session)
    const rl = await smartRateLimit(`superadmin:bulk-update:${session.username}`, 5, 60_000);
    if (!rl.allowed) {
      // Compute remaining seconds from epoch timestamp, with minimum of 1 and fallback to 60
      const remainingSeconds = rl.resetAt 
        ? Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))
        : 60;
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers: { "Retry-After": String(remainingSeconds) } }
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

    const validation = BulkUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    const { userIds, updates } = validation.data;
    const requestedOrgId = validation.data.orgId?.trim();

    // Connect to database
    await connectDb();

    // Resolve org scope from selected users (superadmin can see all tenants)
    // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Cross-tenant validation for bulk scope
    const matchedUsers = await User.find({
      _id: { $in: userIds },
    }).select("_id orgId isSuperAdmin").lean() as Array<{
      _id: Types.ObjectId;
      orgId?: Types.ObjectId;
      isSuperAdmin?: boolean;
    }>;

    if (matchedUsers.length === 0) {
      return NextResponse.json(
        { error: "No matching users found" },
        { status: 404 }
      );
    }

    if (matchedUsers.some((user) => !user.orgId)) {
      return NextResponse.json(
        { error: "All users must have an organization scope" },
        { status: 400 }
      );
    }

    const superadminUsers = matchedUsers.filter((user) => user.isSuperAdmin);
    if (superadminUsers.length > 0) {
      const superadminIds = superadminUsers.map((u) => u._id.toString());
      logger.warn("Attempted bulk update on SUPERADMIN accounts blocked", {
        superadminUsername: session.username,
        blockedIds: superadminIds,
      });
      return NextResponse.json(
        {
          error: "Cannot bulk update SUPERADMIN accounts",
          blockedIds: superadminIds,
        },
        { status: 400 }
      );
    }

    const orgIds = new Set(
      matchedUsers.map((user) => user.orgId?.toString()).filter(Boolean),
    );

    if (requestedOrgId) {
      if (orgIds.size !== 1 || !orgIds.has(requestedOrgId)) {
        return NextResponse.json(
          { error: "Selected users do not match the requested organization" },
          { status: 400 }
        );
      }
    } else if (orgIds.size !== 1) {
      return NextResponse.json(
        { error: "Bulk update requires users from a single organization" },
        { status: 400 }
      );
    }

    const targetOrgId = requestedOrgId ?? Array.from(orgIds)[0];
    const targetOrgObjectId = new Types.ObjectId(targetOrgId);

    // Add audit trail fields
    const auditedUpdates = {
      ...updates,
      updatedBy: session.username,
      updatedAt: new Date(),
    };

    // Perform bulk update with audit trail (defense-in-depth: exclude superadmins again)
    const result = await User.updateMany(
      { _id: { $in: userIds }, orgId: targetOrgObjectId, isSuperAdmin: { $ne: true } },
      { $set: auditedUpdates }
    );

    logger.info("Bulk user update completed", {
      superadminUsername: session.username,
      orgId: targetOrgId,
      userCount: userIds.length,
      modifiedCount: result.modifiedCount,
      updates,
    });

    return NextResponse.json({
      success: true,
      message: `Updated ${result.modifiedCount} users`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    logger.error("Failed to bulk update users", { error });
    return NextResponse.json(
      { error: "Failed to update users" },
      { status: 500 }
    );
  }
}
