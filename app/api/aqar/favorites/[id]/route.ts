/**
 * @description Removes a property or project from user's favorites.
 * Only the favorite owner can delete their own favorites.
 * @route DELETE /api/aqar/favorites/[id]
 * @access Private - Authenticated users (favorite owner only)
 * @param {string} id - The favorite record ID to remove
 * @returns {Object} success: true if removed successfully
 * @throws {401} If user is not authenticated
 * @throws {403} If user is not the favorite owner
 * @throws {404} If favorite not found
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectDb } from "@/lib/mongo";
import { AqarFavorite, AqarListing, AqarProject } from "@/server/models/aqar";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

import mongoose from "mongoose";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> },
) {
  // Rate limiting: 20 requests per minute per IP for deletes
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "aqar:favorites:delete",
    requests: 20,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await connectDb();

    const { id } = await params;

    // Handle authentication separately to return 401 instead of 500
    let user;
    try {
      user = await getSessionUser(request);
    } catch (authError) {
      // Log only sanitized error message to avoid exposing sensitive data
      logger.error(
        "Authentication failed:",
        authError instanceof Error ? authError.message : "Unknown error",
      );
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user || !user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // SEC-FIX: Require orgId - never fall back to userId to prevent cross-tenant data access
    if (!user.orgId) {
      return NextResponse.json(
        { error: "orgId is required (STRICT v4.1 tenant isolation)" },
        { status: 400 },
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid favorite ID" },
        { status: 400 },
      );
    }

    const favorite = await AqarFavorite.findOne({
      _id: id,
      orgId: user.orgId,
      userId: user.id,
    });

    if (!favorite) {
      return NextResponse.json(
        { error: "Favorite not found" },
        { status: 404 },
      );
    }

    // Check ownership
    if (favorite.userId.toString() !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete favorite first
    // eslint-disable-next-line local/require-tenant-scope -- SAFE: deleteOne on already-scoped favorite (line 77)
    await favorite.deleteOne();

    // Decrement analytics after successful deletion (with error handling)
    if (favorite.targetType === "LISTING") {
      try {
        await AqarListing.findByIdAndUpdate(favorite.targetId, [
          {
            $set: {
              "analytics.favorites": {
                $max: [{ $subtract: ["$analytics.favorites", 1] }, 0],
              },
              "analytics.lastUpdatedAt": new Date(),
            },
          },
        ]);
      } catch (analyticsError) {
        // Log analytics error but don't fail the request (deletion already succeeded)
        logger.error("Failed to decrement listing favorites analytics", {
          targetId: favorite.targetId.toString(),
          message:
            analyticsError instanceof Error
              ? analyticsError.message
              : "Unknown error",
        });
      }
    } else if (favorite.targetType === "PROJECT") {
      try {
        await AqarProject.findByIdAndUpdate(favorite.targetId, [
          {
            $set: {
              "analytics.favorites": {
                $max: [{ $subtract: ["$analytics.favorites", 1] }, 0],
              },
              "analytics.lastUpdatedAt": new Date(),
            },
          },
        ]);
      } catch (analyticsError) {
        // Log analytics error but don't fail the request (deletion already succeeded)
        logger.error("Failed to decrement project favorites analytics", {
          targetId: favorite.targetId.toString(),
          message:
            analyticsError instanceof Error
              ? analyticsError.message
              : "Unknown error",
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Error deleting favorite:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return NextResponse.json(
      { error: "Failed to delete favorite" },
      { status: 500 },
    );
  }
}
