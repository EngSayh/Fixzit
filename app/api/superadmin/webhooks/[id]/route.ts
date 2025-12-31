/**
 * @fileoverview Superadmin Webhook by ID API
 * @description GET/PUT/DELETE individual webhook configuration
 * @route GET/PUT/DELETE /api/superadmin/webhooks/[id]
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/webhooks/[id]
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { Webhook } from "@/server/models/Webhook";
import { z } from "zod";
import { isValidObjectId } from "mongoose";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

interface RouteContext {
  params: Promise<{ id: string }>;
}

const WEBHOOK_EVENTS = [
  "tenant.created",
  "tenant.updated",
  "tenant.deleted",
  "user.created",
  "user.updated",
  "user.deleted",
  "subscription.created",
  "subscription.cancelled",
  "subscription.renewed",
  "payment.completed",
  "payment.failed",
  "invoice.generated",
  "invoice.paid",
  "workorder.created",
  "workorder.completed",
  "workorder.cancelled",
] as const;

const UpdateWebhookSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  url: z.string().url().max(500).optional(),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1).optional(),
  retryPolicy: z.enum(["none", "linear", "exponential"]).optional(),
  maxRetries: z.number().min(0).max(10).optional(),
  enabled: z.boolean().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  timeout: z.number().min(1000).max(30000).optional(),
});

/**
 * GET /api/superadmin/webhooks/[id]
 * Get a specific webhook configuration
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-webhook-id:get",
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

    const webhook = await Webhook.findById(id).lean();
    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    return NextResponse.json(
      { 
        webhook: {
          ...webhook,
          secret: "wh_sec_••••••••", // Mask secret
        } 
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Webhook] Error fetching webhook", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * PUT /api/superadmin/webhooks/[id]
 * Update a webhook configuration
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-webhook-id:put",
    requests: 20,
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

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }
    const validation = UpdateWebhookSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Update status based on enabled flag
    const updateData: Record<string, unknown> = { ...validation.data };
    if (validation.data.enabled !== undefined) {
      updateData.status = validation.data.enabled ? "active" : "paused";
    }

    const webhook = await Webhook.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).lean();

    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    logger.info("[Superadmin:Webhook] Webhook updated", {
      webhookId: id,
      updates: Object.keys(validation.data),
      by: session.username,
    });

    return NextResponse.json(
      { 
        webhook: {
          ...webhook,
          secret: "wh_sec_••••••••",
        },
        message: "Webhook updated successfully" 
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Webhook] Error updating webhook", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * DELETE /api/superadmin/webhooks/[id]
 * Delete a webhook configuration
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-webhook-id:delete",
    requests: 10,
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

    const webhook = await Webhook.findByIdAndDelete(id);
    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    logger.info("[Superadmin:Webhook] Webhook deleted", {
      webhookId: id,
      webhookName: webhook.name,
      by: session.username,
    });

    return NextResponse.json(
      { message: "Webhook deleted successfully" },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Webhook] Error deleting webhook", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
