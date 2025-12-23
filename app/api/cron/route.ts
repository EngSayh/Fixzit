/**
 * Vercel Cron Job Handler API Route
 * GET /api/cron - Execute scheduled background tasks
 * 
 * Triggered by Vercel Cron on schedule defined in vercel.json.
 * Protected by CRON_SECRET authorization header to prevent unauthorized access.
 * Currently configured for placeholder/maintenance tasks.
 * 
 * @module app/api/cron/route
 * @requires CRON_SECRET environment variable
 * 
 * @security
 * - Authorization: Bearer <CRON_SECRET> header required
 * - Only accessible via Vercel Cron system
 * - Returns 401 if secret missing or invalid
 * - Uses constant-time comparison to prevent timing attacks
 * 
 * @response
 * - ok: boolean
 * - timestamp: ISO timestamp
 * - message: string
 * - jobs: { retried: number, cleaned: number }
 *
 * @see https://vercel.com/docs/cron-jobs
 */
import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { JobQueue } from "@/lib/jobs/queue";
import { connectToDatabase } from "@/lib/mongodb-unified";

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("Authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error("[Cron] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const expectedAuth = `Bearer ${cronSecret}`;

  // Use constant-time comparison to prevent timing attacks
  if (
    !authHeader ||
    authHeader.length !== expectedAuth.length ||
    !crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expectedAuth))
  ) {
    logger.warn("[Cron] Unauthorized access attempt");
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    await connectToDatabase();

    const [retried, cleaned] = await Promise.all([
      JobQueue.retryStuckJobs(),
      JobQueue.cleanupOldJobs(30),
    ]);

    logger.info("[Cron] Job executed successfully", {
      retried,
      cleaned,
    });

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      message: "Cron job executed successfully",
      jobs: { retried, cleaned },
    });
  } catch (error) {
    logger.error("[Cron] Job execution failed", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
        ok: false,
      },
      { status: 500 },
    );
  }
}
