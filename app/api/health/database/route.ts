/**
 * @fileoverview Database Health Check Endpoint
 * @description Returns MongoDB connection status and response time. Authorized callers receive extended diagnostics.
 * @route GET /api/health/database - Database connectivity health check
 * @access Public (detailed info requires X-Health-Token)
 * @module health
 */

import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { checkDatabaseHealth, getDatabase } from "@/lib/mongodb-unified";
import { createSecureResponse } from "@/server/security/headers";
import { isAuthorizedHealthRequest } from "@/server/security/health-token";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";

/**
 * @openapi
 * /api/health/database:
 *   get:
 *     summary: health/database operations
 *     tags: [health]
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
export async function GET(request: NextRequest) {
  const rateLimitResponse = enforceRateLimit(request, { requests: 120, windowMs: 60_000, keyPrefix: "health:database" });
  if (rateLimitResponse) return rateLimitResponse;

  const startTime = Date.now();
  const isAuthorized = isAuthorizedHealthRequest(request);

  try {
    const isConnected = await checkDatabaseHealth();

    if (!isConnected) {
      const payload = {
        status: "unhealthy",
        database: "mongodb",
        connection: "failed",
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
      };
      return createSecureResponse(payload, 503, request);
    }

    const db = await getDatabase();
    const pingResult = await db.admin().ping();

    const responseTime = Date.now() - startTime;

    const basePayload = {
      status: "healthy",
      database: "mongodb",
      connection: "active",
      timestamp: new Date().toISOString(),
      responseTime,
    };

    if (!isAuthorized) {
      return createSecureResponse(basePayload, 200, request);
    }

    return createSecureResponse(
      {
        ...basePayload,
        details: {
          ping: pingResult,
          database: db.databaseName,
        },
      },
      200,
      request,
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error(
      "Database health check failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return createSecureResponse(
      {
        status: "unhealthy",
        database: "mongodb",
        connection: "error",
        timestamp: new Date().toISOString(),
        responseTime,
        error: "Database connection failed",
      },
      503,
      request,
    );
  }
}

export async function HEAD(request: NextRequest) {
  try {
    const isHealthy = await checkDatabaseHealth();
    return createSecureResponse(
      null,
      isHealthy ? 200 : 503,
      request,
      {
        "X-Health-Status": isHealthy ? "healthy" : "unhealthy",
      },
    );
  } catch {
    return createSecureResponse(
      null,
      503,
      request,
      {
        "X-Health-Status": "error",
      },
    );
  }
}
