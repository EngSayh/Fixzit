import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";
import { getClientIP } from "@/server/security/headers";

import { smartRateLimit } from "@/server/security/rateLimit";
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
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return createSecureResponse({ error: "Failed to log event" }, 500, req);
    }

    if (typeof body !== "object" || body === null) {
      return createSecureResponse({ error: "Failed to log event" }, 500, req);
    }

    const { event, data } = body as Record<string, unknown>;
    if (!event || typeof event !== "string") {
      return createSecureResponse({ error: "Failed to log event" }, 500, req);
    }

    try {
      const native = await getDatabase();
      await native.collection("qa_logs").insertOne({
        event,
        data,
        timestamp: new Date(),
        ip: getClientIP(req),
        userAgent: req.headers.get("user-agent"),
        sessionId: req.cookies.get("sessionId")?.value || "unknown",
      });
      logger.info(`📝 QA Log: ${event}`, { data });
      return createSecureResponse({ success: true }, 200, req);
    } catch (dbError) {
      // Fallback mock mode if DB unavailable
      logger.warn("[QA Log] DB unavailable, using mock response", {
        error:
          dbError instanceof Error ? dbError.message : String(dbError ?? ""),
      });
      return createSecureResponse({ success: true, mock: true }, 200, req);
    }
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
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
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

    let query = {} as Record<string, unknown>;
    if (eventType) {
      query = { event: eventType };
    }

    try {
      const native = await getDatabase();
      const logs = await native
        .collection("qa_logs")
        .find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      return createSecureResponse({ logs }, 200, req);
    } catch (dbError) {
      logger.warn("[QA Log] DB unavailable, returning mock logs", {
        error:
          dbError instanceof Error ? dbError.message : String(dbError ?? ""),
      });
      return createSecureResponse({ logs: [], mock: true }, 200, req);
    }
  } catch (error) {
    logger.error(
      "Failed to fetch QA logs:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse({ error: "Failed to fetch logs" }, 500, req);
  }
}
