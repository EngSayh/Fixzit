/**
 * SMS SLA Monitor Cron Endpoint
 *
 * Triggered by cron job to check for SLA breaches and send notifications.
 * Should be scheduled to run every 1-5 minutes.
 *
 * @module app/api/jobs/sms-sla-monitor/route
 */

import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { verifySecretHeader } from "@/lib/security/verify-secret-header";
import { processSLABreaches, getSLABreachStats } from "@/lib/jobs/sms-sla-monitor";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";

/**
 * POST /api/jobs/sms-sla-monitor
 *
 * Run SLA breach check and send notifications
 * Requires either admin session or cron secret
 */
export async function POST(request: NextRequest) {
  try {
    const correlationId = request.headers.get("x-correlation-id") || randomUUID();
    const clientIp = getClientIP(request);
    const rl = await smartRateLimit(`/api/jobs/sms-sla-monitor:${clientIp}:POST`, 20, 60_000);
    if (!rl.allowed) {
      return rateLimitError();
    }

    const session = await auth();

    // Allow both authenticated admins and cron jobs (with secret)
    const cronAuthorized = verifySecretHeader(
      request,
      "x-cron-secret",
      process.env.CRON_SECRET,
    );
    const isSuperAdmin =
      (session?.user?.role || "").toUpperCase() === "SUPER_ADMIN" ||
      session?.user?.isSuperAdmin === true;
    const isAuthorized = isSuperAdmin || cronAuthorized;

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    logger.info("[SLA Monitor] Starting breach check", {
      triggeredBy: cronAuthorized ? "cron" : session?.user?.email,
      correlationId,
    });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      body = undefined;
    }
    const { orgId, limit }: { orgId?: string; limit?: number } =
      body && typeof body === "object" ? (body as Record<string, unknown>) : {};

    const report = await processSLABreaches({
      orgId,
      limit: typeof limit === "number" && limit > 0 ? limit : undefined,
    });

    const res = NextResponse.json({
      success: true,
      report,
    });
    res.headers.set("x-correlation-id", correlationId);
    res.headers.set("X-RateLimit-Limit", "20");
    res.headers.set("X-RateLimit-Remaining", rl.remaining.toString());
    return res;
  } catch (error) {
    logger.error("[SLA Monitor] Endpoint error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs/sms-sla-monitor
 *
 * Get SLA breach statistics (requires admin)
 */
export async function GET(request: NextRequest) {
  try {
    const correlationId = request.headers.get("x-correlation-id") || randomUUID();
    const clientIp = getClientIP(request);
    const url = new URL(request.url);
    const orgId = url.searchParams.get("orgId") || undefined;
    const rl = await smartRateLimit(
      `/api/jobs/sms-sla-monitor:${clientIp}:${orgId ?? "all"}:GET`,
      30,
      60_000
    );
    if (!rl.allowed) {
      return rateLimitError();
    }

    const session = await auth();

    const isSuperAdmin =
      (session?.user?.role || "").toUpperCase() === "SUPER_ADMIN" ||
      session?.user?.isSuperAdmin === true;
    if (!isSuperAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sinceParam = url.searchParams.get("since");
    const since = sinceParam ? new Date(sinceParam) : undefined;

    const stats = await getSLABreachStats(orgId, since);

    const res = NextResponse.json({
      success: true,
      stats,
    });
    res.headers.set("x-correlation-id", correlationId);
    res.headers.set("X-RateLimit-Limit", "30");
    res.headers.set("X-RateLimit-Remaining", rl.remaining.toString());
    return res;
  } catch (error) {
    logger.error("[SLA Monitor] Stats endpoint error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
