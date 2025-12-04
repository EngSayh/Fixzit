/**
 * Health Check Endpoint
 * GET /api/health
 *
 * Returns server health status for monitoring and E2E test readiness checks.
 * 
 * SECURITY: Deep diagnostics only exposed when X-Health-Token header matches
 * HEALTH_CHECK_TOKEN env variable. See env.example for configuration.
 * 
 * RELIABILITY: DB liveness check uses withTimeout to avoid hanging on stale
 * connections. All callers (authorized or not) get an accurate health status.
 */
import { NextRequest } from "next/server";
import { db } from "@/lib/mongo";
import { logger } from "@/lib/logger";
import { isAuthorizedHealthRequest } from "@/server/security/health-token";
import { createSecureResponse } from "@/server/security/headers";
import { withTimeout } from "@/lib/resilience";
import { COLLECTIONS } from "@/lib/db/collections";

export const dynamic = "force-dynamic";

// DB ping timeout - short to avoid hanging health checks
const DB_PING_TIMEOUT_MS = 2_000;

export async function GET(request: NextRequest) {
  try {
    const isAuthorized = isAuthorizedHealthRequest(request);
    
    // Check database connection with timeout to avoid false positives from stale connections
    let dbStatus: "connected" | "disconnected" | "error" | "timeout" = "disconnected";
    let dbLatency = 0;

    const dbStart = Date.now();
    try {
      const connection = await db;
      
      // Verify connection by attempting an actual DB operation (not just checking method exists)
      // This runs for ALL callers to ensure accurate health status for LB/monitors
      if (connection && typeof connection.collection === "function") {
        await withTimeout(
          async (_signal: AbortSignal) => {
            // Use a simple findOne on users collection as a lightweight liveness check
            // This verifies actual DB connectivity, not just that the handle exists
            await connection.collection(COLLECTIONS.USERS).findOne({});
          },
          { timeoutMs: DB_PING_TIMEOUT_MS }
        );
        dbStatus = "connected";
        dbLatency = Date.now() - dbStart;
      }
    } catch (dbError) {
      dbLatency = Date.now() - dbStart;
      const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      
      if (errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
        dbStatus = "timeout";
        logger.warn("[Health Check] Database ping timeout", { latency: dbLatency });
      } else {
        dbStatus = "error";
        logger.error("[Health Check] Database error", dbError as Error);
      }
    }

    const isHealthy = dbStatus === "connected";
    
    const health = {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      // Always include basic DB status for monitoring (not sensitive)
      database: dbStatus,
      // Authorized callers get detailed diagnostics
      ...(isAuthorized && {
        diagnostics: {
          database: {
            status: dbStatus,
            latencyMs: dbLatency,
          },
          memory: {
            usedMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            totalMB: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            rssMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
          },
          environment: process.env.NODE_ENV || "development",
          version: process.env.npm_package_version || "unknown",
        },
      }),
    };

    const statusCode = isHealthy ? 200 : 503;

    return createSecureResponse(health, statusCode, request);
  } catch (error) {
    logger.error("[Health Check] Error", error as Error);
    return createSecureResponse(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        database: "error",
        error: process.env.NODE_ENV === "development" 
          ? (error instanceof Error ? error.message : "Unknown error")
          : "Internal error",
      },
      503,
      request,
    );
  }
}
