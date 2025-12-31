/**
 * @fileoverview Superadmin Webhooks API
 * @description CRUD for webhook configurations
 * @route GET/POST /api/superadmin/webhooks
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/webhooks
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { Webhook } from "@/server/models/Webhook";
import { z } from "zod";
import crypto from "crypto";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

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

const CreateWebhookSchema = z.object({
  name: z.string().min(1).max(100),
  url: z.string().url().max(500),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
  retryPolicy: z.enum(["none", "linear", "exponential"]).optional().default("exponential"),
  maxRetries: z.number().min(0).max(10).optional().default(3),
  enabled: z.boolean().optional().default(true),
  headers: z.record(z.string(), z.string()).optional(),
  timeout: z.number().min(1000).max(30000).optional().default(10000),
});

/**
 * GET /api/superadmin/webhooks
 * List all webhook configurations
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-webhooks:get",
    requests: 30,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await getSuperadminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized - Superadmin access required" },
        { status: 401, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Platform-wide webhooks
    const webhooks = await Webhook.find({})
      .sort({ createdAt: -1 })
      .lean();

    // Mask secrets in response
    const safeWebhooks = webhooks.map((wh) => ({
      ...wh,
      secret: "wh_sec_••••••••", // Never expose actual secrets
    }));

    logger.debug("[Superadmin:Webhooks] Fetched webhooks", {
      count: webhooks.length,
      by: session.username,
    });

    return NextResponse.json(
      { webhooks: safeWebhooks },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Webhooks] Error fetching webhooks", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}

/**
 * POST /api/superadmin/webhooks
 * Create a new webhook configuration
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-webhooks:post",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
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
    const validation = CreateWebhookSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.issues },
        { status: 400, headers: ROBOTS_HEADER }
      );
    }

    await connectDb();

    // Generate a secure webhook secret
    const secret = `wh_sec_${crypto.randomBytes(24).toString("hex")}`;

    const webhook = await Webhook.create({
      ...validation.data,
      secret,
      status: validation.data.enabled ? "active" : "paused",
    });

    logger.info("[Superadmin:Webhooks] Webhook created", {
      webhookId: webhook._id,
      name: webhook.name,
      events: webhook.events,
      by: session.username,
    });

    return NextResponse.json(
      { 
        webhook: {
          ...webhook.toObject(),
          secret, // Return the secret ONLY on creation
        },
        message: "Webhook created successfully. Save the secret - it won't be shown again.",
      },
      { status: 201, headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:Webhooks] Error creating webhook", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
