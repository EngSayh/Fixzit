/**
 * @fileoverview Superadmin Bulk User Delete API
 * @description POST endpoint for deleting multiple users at once
 * @route POST /api/superadmin/users/bulk-delete
 * @access Superadmin only
 * @module api/superadmin/users/bulk-delete
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { connectDb } from "@/lib/mongodb-unified";
import { User } from "@/server/models/User";
import { isValidObjectId } from "mongoose";
import { smartRateLimit } from "@/server/security/rateLimit";

const BulkDeleteSchema = z.object({
  userIds: z.array(
    z.string().refine((id) => isValidObjectId(id), { message: "Invalid ObjectId" })
  ).min(1, "At least one user ID is required"),
});

/**
 * POST /api/superadmin/users/bulk-delete
 * Delete multiple users (soft delete by setting status to DELETED)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify superadmin session first (needed for rate limit key)
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401 }
      );
    }
    
    // Rate limiting for bulk operations - 5 requests per minute per superadmin user
    // Use username instead of IP to prevent false positives from shared office IPs
    const rl = await smartRateLimit(`superadmin:bulk-delete:${session.username}`, 5, 60_000);
    if (!rl.allowed) {
      // Calculate remaining seconds until reset (resetAt is epoch timestamp)
      const retryAfterSeconds = rl.resetAt 
        ? Math.ceil((rl.resetAt - Date.now()) / 1000)
        : 60; // Fallback to 60 seconds
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfterSeconds)) } }
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

    const validation = BulkDeleteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      );
    }

    const { userIds } = validation.data;

    // Connect to database
    await connectDb();

    // Prevent deleting superadmin users
    // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Cross-tenant superadmin check
    const superadmins = await User.find({
      _id: { $in: userIds },
      isSuperAdmin: true,
    }).select({ _id: 1 }).lean();

    if (superadmins.length > 0) {
      const blockedIds = superadmins.map((user) => user._id.toString());
      logger.warn("Blocked bulk delete of superadmin users", {
        superadminUsername: session.username,
        blockedUserIds: blockedIds,
      });
      return NextResponse.json(
        { error: "Cannot delete superadmin users", blockedUserIds: blockedIds },
        { status: 400 }
      );
    }

    // Soft delete - set status to DELETED (or hard delete if needed)
    // Using soft delete for audit trail
    // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Cross-tenant bulk delete
    const result = await User.updateMany(
      { _id: { $in: userIds }, isSuperAdmin: { $ne: true } },
      { 
        $set: { 
          status: "DELETED",
          deletedAt: new Date(),
          deletedBy: session.username,
        } 
      }
    );

    logger.info("Bulk user delete completed", {
      superadminUsername: session.username,
      requestedCount: userIds.length,
      deletedCount: result.modifiedCount,
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${result.modifiedCount} users`,
      deletedCount: result.modifiedCount,
    });
  } catch (error) {
    logger.error("Failed to bulk delete users", { error });
    return NextResponse.json(
      { error: "Failed to delete users" },
      { status: 500 }
    );
  }
}
