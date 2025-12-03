import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";
import { getClientIP } from "@/server/security/headers";

import { smartRateLimit, buildOrgAwareRateLimitKey } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { requireSuperAdmin } from "@/lib/authz";

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
  // Require SUPER_ADMIN to write QA logs (sensitive telemetry)
  let authContext: { id: string; tenantId: string } | null = null;
  try {
    authContext = await requireSuperAdmin(req);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    return createSecureResponse({ error: "Authentication failed" }, 401, req);
  }

  // SECURITY: Require tenant context for multi-tenant isolation (matches qa/alert behavior)
  if (!authContext?.tenantId) {
    return createSecureResponse({ error: "Missing organization context" }, 400, req);
  }
  const orgId = authContext.tenantId;
  const userId = authContext.id;

  // Rate limiting - org-aware key for tenant isolation
  const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, orgId, userId), 60, 60_000);
  if (!rl.allowed) return rateLimitError();

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
    if (!event || typeof event !== "string" || event.trim().length === 0) {
      return createSecureResponse({ error: "Failed to log event" }, 500, req);
    }
    const sanitizedEvent = event.trim().slice(0, 128);

    // Cap payload size to avoid log bloat (10KB)
    const MAX_PAYLOAD_SIZE = 10 * 1024;
    const dataStr = JSON.stringify(data ?? null);
    if (dataStr.length > MAX_PAYLOAD_SIZE) {
      return createSecureResponse({ error: "Payload too large" }, 400, req);
    }

    try {
      const native = await getDatabase();
      await native.collection("qa_logs").insertOne({
        event: sanitizedEvent,
        data,
        timestamp: new Date(),
        orgId,
        userId,
        ip: getClientIP(req),
        userAgent: req.headers.get("user-agent"),
        sessionId: req.cookies.get("sessionId")?.value || "unknown",
      });
      // Log event with redacted payload for observability (no PII leakage)
      const payloadSize = dataStr.length;
      logger.info(`📝 QA Log: ${sanitizedEvent}`, { orgId, payloadSize });
      return createSecureResponse({ success: true }, 200, req);
    } catch (dbError) {
      // Return 503 on DB failure to make outages visible - don't mask with 200
      logger.error("[QA Log] DB unavailable, cannot persist event", {
        error:
          dbError instanceof Error ? dbError.message : String(dbError ?? ""),
      });
      return createSecureResponse({ error: "Service temporarily unavailable" }, 503, req);
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
  // Require SUPER_ADMIN to read QA logs (sensitive telemetry)
  let authContext: { id: string; tenantId: string } | null = null;
  try {
    authContext = await requireSuperAdmin(req);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    return createSecureResponse({ error: "Authentication failed" }, 401, req);
  }

  // SECURITY: Require tenant context for multi-tenant isolation (matches qa/alert behavior)
  if (!authContext?.tenantId) {
    return createSecureResponse({ error: "Missing organization context" }, 400, req);
  }
  const orgId = authContext.tenantId;
  const userId = authContext.id;

  // Rate limiting - org-aware key for tenant isolation
  const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, orgId, userId), 60, 60_000);
  if (!rl.allowed) return rateLimitError();

  try {
    const { searchParams } = new URL(req.url);
    const parsed = Number(searchParams.get("limit"));
    const limit = Math.min(
      Number.isFinite(parsed) && parsed > 0 ? parsed : 100,
      1000,
    );
    const eventType = searchParams.get("event");

    // Scope to caller's org to prevent cross-tenant access
    const query: Record<string, unknown> = { orgId };
    if (eventType) {
      query.event = eventType;
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
