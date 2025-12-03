import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { smartRateLimit, buildOrgAwareRateLimitKey } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";

/**
 * Server-only logging endpoint for DataDog integration
 *
 * SECURITY: DataDog API keys are kept server-side only
 * Client components call this endpoint instead of directly accessing DataDog
 *
 * POST /api/logs
 * Body: level (info/warn/error), message (string), context (optional object)
 */
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Require authentication in all environments and ensure tenant context
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const orgId =
      (session.user as { orgId?: string; tenantId?: string }).orgId ||
      (session.user as { tenantId?: string }).tenantId ||
      "";
    if (!orgId) {
      return NextResponse.json(
        { error: "Missing organization context" },
        { status: 400 },
      );
    }

    // Rate limit per org/user to prevent abuse of logging pipeline
    const rlKey = buildOrgAwareRateLimitKey(req, orgId, session.user.id ?? null);
    const rl = await smartRateLimit(rlKey, 60, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Body must be an object" }, { status: 400 });
    }

    const { level, message, context } = body as Record<string, unknown>;

    // Validate input
    if (!level || !message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Missing required fields: level, message" },
        { status: 400 },
      );
    }

    if (typeof level !== "string" || !["info", "warn", "error"].includes(level)) {
      return NextResponse.json(
        { error: "Invalid level. Must be info, warn, or error" },
        { status: 400 },
      );
    }

    // Validate context shape
    if (context !== undefined && (typeof context !== "object" || context === null)) {
      return NextResponse.json(
        { error: "Context must be an object" },
        { status: 400 },
      );
    }

    // Cap message/context size to avoid oversized log ingestion
    const sanitizedMessage = message.slice(0, 2048);
    const serializedContext = JSON.stringify(context ?? {});
    const MAX_CONTEXT_SIZE = 8 * 1024; // 8KB
    if (serializedContext.length > MAX_CONTEXT_SIZE) {
      return NextResponse.json(
        { error: "Context too large" },
        { status: 400 },
      );
    }

    // 🔒 SECURITY: DataDog keys only accessible server-side
    if (process.env.DATADOG_API_KEY) {
      try {
        await fetch("https://http-intake.logs.datadoghq.com/api/v2/logs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "DD-API-KEY": process.env.DATADOG_API_KEY,
          },
          body: JSON.stringify({
            ddsource: "fixzit",
            service: "web-app",
            hostname: req.headers.get("host") || "unknown",
            level,
            message: sanitizedMessage,
            timestamp: new Date().toISOString(),
            user: session?.user?.email || "anonymous",
            orgId,
            ...context,
          }),
        });
      } catch (ddError) {
        // Silent fail - don't break app if DataDog is unreachable
        logger.error("Failed to send log to DataDog", { error: ddError });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Logging endpoint error", { error });
    return NextResponse.json(
      { error: "Failed to process log" },
      { status: 500 },
    );
  }
}
