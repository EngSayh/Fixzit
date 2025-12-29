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

const BulkUpdateSchema = z.object({
  userIds: z.array(z.string()).min(1, "At least one user ID is required"),
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

    const validation = BulkUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    const { userIds, updates } = validation.data;

    // Connect to database
    await connectDb();

    // Protect SUPERADMIN accounts from bulk updates (use isSuperAdmin flag like bulk-delete)
    const superadminUsers = await User.find({
      _id: { $in: userIds },
      isSuperAdmin: true,
    }).select("_id").lean();

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

    // Add audit trail fields
    const auditedUpdates = {
      ...updates,
      updatedBy: session.username,
      updatedAt: new Date(),
    };

    // Perform bulk update with audit trail
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $set: auditedUpdates }
    );

    logger.info("Bulk user update completed", {
      superadminUsername: session.username,
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
