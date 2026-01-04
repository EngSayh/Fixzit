/**
 * @description Returns unread/pending notification count for superadmin badge.
 * Lightweight endpoint optimized for frequent polling.
 * @route GET /api/superadmin/notifications/count
 * @access Private - Superadmin session required
 * 
 * @feature Superadmin Notification Badge
 * @issue TODO: Notification count badge for superadmin header
 */
import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { COLLECTIONS } from "@/lib/db/collections";

// 30 second cache for badge count (lightweight polling)
const CACHE_MAX_AGE = 30;

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

    const db = await getDatabase();
    
    // Count pending/unread notifications
    // For superadmin: count all pending notifications across tenants
    const pendingCount = await db.collection(COLLECTIONS.NOTIFICATIONS).countDocuments({
      "channelResults.status": { $in: ["pending", "partial"] },
    });
    
    // Count failed notifications that need attention
    const failedCount = await db.collection(COLLECTIONS.NOTIFICATIONS).countDocuments({
      "channelResults.status": "failed",
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
    });

    // Count MFA approvals pending (important security items)
    const mfaApprovalsCount = await db.collection(COLLECTIONS.MFA_APPROVALS).countDocuments({
      status: "pending",
    }).catch(() => 0); // MFA collection may not exist

    // Total badge count = pending + failed + MFA approvals
    const total = pendingCount + failedCount + mfaApprovalsCount;

    return NextResponse.json(
      {
        success: true,
        count: total,
        breakdown: {
          pending: pendingCount,
          failed: failedCount,
          mfaApprovals: mfaApprovalsCount,
        },
      },
      {
        headers: {
          "Cache-Control": `private, max-age=${CACHE_MAX_AGE}`,
        },
      }
    );
  } catch (error) {
    logger.error("[SUPERADMIN] Notification count error", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch count", count: 0 },
      { status: 500 }
    );
  }
}
