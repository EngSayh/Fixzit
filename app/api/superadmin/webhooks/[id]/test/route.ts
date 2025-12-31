/**
 * @fileoverview Superadmin Webhook Test API
 * @description POST to test a webhook endpoint
 * @route POST /api/superadmin/webhooks/[id]/test
 * @access Superadmin only (JWT auth)
 * @module api/superadmin/webhooks/[id]/test
 */

import { NextRequest, NextResponse } from "next/server";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { logger } from "@/lib/logger";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { connectDb } from "@/lib/mongodb-unified";
import { Webhook } from "@/server/models/Webhook";
import { WebhookDelivery } from "@/server/models/WebhookDelivery";
import { isValidObjectId } from "mongoose";
import crypto from "crypto";

export const dynamic = "force-dynamic";
const ROBOTS_HEADER = { "X-Robots-Tag": "noindex, nofollow" };

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/superadmin/webhooks/[id]/test
 * Send a test payload to the webhook endpoint
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "superadmin-webhook-test:post",
    requests: 5,
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

    const webhook = await Webhook.findById(id);
    if (!webhook) {
      return NextResponse.json(
        { error: "Webhook not found" },
        { status: 404, headers: ROBOTS_HEADER }
      );
    }

    // Create test payload
    const testPayload = {
      event: "test.ping",
      timestamp: new Date().toISOString(),
      data: {
        message: "This is a test webhook delivery from Fixzit",
        webhookId: id,
        triggeredBy: session.username,
      },
    };

    const payloadString = JSON.stringify(testPayload);

    // Generate signature
    const signature = crypto
      .createHmac("sha256", webhook.secret)
      .update(payloadString)
      .digest("hex");

    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Fixzit-Signature": `sha256=${signature}`,
      "X-Fixzit-Event": "test.ping",
      "X-Fixzit-Delivery": crypto.randomUUID(),
    };

    // Add custom headers (Mongoose returns plain objects, not Maps)
    if (webhook.headers && typeof webhook.headers === "object") {
      // Type assertion to handle both Map and Record cases from Mongoose
      const customHeaders = webhook.headers as unknown as Record<string, string>;
      for (const [key, value] of Object.entries(customHeaders)) {
        if (typeof key === "string" && typeof value === "string") {
          headers[key] = value;
        }
      }
    }

    const startTime = Date.now();
    let statusCode: number | null = null;
    let responseBody: string | null = null;
    let errorMessage: string | null = null;
    let deliveryStatus: "success" | "failed" = "failed";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), webhook.timeout || 10000);

      const response = await fetch(webhook.url, {
        method: "POST",
        headers,
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      statusCode = response.status;
      responseBody = await response.text();
      deliveryStatus = response.ok ? "success" : "failed";

      if (!response.ok) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (fetchError) {
      errorMessage = fetchError instanceof Error ? fetchError.message : String(fetchError);
      if (errorMessage.includes("aborted")) {
        errorMessage = "Request timed out";
      }
    }

    const responseTime = Date.now() - startTime;

    // Log the delivery
    await WebhookDelivery.create({
      webhookId: id,
      event: "test.ping",
      status: deliveryStatus,
      statusCode,
      responseTime,
      attemptCount: 1,
      payload: payloadString,
      response: responseBody,
      errorMessage,
    });

    // Update webhook stats
    await Webhook.findByIdAndUpdate(id, {
      $set: { lastTriggered: new Date() },
      $inc: deliveryStatus === "success" 
        ? { successCount: 1 } 
        : { failureCount: 1 },
    });

    logger.info("[Superadmin:WebhookTest] Test delivery completed", {
      webhookId: id,
      status: deliveryStatus,
      statusCode,
      responseTime,
      by: session.username,
    });

    return NextResponse.json(
      {
        success: deliveryStatus === "success",
        statusCode,
        responseTime,
        response: responseBody?.substring(0, 500), // Truncate long responses
        error: errorMessage,
      },
      { headers: ROBOTS_HEADER }
    );
  } catch (error) {
    logger.error("[Superadmin:WebhookTest] Error testing webhook", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: ROBOTS_HEADER }
    );
  }
}
