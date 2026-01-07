import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAllCounters } from "@/lib/queries";
import { logger } from "@/lib/logger";
import { isTruthy } from "@/lib/utils/env";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

/**
 * GET /api/counters - Fetch live dashboard counters
 *
 * Returns aggregated counts from MongoDB for:
 * - Work orders, invoices, employees, properties
 * - CRM, support, marketplace, system metrics
 *
 * Used by ClientSidebar for badge display and dashboard KPIs
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 60, windowMs: 60_000, keyPrefix: "counters" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Offline/CI mode: avoid DB lookups to prevent 500s
    if (isTruthy(process.env.ALLOW_OFFLINE_MONGODB)) {
      return NextResponse.json({}, { status: 200 });
    }

    const session = await auth();
    if (!session?.user) {
      // Guest: return empty counters to avoid 401 noise on public/unauth pages
      return NextResponse.json({}, { status: 200 });
    }

    const orgId = (session.user as { orgId?: string }).orgId;
    if (!orgId) {
      return NextResponse.json(
        { error: "Organization ID not found" },
        { status: 400 },
      );
    }

    const counters = await getAllCounters(orgId);

    return NextResponse.json(counters);
  } catch (error) {
    logger.error("GET /api/counters error", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch counters" },
      { status: 500 },
    );
  }
}
