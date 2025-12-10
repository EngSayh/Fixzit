/**
 * Admin Notification History API
 * GET /api/admin/notifications/history
 *
 * Fetch notification history for audit and tracking
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { COLLECTIONS } from "@/lib/db/collections";
import { smartRateLimit, buildOrgAwareRateLimitKey } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { ObjectId } from "mongodb";
import { audit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    // Authentication check
    const session = await auth();

    if (!session?.user) {
      await audit({
        actorId: "anonymous",
        actorEmail: "anonymous",
        action: "admin.notifications.history.unauthenticated",
        orgId: "unknown",
        success: false,
      });
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Super admin check
    if (session.user.role !== "SUPER_ADMIN") {
      await audit({
        actorId: session.user.id || "unknown",
        actorEmail: session.user.email || "unknown",
        actorRole: session.user.role,
        action: "admin.notifications.history.forbidden",
        orgId: (session.user as { orgId?: string }).orgId || "unknown",
        success: false,
      });
      return NextResponse.json(
        { success: false, error: "Forbidden: Super Admin access required" },
        { status: 403 },
      );
    }

    const orgIdString =
      (session.user as { orgId?: string; tenantId?: string }).orgId ||
      (session.user as { tenantId?: string }).tenantId ||
      "";
    if (!orgIdString) {
      await audit({
        actorId: session.user.id || "unknown",
        actorEmail: session.user.email || "unknown",
        actorRole: session.user.role,
        action: "admin.notifications.history.missingOrg",
        orgId: "unknown",
        success: false,
      });
      return NextResponse.json(
        { success: false, error: "Missing organization context" },
        { status: 400 },
      );
    }

    const orgId = ObjectId.isValid(orgIdString) ? new ObjectId(orgIdString) : null;
    if (!orgId) {
      await audit({
        actorId: session.user.id || "unknown",
        actorEmail: session.user.email || "unknown",
        actorRole: session.user.role,
        action: "admin.notifications.history.invalidOrg",
        orgId: orgIdString || "unknown",
        success: false,
      });
      return NextResponse.json(
        { success: false, error: "Invalid organization context" },
        { status: 400 },
      );
    }

    // Rate limiting with org-aware key
    const rlKey = buildOrgAwareRateLimitKey(req, orgIdString, session.user.id ?? null);
    const rl = await smartRateLimit(rlKey, 100, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const limitParam = Number.parseInt(searchParams.get("limit") || "", 10);
    const skipParam = Number.parseInt(searchParams.get("skip") || "", 10);

    const limit = Math.min(
      Number.isFinite(limitParam) && limitParam > 0 ? limitParam : 50,
      100,
    );
    const skip = Number.isFinite(skipParam) && skipParam >= 0 ? skipParam : 0;

    // Get database connection
    const db = await getDatabase();

    // Scope to orgId to prevent cross-tenant access; Super Admin is still org-bound
    const notifications = await db
      .collection(COLLECTIONS.ADMIN_NOTIFICATIONS)
      .find({ orgId })
      .sort({ sentAt: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();

    const total = await db
      .collection(COLLECTIONS.ADMIN_NOTIFICATIONS)
      .countDocuments({ orgId });

    logger.info("[Admin Notification] History fetched", {
      user: session.user.email,
      orgId: orgIdString,
      count: notifications.length,
      total,
    });

    await audit({
      actorId: session.user.id || "unknown",
      actorEmail: session.user.email || "unknown",
      actorRole: session.user.role,
      action: "admin.notifications.history.view",
      orgId: orgIdString,
      meta: {
        count: notifications.length,
        total,
        limit,
        skip,
      },
      success: true,
    });

    return NextResponse.json({
      success: true,
      data: notifications,
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + notifications.length < total,
      },
    });
  } catch (error) {
    logger.error("[Admin Notification] History fetch failed", error as Error);
    await audit({
      actorId: "system",
      actorEmail: "system",
      action: "admin.notifications.history.error",
      orgId: "unknown",
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch history",
      },
      { status: 500 },
    );
  }
}
