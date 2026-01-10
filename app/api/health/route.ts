/**
 * @fileoverview Main Health Check Endpoint
 * @description Returns overall server health status including database connectivity. Used for monitoring and E2E test readiness checks.
 * @route GET /api/health - Primary health check endpoint
 * @access Public (detailed diagnostics require X-Health-Token)
 * @module health
 */

import { NextRequest } from "next/server";
import { pingDatabase } from "@/lib/mongodb-unified";
import { logger } from "@/lib/logger";
import { isAuthorizedHealthRequest } from "@/server/security/health-token";
import { createSecureResponse } from "@/server/security/headers";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

export const dynamic = "force-dynamic";

// Ping timeout - short to avoid hanging health checks
const PING_TIMEOUT_MS = 2_000;

export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 120, windowMs: 60_000, keyPrefix: "health:main" });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const isAuthorized = isAuthorizedHealthRequest(request);
    
    // Check database connection using pingDatabase for reliable health checking
    let dbStatus: "connected" | "disconnected" | "error" | "timeout" = "disconnected";
    let dbLatency = 0;

    const pingResult = await pingDatabase(PING_TIMEOUT_MS);
    dbLatency = pingResult.latencyMs;
    
    if (pingResult.ok) {
      dbStatus = "connected";
    } else if (pingResult.error?.includes("timeout") || pingResult.error?.includes("Timeout")) {
      dbStatus = "timeout";
      logger.warn("[Health Check] Database ping timeout", { latency: dbLatency, error: pingResult.error });
    } else {
      dbStatus = "error";
      logger.error("[Health Check] Database error", { error: pingResult.error, latency: dbLatency });
    }

    const isHealthy = dbStatus === "connected";
    
    const health = {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 9) || process.env.GIT_COMMIT_SHA?.slice(0, 9) || "unknown",
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
          commit: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT_SHA || "unknown",
          features: {
            superadminBypass: true, // Confirms ClientLayout superadmin bypass is deployed
            localeNormalization: true, // Confirms normalizeLocale() is deployed
            currencySelector: true, // Confirms BRAND-001 fix deployed
            dynamicUsername: true, // Confirms BRAND-003 fix deployed
            universalFooter: true, // Confirms BRAND-002 fix deployed
          },
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
