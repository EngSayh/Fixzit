import { NextRequest, NextResponse } from "next/server";
import { getCollections } from "@/lib/db/collections";
import { logger } from "@/lib/logger";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { smartRateLimit } from "@/server/security/rateLimit";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 5000;
const HEARTBEAT_MS = 25000;
const BATCH_LIMIT = 50;

const normalizeSince = (value: string | null) => {
  if (!value) return new Date().toISOString();
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
};

/**
 * @openapi
 * /api/notifications/stream:
 *   get:
 *     summary: Stream notification updates via SSE
 *     tags: [notifications]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *           format: date-time
 *         description: ISO timestamp to start streaming from
 *     responses:
 *       200:
 *         description: Streaming response
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function GET(req: NextRequest) {
  let user;
  try {
    user = await getSessionUser(req);
  } catch (error) {
    logger.warn("[NotificationsStream] Session lookup failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (!user?.orgId) {
    return createSecureResponse(
      { error: "Unauthorized", message: "Missing tenant context" },
      401,
      req,
    );
  }

  const rl = await smartRateLimit(
    buildOrgAwareRateLimitKey(req, user.orgId, user.id),
    10,
    60_000,
  );
  if (!rl.allowed) {
    return rateLimitError();
  }

  const { notifications } = await getCollections();
  const url = new URL(req.url);
  let lastTimestamp = normalizeSince(url.searchParams.get("since"));

  const encoder = new TextEncoder();
  let closeStream: (() => void) | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      closeStream = () => {
        if (closed) return;
        closed = true;
        if (pollTimer) clearInterval(pollTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        req.signal.removeEventListener("abort", closeStream as () => void);
        controller.close();
      };

      const poll = async () => {
        if (closed) return;
        try {
          const items = await notifications
            .find({ orgId: user.orgId, timestamp: { $gt: lastTimestamp } })
            .sort({ timestamp: 1 })
            .limit(BATCH_LIMIT)
            .toArray();

          if (!items.length) return;

          for (const item of items) {
            const timestamp =
              typeof item.timestamp === "string" ? item.timestamp : new Date().toISOString();
            lastTimestamp = timestamp;
            controller.enqueue(
              encoder.encode(
                `event: notification\ndata: ${JSON.stringify({
                  id: String(item._id),
                  timestamp,
                })}\n\n`,
              ),
            );
          }
        } catch (error) {
          logger.error("[NotificationsStream] Polling failed", error as Error);
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({
                error: "Notification stream failed",
              })}\n\n`,
            ),
          );
          closeStream?.();
        }
      };

      pollTimer = setInterval(() => {
        void poll();
      }, POLL_INTERVAL_MS);

      heartbeatTimer = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode("event: ping\ndata: {}\n\n"));
      }, HEARTBEAT_MS);

      req.signal.addEventListener("abort", closeStream);

      controller.enqueue(
        encoder.encode(`event: ready\ndata: ${JSON.stringify({ since: lastTimestamp })}\n\n`),
      );
      void poll();
    },
    cancel() {
      logger.info("[NotificationsStream] Client disconnected");
      if (closeStream) {
        closeStream();
      }
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
