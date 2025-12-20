/**
 * Performance Metrics API Endpoint
 *
 * GET /api/performance/metrics
 *
 * Returns current performance statistics and recent metrics
 * 
 * SECURITY: Restricted to SUPER_ADMIN only - exposes internal system metrics
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getPerformanceStats,
  getRecentMetrics,
  getExceededMetrics,
} from "@/lib/performance";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { isUnauthorizedError } from "@/server/utils/isUnauthorizedError";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

export async function GET(req: NextRequest) {
  enforceRateLimit(req, { requests: 60, windowMs: 60_000, keyPrefix: "performance:metrics" });
  // SEC-001: Restrict to SUPER_ADMIN - performance metrics expose internal system info
  try {
    const session = await getSessionUser(req);
    if (session.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - SUPER_ADMIN access required" },
        { status: 403 }
      );
    }
  } catch (error) {
    if (isUnauthorizedError(error)) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    throw error;
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "stats";
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "100", 10),
      1000,
    );

    switch (type) {
      case "stats":
        return NextResponse.json({
          success: true,
          data: getPerformanceStats(),
        });

      case "recent":
        return NextResponse.json({
          success: true,
          data: getRecentMetrics(limit),
        });

      case "exceeded":
        return NextResponse.json({
          success: true,
          data: getExceededMetrics(),
        });

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Invalid type parameter. Use: stats, recent, or exceeded",
          },
          { status: 400 },
        );
    }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}

export const runtime = "nodejs";
