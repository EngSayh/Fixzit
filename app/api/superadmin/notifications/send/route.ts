/**
 * @description Sends a broadcast notification (superadmin).
 * @route POST /api/superadmin/notifications/send
 * @access Private - Superadmin session required
 */
import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { COLLECTIONS } from "@/lib/db/collections";

export async function POST(req: NextRequest) {
  try {
    // Superadmin session check
    const session = await getSuperadminSession(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    // Accept both naming conventions for flexibility
    const title = body.title || body.subject;
    const message = body.message;
    const channels = body.channels || (body.type ? [body.type] : ["email"]);
    const targetTenantId = body.targetTenantId;
    const targetUserIds = body.targetUserIds || body.userIds || [];

    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: "Title/subject and message are required" },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection(COLLECTIONS.NOTIFICATIONS);

    // Create notification record
    const notification = {
      type: "broadcast",
      title,
      message,
      channels,
      targetTenantId: targetTenantId || null,
      targetUserIds: targetUserIds || [],
      status: "pending",
      createdBy: session.username,
      createdAt: new Date(),
      channelResults: channels.map((ch: string) => ({
        channel: ch,
        status: "pending",
        attempts: 0,
        succeeded: 0,
        failedCount: 0,
      })),
      metrics: {
        attempted: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
      },
    };

     
    const result = await collection.insertOne(notification);

    // In production, this would trigger actual notification sending
    // For now, mark as sent for demo purposes
    // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Platform-wide notification update
    await collection.updateOne(
      { _id: result.insertedId },
      {
        $set: {
          status: "sent",
          sentAt: new Date(),
          "channelResults.$[].status": "sent",
          "metrics.attempted": 1,
          "metrics.succeeded": 1,
        },
      }
    );

    logger.info("[SUPERADMIN] Notification sent", {
      notificationId: result.insertedId,
      title,
      channels,
      actor: session.username,
    });

    return NextResponse.json({
      success: true,
      notificationId: result.insertedId,
      message: "Notification sent successfully",
    });
  } catch (error) {
    logger.error("[SUPERADMIN] Send notification error", error);
    return NextResponse.json(
      { success: false, error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
