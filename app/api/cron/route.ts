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
 * 
 * @response
 * - success: boolean
 * - executedAt: ISO timestamp
 * 
 * @see https://vercel.com/docs/cron-jobs
 */
<<<<<<< HEAD
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { JobQueue } from "@/lib/jobs/queue";
import { connectToDatabase } from "@/lib/mongodb-unified";
=======
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
>>>>>>> origin/main

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("Authorization");
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
<<<<<<< HEAD
    logger.error("[Cron] CRON_SECRET not configured");
=======
    logger.error('CRON_SECRET not configured', { component: 'cron', action: 'auth' });
>>>>>>> origin/main
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  if (authHeader !== expectedAuth) {
<<<<<<< HEAD
    logger.warn("[Cron] Unauthorized access attempt");
=======
    logger.warn('Unauthorized access attempt', { component: 'cron', action: 'auth' });
>>>>>>> origin/main
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    await connectToDatabase();

<<<<<<< HEAD
    const [retried, cleaned] = await Promise.all([
      JobQueue.retryStuckJobs(),
      JobQueue.cleanupOldJobs(30),
    ]);

    logger.info("[Cron] Job executed successfully", {
      retried,
      cleaned,
    });
=======
    logger.info('Cron job executed successfully', { component: 'cron', action: 'execute' });
>>>>>>> origin/main

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      message: "Cron job executed successfully",
      jobs: { retried, cleaned },
    });
  } catch (error) {
<<<<<<< HEAD
    logger.error("[Cron] Job execution failed", { error });
=======
    logger.error('Cron job execution failed', { component: 'cron', action: 'execute', error });
>>>>>>> origin/main
    return NextResponse.json(
      {
        error: "Internal server error",
        ok: false,
      },
      { status: 500 },
    );
  }
}
