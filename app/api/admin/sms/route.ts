import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { SMSMessage, SMSStatus, TSMSStatus } from "@/server/models/SMSMessage";
import { getSMSQueueStats, retryFailedMessages } from "@/lib/queues/sms-queue";
import { logger } from "@/lib/logger";
import { z } from "zod";

/**
 * GET /api/admin/sms
 *
 * Get SMS messages with filters (Super Admin only)
 * Query params:
 * - status: Filter by status (PENDING, QUEUED, SENT, DELIVERED, FAILED, EXPIRED)
 * - type: Filter by type (OTP, NOTIFICATION, ALERT, MARKETING, TRANSACTIONAL)
 * - orgId: Filter by organization (superadmin can see all)
 * - search: Search by phone number
 * - from: Start date (ISO)
 * - to: End date (ISO)
 * - slaBreached: Filter by SLA breach status
 * - limit: Number of results (default 50, max 500)
 * - skip: Skip for pagination
 * - includeStats: Include aggregate statistics
 * - includeQueueStats: Include BullMQ queue statistics
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is Super Admin
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") as TSMSStatus | null;
    const type = searchParams.get("type");
    const orgId = searchParams.get("orgId");
    const search = searchParams.get("search");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const slaBreached = searchParams.get("slaBreached");
    const includeStats = searchParams.get("includeStats") === "true";
    const includeQueueStats = searchParams.get("includeQueueStats") === "true";

    let limit = parseInt(searchParams.get("limit") || "50", 10);
    let skip = parseInt(searchParams.get("skip") || "0", 10);

    limit = Math.min(Math.max(1, limit), 500);
    skip = Math.max(0, skip);

    // Build query
    const query: Record<string, unknown> = {};

    if (status && SMSStatus.includes(status)) {
      query.status = status;
    }
    if (type) {
      query.type = type;
    }
    if (orgId) {
      query.orgId = orgId;
    }
    if (search) {
      query.to = { $regex: search, $options: "i" };
    }
    if (from || to) {
      query.createdAt = {};
      if (from) (query.createdAt as Record<string, Date>).$gte = new Date(from);
      if (to) (query.createdAt as Record<string, Date>).$lte = new Date(to);
    }
    if (slaBreached === "true") {
      query.slaBreached = true;
    } else if (slaBreached === "false") {
      query.slaBreached = false;
    }

    // Fetch messages
    const [messages, total] = await Promise.all([
      SMSMessage.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SMSMessage.countDocuments(query),
    ]);

    const response: Record<string, unknown> = {
      messages,
      total,
      limit,
      skip,
      hasMore: skip + messages.length < total,
    };

    // Include aggregate stats if requested
    if (includeStats) {
      const statusCounts = await SMSMessage.getStatusCounts(orgId || undefined);
      const slaBreachCount = await SMSMessage.getSLABreachCount(
        orgId || undefined,
        new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      );
      response.stats = {
        statusCounts,
        slaBreachCount24h: slaBreachCount,
      };
    }

    // Include queue stats if requested
    if (includeQueueStats) {
      const queueStats = await getSMSQueueStats();
      response.queueStats = queueStats;
    }

    return NextResponse.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[Admin SMS] GET failed", { error: errorMessage });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/sms
 *
 * Actions on SMS messages (Super Admin only)
 * Body:
 * - action: "retry" | "retry-all-failed" | "cancel"
 * - messageId: For single message actions
 * - orgId: For org-scoped actions
 */
const ActionSchema = z.object({
  action: z.enum(["retry", "retry-all-failed", "cancel"]),
  messageId: z.string().optional(),
  orgId: z.string().optional(),
  limit: z.number().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Super Admin access required" },
        { status: 403 }
      );
    }

    await connectToDatabase();

    const body = await request.json();
    const parsed = ActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action, messageId, orgId, limit } = parsed.data;

    switch (action) {
      case "retry": {
        if (!messageId) {
          return NextResponse.json(
            { error: "messageId required for retry action" },
            { status: 400 }
          );
        }

        const message = await SMSMessage.findById(messageId);
        if (!message) {
          return NextResponse.json(
            { error: "Message not found" },
            { status: 404 }
          );
        }

        // Reset for retry
        await SMSMessage.findByIdAndUpdate(messageId, {
          status: "PENDING",
          retryCount: 0,
          nextRetryAt: new Date(),
          lastError: null,
          lastErrorCode: null,
        });

        logger.info("[Admin SMS] Manual retry triggered", {
          messageId,
          by: session.user.email,
        });

        return NextResponse.json({
          success: true,
          message: "Message queued for retry",
        });
      }

      case "retry-all-failed": {
        const retriedCount = await retryFailedMessages(orgId, limit || 100);

        logger.info("[Admin SMS] Bulk retry triggered", {
          orgId,
          retriedCount,
          by: session.user.email,
        });

        return NextResponse.json({
          success: true,
          retriedCount,
        });
      }

      case "cancel": {
        if (!messageId) {
          return NextResponse.json(
            { error: "messageId required for cancel action" },
            { status: 400 }
          );
        }

        const message = await SMSMessage.findById(messageId);
        if (!message) {
          return NextResponse.json(
            { error: "Message not found" },
            { status: 404 }
          );
        }

        if (message.status === "SENT" || message.status === "DELIVERED") {
          return NextResponse.json(
            { error: "Cannot cancel already sent/delivered message" },
            { status: 400 }
          );
        }

        await SMSMessage.findByIdAndUpdate(messageId, { status: "EXPIRED" });

        logger.info("[Admin SMS] Message cancelled", {
          messageId,
          by: session.user.email,
        });

        return NextResponse.json({
          success: true,
          message: "Message cancelled",
        });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action" },
          { status: 400 }
        );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("[Admin SMS] POST failed", { error: errorMessage });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
