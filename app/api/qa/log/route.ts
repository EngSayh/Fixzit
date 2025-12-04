import { NextRequest } from "next/server";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";
import { getClientIP, createSecureResponse } from "@/server/security/headers";
import { smartRateLimit, buildOrgAwareRateLimitKey } from "@/server/security/rateLimit";
import { rateLimitError, unauthorizedError } from "@/server/utils/errorResponses";
import { requireSuperAdmin, type AuthContext } from "@/lib/authz";

// VALIDATION: Strict schema for QA log payloads
const qaLogSchema = z.object({
  event: z.string().min(1, "Event name is required").max(128, "Event name too long"),
  data: z.unknown().optional(),
});

// SECURITY: Max payload size to prevent storage bloat (10KB)
const MAX_PAYLOAD_SIZE = 10 * 1024;

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
  // SECURITY: Require SUPER_ADMIN to write QA logs - prevents abuse and spam
  let authContext: AuthContext;
  try {
    authContext = await requireSuperAdmin(req);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    return unauthorizedError("Authentication failed");
  }

  // SECURITY: Extract org/user context for attribution and rate limiting
  const orgId = authContext.tenantId || null;
  const userId = authContext.id;

  // Rate limiting - SECURITY: Use org-aware key for proper tenant isolation
  const key = buildOrgAwareRateLimitKey(req, orgId, userId);
  const rl = await smartRateLimit(key, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    // VALIDATION: Parse and validate request body
    let rawBody: unknown;
    try {
      rawBody = await req.json();
    } catch {
      return createSecureResponse({ error: "Invalid JSON body" }, 400, req);
    }

    // VALIDATION: Check payload size before processing
    const bodyStr = JSON.stringify(rawBody);
    if (bodyStr.length > MAX_PAYLOAD_SIZE) {
      return createSecureResponse({ error: "Payload too large (max 10KB)" }, 400, req);
    }

    // VALIDATION: Validate against schema
    const parsed = qaLogSchema.safeParse(rawBody);
    if (!parsed.success) {
      const errorMessage = parsed.error.issues[0]?.message || "Invalid log payload";
      return createSecureResponse({ error: errorMessage }, 400, req);
    }

    const { event, data } = parsed.data;

    try {
      const native = await getDatabase();
      await native.collection("qa_logs").insertOne({
        event,
        data: data ?? null,
        timestamp: new Date(),
        // ORG ATTRIBUTION: Required for multi-tenant isolation and audit trails
        orgId,
        userId,
        ip: getClientIP(req),
        userAgent: req.headers.get("user-agent"),
        sessionId: req.cookies.get("sessionId")?.value || "unknown",
      });
      
      // Log event for observability (redact data to prevent PII leakage)
      logger.info(`📝 QA Log: ${event}`, { orgId, userId, payloadSize: bodyStr.length });
      return createSecureResponse({ success: true }, 200, req);
    } catch (dbError) {
      // Fallback mock mode if DB unavailable
      logger.warn("[QA Log] DB unavailable, using mock response", {
        error: dbError instanceof Error ? dbError.message : String(dbError ?? ""),
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
  // SECURITY: Require SUPER_ADMIN to read QA logs - contains sensitive debugging info
  let authContext: AuthContext;
  try {
    authContext = await requireSuperAdmin(req);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    return unauthorizedError("Authentication failed");
  }

  // SECURITY: Extract org/user context for filtering and rate limiting
  const orgId = authContext.tenantId || null;
  const userId = authContext.id;

  // Rate limiting - SECURITY: Use org-aware key for proper tenant isolation
  const key = buildOrgAwareRateLimitKey(req, orgId, userId);
  const rl = await smartRateLimit(key, 60, 60_000);
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

    // ORG SCOPING: Filter logs by org to prevent cross-tenant data exposure
    // Super-admins without tenantId see all logs (platform-level debugging)
    const query: Record<string, unknown> = orgId ? { orgId } : {};
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
        error: dbError instanceof Error ? dbError.message : String(dbError ?? ""),
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
