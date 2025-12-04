/**
 * Health Check Endpoint
 * GET /api/health
 *
 * Returns server health status for monitoring and E2E test readiness checks
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/mongo";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

function isAuthorizedInternal(request: NextRequest): boolean {
  const token = process.env.HEALTH_CHECK_TOKEN;
  if (!token) return false;
  const provided =
    request.headers.get("x-health-token") || request.headers.get("X-Health-Token");
  return provided === token;
}

export async function GET(request: NextRequest) {
  try {
    const isAuthorized = isAuthorizedInternal(request);
    // Check database connection
    let dbStatus = "disconnected";
    let dbLatency = 0;

    const dbStart = Date.now();
    try {
      const connection = await db;
      // Verify connection by checking if collection method exists
      if (connection && typeof connection.collection === "function") {
        dbStatus = "connected";
        dbLatency = Date.now() - dbStart;
      } else {
        dbStatus = "disconnected";
      }
    } catch (dbError) {
      dbStatus = "error";
      logger.error("[Health Check] Database error", { error: dbError });
    }

    const health = {
      status: dbStatus === "connected" ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      ...(isAuthorized && {
        database: {
          status: dbStatus,
          latency: dbLatency,
        },
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: "MB",
        },
        environment: process.env.NODE_ENV || "development",
      }),
    };

    const statusCode = health.status === "healthy" ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    logger.error("[Health Check] Error", { error });
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
