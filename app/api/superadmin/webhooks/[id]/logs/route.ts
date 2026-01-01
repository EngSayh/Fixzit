/**
 * @fileoverview Superadmin Webhook Logs API
 * @description GET webhook delivery logs
 * @route GET /api/superadmin/webhooks/[id]/logs
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/webhooks/[id]/logs
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { WebhookDelivery } from "@/server/models/WebhookDelivery";
import { Webhook } from "@/server/models/Webhook";
import { isValidObjectId } from "mongoose";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/superadmin/webhooks/[id]/logs
 * Get delivery logs for a specific webhook
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-webhook-logs:get",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { id } = await context.params;
    
    if (!isValidObjectId(id)) {
      return NextResponse.json(
        { error: "Invalid webhook ID" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Verify webhook exists
    const webhook = await Webhook.findById(id).lean();
    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;
    const status = searchParams.get("status");

    // Build query
    const query: Record<string, unknown> = { webhookId: id };
    if (status && ["success", "failed", "pending", "retrying"].includes(status)) {
      query.status = status;
    }

    // SUPER_ADMIN: Platform-wide webhook logs (no tenant scope needed)
    const [logs, total] = await Promise.all([
      WebhookDelivery.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      WebhookDelivery.countDocuments(query),
    ]);

    logger.debug("[Superadmin:WebhookLogs] Fetched logs", {
      webhookId: id,
      count: logs.length,
      total,
      by: session.username,
    });

    return NextResponse.json(
      {
        logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:WebhookLogs] Error fetching logs", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
