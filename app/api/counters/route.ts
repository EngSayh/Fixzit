import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAllCounters } from "@/lib/queries";
import { logger } from "@/lib/logger";

/**
 * GET /api/counters - Fetch live dashboard counters
 *
 * Returns aggregated counts from MongoDB for:
 * - Work orders, invoices, employees, properties
 * - CRM, support, marketplace, system metrics
 *
 * Used by ClientSidebar for badge display and dashboard KPIs
 */
export async function GET() {
  try {
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
    logger.error("GET /api/counters error", { error });
    return NextResponse.json(
      { error: "Failed to fetch counters" },
      { status: 500 },
    );
  }
}
