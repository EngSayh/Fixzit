/**
 * @description Sends a broadcast notification (superadmin).
 * @route POST /api/superadmin/notifications/send
 * @access Private - Superadmin session required
 * 
 * @notes
 * - NOTIFICATIONS_STUB=true (or NODE_ENV=development): Marks as queued but doesn't send
 * - Production: Queues job for background worker to process
 */
import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { getDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { COLLECTIONS } from "@/lib/db/collections";

/** Request body interface for type safety */
interface SendNotificationRequest {
  title?: string;
  subject?: string;
  message: string;
  channels?: string[];
  type?: string;
  targetTenantId?: string;
  targetUserIds?: string[];
  userIds?: string[];
}

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

    let body: SendNotificationRequest;
    try {
      body = await req.json();
    } catch (parseError) {
      logger.warn("Invalid JSON in notification request", {
        component: "superadmin-notifications",
        error: parseError instanceof Error ? parseError.message : "Unknown parse error",
      });
      return NextResponse.json(
        { success: false, error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }
    
    // Accept both naming conventions for flexibility
    const title = body.title || body.subject;
    const message = body.message;
    
    // Validate required fields
    if (!title || !message) {
      return NextResponse.json(
        { success: false, error: "Title/subject and message are required" },
        { status: 400 }
      );
    }
    
    // Validate channels is an array if provided
    let rawChannels: unknown[];
    if (body.channels !== undefined) {
      if (!Array.isArray(body.channels)) {
        return NextResponse.json(
          { success: false, error: "channels must be an array" },
          { status: 400 }
        );
      }
      rawChannels = body.channels;
    } else {
      rawChannels = body.type !== undefined ? [body.type] : ["email"];
    }
    // Validate all channel elements are strings
    const invalidChannels: Array<{ index: number; value: unknown; type: string }> = [];
    rawChannels.forEach((ch, i) => {
      if (typeof ch !== "string") {
        invalidChannels.push({ index: i, value: ch, type: typeof ch });
      }
    });
    if (invalidChannels.length > 0) {
      return NextResponse.json(
        { success: false, error: "All channel values must be strings", invalidElements: invalidChannels },
        { status: 400 }
      );
    }
    const channels = rawChannels as string[];
    
    // Validate targetUserIds is an array if provided
    const rawUserIds = body.targetUserIds ?? body.userIds ?? [];
    if (!Array.isArray(rawUserIds)) {
      return NextResponse.json(
        { success: false, error: "targetUserIds/userIds must be an array" },
        { status: 400 }
      );
    }
    // Strict validation: reject if any element is not a string (don't silently filter)
    const invalidUserIds: Array<{ index: number; value: unknown; type: string }> = [];
    rawUserIds.forEach((id, i) => {
      if (typeof id !== "string") {
        invalidUserIds.push({ index: i, value: id, type: typeof id });
      }
    });
    if (invalidUserIds.length > 0) {
      return NextResponse.json(
        { success: false, error: "All targetUserIds must be strings", invalidElements: invalidUserIds },
        { status: 400 }
      );
    }
    const targetUserIds = rawUserIds as string[];
    
    const targetTenantId = body.targetTenantId;

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
    
    if (!result.insertedId) {
      logger.error("Failed to insert notification - no insertedId returned", {
        component: "superadmin-notifications",
        action: "send",
      });
      return NextResponse.json(
        { success: false, error: "Failed to create notification (FIXZIT-DB-001)" },
        { status: 500 }
      );
    }

    // STUB MODE: In development or when NOTIFICATIONS_STUB=true, mark as queued
    // but don't actually send. In production, a background worker would:
    // 1. Poll for status:"queued" notifications
    // 2. Call provider SDKs (SendGrid, Twilio, etc.)
    // 3. Update channelResults, metrics, status, and sentAt on completion
    const isStubMode = process.env.NODE_ENV === "development" || 
                       process.env.NOTIFICATIONS_STUB === "true";
    
    if (isStubMode) {
      // Mark as queued - a background worker would process this
      const queuedAt = new Date();
      const queuedChannelResults = channels.map((ch: string) => ({
        channel: ch,
        status: "queued",
        queuedAt,
        attempts: 0,
        succeeded: 0,
        failedCount: 0,
      }));
      // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Platform-wide notification update
      await collection.updateOne(
        { _id: result.insertedId },
        {
          $set: {
            status: "queued",
            queuedAt,
            channelResults: queuedChannelResults,
          },
        }
      );
      
      logger.info("[SUPERADMIN] Notification queued (stub mode)", {
        notificationId: result.insertedId,
        title,
        channels,
        actor: session.username,
        stubMode: true,
      });

      return NextResponse.json({
        success: true,
        notificationId: result.insertedId,
        message: "Notification queued for delivery",
        status: "queued",
      });
    }

    // FIXME: Job queue integration pending - tracked in ISSUE-JQ-001
    // When BullMQ/Redis is configured, replace the code below with:
    // try {
    //   await JobQueue.enqueue(\"notification:send\", { 
    //     notificationId: result.insertedId.toString(),
    //     tenantId: targetTenantId,
    //     channels,
    //     createdAt: new Date().toISOString(),
    //   });
    // } catch (queueError) {
    //   logger.error(\"[SUPERADMIN] Failed to enqueue notification\", { 
    //     notificationId: result.insertedId, 
    //     error: queueError 
    //   });
    //   return NextResponse.json(
    //     { error: \"Failed to queue notification for delivery\" },
    //     { status: 503 }
    //   );
    // }
    // Priority: P1 | Acceptance: Notification delivery via background worker
    
    // For now, mark as queued even in production until job queue is configured
    const prodQueuedAt = new Date();
    const prodQueuedChannelResults = channels.map((ch: string) => ({
      channel: ch,
      status: "queued",
      queuedAt: prodQueuedAt,
      attempts: 0,
      succeeded: 0,
      failedCount: 0,
    }));
    // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Platform-wide notification update
    await collection.updateOne(
      { _id: result.insertedId },
      {
        $set: {
          status: "queued",
          queuedAt: prodQueuedAt,
          channelResults: prodQueuedChannelResults,
        },
      }
    );

    logger.info("[SUPERADMIN] Notification queued", {
      notificationId: result.insertedId,
      title,
      channels,
      actor: session.username,
    });

    return NextResponse.json({
      success: true,
      notificationId: result.insertedId,
      message: "Notification queued for delivery",
      status: "queued",
    });
  } catch (error) {
    logger.error("[SUPERADMIN] Send notification error", error);
    return NextResponse.json(
      { success: false, error: "Failed to send notification" },
      { status: 500 }
    );
  }
}
