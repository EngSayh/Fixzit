import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAllCounters } from "@/lib/queries";
import { logger } from "@/lib/logger";
import { isTruthy } from "@/lib/utils/env";
import { smartRateLimit } from "@/server/security/rateLimit";
import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POLL_INTERVAL_MS = 10_000;
const HEARTBEAT_MS = 25_000;

const normalizeCounters = (payload: Record<string, unknown>) => {
  const { lastUpdated: _lastUpdated, ...rest } = payload as { lastUpdated?: string };
  return rest;
};

export async function GET(req: NextRequest) {
  const session = await auth();
  const sessionUser = session?.user as { id?: string; orgId?: string } | undefined;
  const userId = sessionUser?.id;
  const orgId = sessionUser?.orgId;

  if (!userId || !orgId) {
    return createSecureResponse(
      { error: "Unauthorized", message: "Missing tenant context" },
      401,
      req,
    );
  }

  const rl = await smartRateLimit(
    buildOrgAwareRateLimitKey(req, orgId, userId),
    6,
    60_000,
  );
  if (!rl.allowed) {
    return rateLimitError();
  }

  const encoder = new TextEncoder();
  let closeStream: (() => void) | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let lastSnapshot = "";
  let isPolling = false;
  const offlineMode = isTruthy(process.env.ALLOW_OFFLINE_MONGODB);

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

      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      const poll = async () => {
        if (closed || offlineMode || isPolling) return;
        isPolling = true;
        try {
          const counters = await getAllCounters(orgId);
          const normalized = normalizeCounters(
            counters as Record<string, unknown>,
          );
          const snapshot = JSON.stringify(normalized);
          if (snapshot !== lastSnapshot) {
            lastSnapshot = snapshot;
            sendEvent("counters", {
              orgId,
              counters: normalized,
              lastUpdated: new Date().toISOString(),
            });
          }
        } catch (error) {
          logger.error("[CountersStream] Polling failed", error as Error);
          sendEvent("error", { error: "Counters stream failed" });
          closeStream?.();
        } finally {
          isPolling = false;
        }
      };

      if (offlineMode) {
        sendEvent("counters", {
          orgId,
          counters: {},
          lastUpdated: new Date().toISOString(),
        });
      } else {
        pollTimer = setInterval(() => {
          void poll();
        }, POLL_INTERVAL_MS);
      }

      heartbeatTimer = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode("event: ping\ndata: {}\n\n"));
      }, HEARTBEAT_MS);

      req.signal.addEventListener("abort", closeStream);

      sendEvent("ready", { orgId });
      if (!offlineMode) {
        void poll();
      }
    },
    cancel() {
      logger.info("[CountersStream] Client disconnected");
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
