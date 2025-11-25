import { NextResponse } from "next/server";
import { getMetricsRegistry } from "@/lib/monitoring/metrics-registry";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET() {
  try {
    const registry = getMetricsRegistry();
    const body = await registry.metrics();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": registry.contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logger.error("[Metrics] Failed to render /api/metrics payload", { error });
    return new NextResponse("metrics_unavailable", { status: 500 });
  }
}
