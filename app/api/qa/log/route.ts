import { NextRequest } from "next/server";
import { z } from "zod";
import { createHash } from "crypto";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";
import { ensureQaIndexes } from "@/lib/db/collections";
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

    // VALIDATION: Check payload size before processing (use byte length for accurate UTF-8 sizing)
    const bodyStr = JSON.stringify(rawBody);
    const bodyBytes = Buffer.byteLength(bodyStr, 'utf8');
    if (bodyBytes > MAX_PAYLOAD_SIZE) {
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
      // INDEXES: Ensure QA indexes/TTL exist for optimal query performance and retention
      await ensureQaIndexes();

      // SECURITY: Hash session ID to enable correlation without storing raw credential
      const rawSessionId = req.cookies.get("sessionId")?.value;
      const sessionIdHash = rawSessionId 
        ? createHash("sha256").update(rawSessionId).digest("hex").substring(0, 16)
        : undefined;

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
        sessionIdHash, // Hashed for correlation, not raw credential
      });
      
      // Log event for observability (redact data to prevent PII leakage)
      logger.info(`📝 QA Log: ${event}`, { orgId, userId, payloadBytes: bodyBytes });
      return createSecureResponse({ success: true }, 200, req);
    } catch (dbError) {
      // RELIABILITY: Surface DB failures to callers/monitoring - do not mask with mock success
      logger.error("[QA Log] DB unavailable", {
        error: dbError instanceof Error ? dbError.message : String(dbError ?? ""),
      });
      return createSecureResponse({ error: "Log storage unavailable" }, 503, req);
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
    // PERFORMANCE: Lower default limit (100) and cap at 200 to prevent large responses
    const limit = Math.min(
      Number.isFinite(parsed) && parsed > 0 ? parsed : 100,
      200,
    );
    const eventType = searchParams.get("event");
    // PERFORMANCE: Optionally exclude data field to reduce payload size
    const includeData = searchParams.get("includeData") === "true";

    // ORG SCOPING: Filter logs by org to prevent cross-tenant data exposure
    // Super-admins without tenantId see all logs (platform-level debugging)
    const query: Record<string, unknown> = orgId ? { orgId } : {};
    if (eventType) {
      query.event = eventType;
    }

    try {
      // INDEXES: Ensure QA indexes/TTL exist for optimal query performance and retention
      await ensureQaIndexes();

      const native = await getDatabase();
      // PERFORMANCE: Exclude large data field by default to keep responses small
      const projection = includeData ? {} : { data: 0 };
      const logs = await native
        .collection("qa_logs")
        .find(query, { projection })
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      return createSecureResponse({ logs }, 200, req);
    } catch (dbError) {
      // RELIABILITY: Surface DB failures to callers/monitoring - do not mask with mock success
      logger.error("[QA Log] DB unavailable", {
        error: dbError instanceof Error ? dbError.message : String(dbError ?? ""),
      });
      return createSecureResponse({ error: "Log retrieval unavailable" }, 503, req);
    }
  } catch (error) {
    logger.error(
      "Failed to fetch QA logs:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse({ error: "Failed to fetch logs" }, 500, req);
  }
}
