import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";
import { getClientIP } from "@/server/security/headers";

import { rateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";

/**
 * @openapi
 * /api/qa/log:
 *   get:
 *     summary: qa/log operations
 *     tags: [qa]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    const body = await req.json();
    const { event, data } = body;

    // Log the event to database
    const native = await getDatabase();
    await native.collection("qa_logs").insertOne({
      event,
      data,
      timestamp: new Date(),
      ip: getClientIP(req),
      userAgent: req.headers.get("user-agent"),
      sessionId: req.cookies.get("sessionId")?.value || "unknown",
    });

    logger.info(`📝 QA Log: ${event}`, data);

    return createSecureResponse({ success: true }, 200, req);
  } catch (error) {
    logger.error(
      "Failed to log QA event:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse({ error: "Failed to log event" }, 500, req);
  }
}

export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    const { searchParams } = new URL(req.url);
    const parsed = Number(searchParams.get("limit"));
    const limit = Math.min(
      Number.isFinite(parsed) && parsed > 0 ? parsed : 100,
      1000,
    );
    const eventType = searchParams.get("event");

    // Query database

    let query = {} as Record<string, unknown>;
    if (eventType) {
      query = { event: eventType };
    }

    const native = await getDatabase();
    const logs = await native
      .collection("qa_logs")
      .find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();

    return createSecureResponse({ logs }, 200, req);
  } catch (error) {
    logger.error(
      "Failed to fetch QA logs:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse({ error: "Failed to fetch logs" }, 500, req);
  }
}
