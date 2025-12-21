/**
 * @description Fetches notification broadcast history for superadmin.
 * Returns paginated list of all notifications across tenants.
 * @route GET /api/superadmin/notifications/history
 * @access Private - Superadmin session required
 */
import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { COLLECTIONS } from "@/lib/db/collections";

export async function GET(req: NextRequest) {
  try {
    // Superadmin session check
    const session = await getSuperadminSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const channel = searchParams.get("channel");
    const skip = (page - 1) * limit;

    const db = await getDatabase();
    const collection = db.collection(COLLECTIONS.NOTIFICATIONS);

    // Build query - superadmin sees all notifications across tenants
    const query: Record<string, unknown> = {};
    if (channel && channel !== "all") {
      query["channelResults.channel"] = channel;
    }

    const [notifications, total] = await Promise.all([
      collection
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      notifications,
      total,
      page,
      pages: Math.ceil(total / limit),
      limit,
    });
  } catch (error) {
    logger.error("[SUPERADMIN] Notifications history error", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}
