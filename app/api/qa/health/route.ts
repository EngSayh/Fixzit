/**
 * @fileoverview System Health Diagnostics
 * @description Provides health check endpoint for database connectivity and system status monitoring
 * @route GET /api/qa/health - Get system health status and database connection state
 * @access Private - SUPER_ADMIN only
 * @module qa
 */
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { smartRateLimit, buildOrgAwareRateLimitKey } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import type mongoose from "mongoose";
import { requireSuperAdmin } from "@/lib/authz";

type ConnectFn = () => Promise<typeof mongoose>;

async function getDatabaseConnection() {
  const mock = (globalThis as Record<string, unknown>).__connectToDatabaseMock;
  const override = typeof mock === "function" ? (mock as ConnectFn) : undefined;
  if (typeof override === "function") {
    return override();
  }
  const { connectToDatabase } = await import("@/lib/mongodb-unified");
  return connectToDatabase();
}

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

/**
 * @openapi
 * /api/qa/health:
 *   get:
 *     summary: qa/health operations
 *     tags: [qa]
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
export async function GET(req: NextRequest) {
  // Require SUPER_ADMIN to access health diagnostics
  let authContext: { id: string; tenantId: string } | null = null;
  try {
    authContext = await requireSuperAdmin(req);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }

  // SECURITY: Require tenant context before using it in rate-limit key (org isolation)
  if (!authContext?.tenantId) {
    return NextResponse.json({ error: "Missing organization context" }, { status: 400 });
  }

  // Rate limiting - org-aware key for tenant isolation
  const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, authContext.tenantId, authContext.id), 60, 60_000);
  if (!rl.allowed) return rateLimitError();

  const healthStatus = {
    timestamp: new Date().toISOString(),
    status: "healthy",
    database: "unknown",
    memory: "unknown",
    uptime: process.uptime(),
    version: process.env.npm_package_version || "unknown",
    mockDatabase: false,
  };

  // Check database connectivity
  try {
    const mongoose = await getDatabaseConnection();
    healthStatus.database = "connected";

    const db = mongoose?.connection?.db;
    if (db?.listCollections) {
      try {
        const collections = await db.listCollections().toArray();
        const count = Array.isArray(collections) ? collections.length : 0;
        const label = count === 1 ? "collection" : "collections";
        healthStatus.database = `connected (${count} ${label})`;
      } catch {
        healthStatus.database = "connected (query failed)";
      }
    }
  } catch (error) {
    healthStatus.status = "critical";
    healthStatus.database = "disconnected";
    logger.error("Database health check failed", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }

  // Check memory usage
  try {
    const memUsage = process.memoryUsage();
    healthStatus.memory = `RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB, Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`;
  } catch {
    healthStatus.memory = "unknown";
  }

  // Determine overall status
  if (healthStatus.database === "disconnected") {
    healthStatus.status = "critical";
  } else if (
    healthStatus.database.startsWith("connected") ||
    healthStatus.database === "mock-connected"
  ) {
    healthStatus.status = "healthy";
  } else {
    healthStatus.status = "degraded";
  }

  const statusCode =
    healthStatus.status === "healthy"
      ? 200
      : healthStatus.status === "degraded"
        ? 206
        : 503;

  return NextResponse.json(healthStatus, { status: statusCode });
}

export async function POST(req: NextRequest) {
  // Require SUPER_ADMIN to trigger reconnects
  let authContext: { id: string; tenantId: string } | null = null;
  try {
    authContext = await requireSuperAdmin(req);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }

  // SECURITY: Require tenant context before using it in rate-limit key (org isolation)
  if (!authContext?.tenantId) {
    return NextResponse.json({ error: "Missing organization context" }, { status: 400 });
  }

  // Rate limiting - org-aware key for tenant isolation
  const rl = await smartRateLimit(buildOrgAwareRateLimitKey(req, authContext.tenantId, authContext.id), 60, 60_000);
  if (!rl.allowed) return rateLimitError();

  // Force database reconnection
  try {
    await getDatabaseConnection();
    return NextResponse.json({
      success: true,
      message: "Database reconnected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to reconnect database",
        details: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
