import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { checkDatabaseHealth, getDatabase } from "@/lib/mongodb-unified";

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
export async function GET() {
  const startTime = Date.now();

  try {
    const isConnected = await checkDatabaseHealth();

    if (!isConnected) {
      return NextResponse.json(
        {
          status: "unhealthy",
          database: "mongodb",
          connection: "failed",
          timestamp: new Date().toISOString(),
          responseTime: Date.now() - startTime,
        },
        { status: 503 },
      );
    }

    const db = await getDatabase();
    const pingResult = await db.admin().ping();

    const responseTime = Date.now() - startTime;

    return NextResponse.json({
      status: "healthy",
      database: "mongodb",
      connection: "active",
      timestamp: new Date().toISOString(),
      responseTime,
      details: {
        ping: pingResult,
        database: db.databaseName,
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error(
      "Database health check failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    return NextResponse.json(
      {
        status: "unhealthy",
        database: "mongodb",
        connection: "error",
        timestamp: new Date().toISOString(),
        responseTime,
        error: "Database connection failed",
      },
      { status: 503 },
    );
  }
}

export async function HEAD() {
  try {
    const isHealthy = await checkDatabaseHealth();
    return new NextResponse(null, {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Health-Status": isHealthy ? "healthy" : "unhealthy",
      },
    });
  } catch {
    return new NextResponse(null, {
      status: 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Health-Status": "error",
      },
    });
  }
}
