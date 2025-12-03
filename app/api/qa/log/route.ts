import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";
import { getClientIP } from "@/server/security/headers";

import { smartRateLimit, buildOrgAwareRateLimitKey } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { requireSuperAdmin } from "@/lib/authz";
import { ensureQaIndexes } from "@/lib/db/collections";

/**
 * SECURITY: Hash session IDs before logging to prevent credential leakage.
 * If raw session cookies are stored, leaked logs could enable session hijack.
 */
function hashSessionId(sessionId: string | undefined): string | undefined {
  if (!sessionId) return undefined;
  return createHash("sha256").update(sessionId).digest("hex").slice(0, 16);
}

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
    await ensureQaIndexes();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      // VALIDATION: Invalid JSON is a client error (400), not server error
      return createSecureResponse({ error: "Invalid JSON body" }, 400, req);
    }

    if (typeof body !== "object" || body === null) {
      // VALIDATION: Body must be an object (400 for malformed request)
      return createSecureResponse({ error: "Body must be an object" }, 400, req);
    }

    const { event, data } = body as Record<string, unknown>;
    if (!event || typeof event !== "string" || event.trim().length === 0) {
      // VALIDATION: Missing required field is client error (400)
      return createSecureResponse({ error: "Event name is required" }, 400, req);
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
      // SECURITY: Hash sessionId to prevent credential leakage in logs
      const rawSessionId = req.cookies.get("sessionId")?.value;
      await native.collection("qa_logs").insertOne({
        event: sanitizedEvent,
        data,
        timestamp: new Date(),
        orgId,
        userId,
        ip: getClientIP(req),
        userAgent: req.headers.get("user-agent"),
        sessionIdHash: hashSessionId(rawSessionId), // Hashed, not raw
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
    await ensureQaIndexes();

    const { searchParams } = new URL(req.url);
    const parsed = Number(searchParams.get("limit"));
    // PERFORMANCE: Cap at 200 to prevent 10MB responses in serverless (each log up to 10KB)
    const limit = Math.min(
      Number.isFinite(parsed) && parsed > 0 ? parsed : 100,
      200,
    );
    const eventType = searchParams.get("event");
    // PERFORMANCE: Omit bulky data field by default; use includeData=true to include
    const includeData = searchParams.get("includeData") === "true";

    // Scope to caller's org to prevent cross-tenant access
    const query: Record<string, unknown> = { orgId };
    if (eventType) {
      query.event = eventType;
    }

    try {
      const native = await getDatabase();
      // Use projection to omit large data payloads unless explicitly requested
      const projection = includeData ? {} : { data: 0 };
      const logs = await native
        .collection("qa_logs")
        .find(query, { projection })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      return createSecureResponse({ logs }, 200, req);
    } catch (dbError) {
      // CRITICAL: Return 503 on DB failure to make outages visible - don't mask with 200
      logger.error("[QA Log] DB unavailable, cannot fetch logs", {
        error:
          dbError instanceof Error ? dbError.message : String(dbError ?? ""),
      });
      return createSecureResponse({ error: "Service temporarily unavailable" }, 503, req);
    }
  } catch (error) {
    logger.error(
      "Failed to fetch QA logs:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse({ error: "Failed to fetch logs" }, 500, req);
  }
}
