import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { Config } from "@/lib/config/constants";
import { parseBodySafe } from "@/lib/api/parse-body";
import { logger } from "@/lib/logger";
import { JobQueue, Job } from "@/lib/jobs/queue";
import sgMail from "@sendgrid/mail";
import { getSendGridConfig } from "@/config/sendgrid.config";
import { deleteObject } from "@/lib/storage/s3";
import { DOMAINS } from "@/lib/config/domains";
import { joinUrl } from "@/lib/utils/url";
import { verifySecretHeader } from "@/lib/security/verify-secret-header";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { getSuperadminSession } from "@/lib/superadmin/auth";
import { BRAND_COLORS, NEUTRAL_COLORS } from "@/lib/config/brand-colors";

/**
 * POST /api/jobs/process
 *
 * Background job processor endpoint
 * Processes queued jobs: email invitations, S3 cleanup, etc.
 *
 * Can be triggered manually or by a cron job
 */
export async function POST(request: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(request, { requests: 20, windowMs: 60_000, keyPrefix: "jobs:process" });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }
  try {
    const session = await auth();
    const superadminSession = await getSuperadminSession(request);

    // Allow authenticated admins, superadmin portal users, and cron jobs (with secret)
    const cronAuthorized = verifySecretHeader(
      request,
      "x-cron-secret",
      process.env.CRON_SECRET,
    );
    // Simplified auth: check role directly (SUPER_ADMIN role implies isSuperAdmin)
    const userRole = session?.user?.role;
    const isAuthorized = userRole === "SUPER_ADMIN" || userRole === "ADMIN" || !!superadminSession || cronAuthorized;

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden - Superadmin access required" }, { status: 403 });
    }

    const { data: body, error: parseError } = await parseBodySafe<{ type?: string; maxJobs?: number; retryStuckJobs?: boolean }>(request, { logPrefix: "[jobs:process]" });
    if (parseError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const jobType = body?.type as Parameters<typeof JobQueue.claimJob>[0]; // Optional: process specific job type only
    const maxJobs = body?.maxJobs ?? 10;
    const shouldRetryStuckJobs = body?.retryStuckJobs ?? maxJobs > 0;

    const processed: { success: string[]; failed: string[] } = {
      success: [],
      failed: [],
    };

    // Process jobs
    for (let i = 0; i < maxJobs; i++) {
      const job = await JobQueue.claimJob(jobType);
      if (!job) break;

      try {
        await processJob(job);
        await JobQueue.completeJob(job._id.toString());
        processed.success.push(job._id.toString());
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        await JobQueue.failJob(job._id.toString(), errorMessage);
        processed.failed.push(job._id.toString());
      }
    }

    // Retry stuck jobs only if explicitly requested or processing jobs
    const retriedCount = shouldRetryStuckJobs ? await JobQueue.retryStuckJobs() : 0;

    // Get current stats
    const stats = await JobQueue.getStats();

    return NextResponse.json({
      success: true,
      processed: {
        success: processed.success.length,
        failed: processed.failed.length,
        total: processed.success.length + processed.failed.length,
      },
      retried: retriedCount,
      stats,
    });
  } catch (error) {
    logger.error("Job processor error", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Process a single job based on its type
 */
async function processJob(job: Job): Promise<void> {
  logger.info("Processing job", { jobId: job._id.toString(), type: job.type });

  switch (job.type) {
    case "email-invitation":
      await processEmailInvitation(job);
      break;

    case "email-notification":
      await processEmailNotification(job);
      break;

    case "s3-cleanup":
      await processS3Cleanup(job);
      break;

    default:
      logger.warn("Unknown job type", {
        jobId: job._id.toString(),
        type: job.type,
      });
      throw new Error(`Unknown job type: ${job.type}`);
  }
}

/**
 * Process email invitation job
 */
async function processEmailInvitation(job: Job): Promise<void> {
  const { email, firstName, lastName, role, inviteId } = job.payload;

  if (!email || !firstName || !lastName || !role) {
    throw new Error("Missing required email invitation fields");
  }

  // Check if SendGrid is configured
  const config = getSendGridConfig();
  if (!config.apiKey) {
    logger.warn("SendGrid not configured, skipping email invitation", {
      inviteId,
    });
    return; // Don't fail the job if email service is not set up
  }

  sgMail.setApiKey(config.apiKey);

  const baseAppUrl = Config.app.url || DOMAINS.app || DOMAINS.primary;
  const inviteLink = joinUrl(baseAppUrl, `/signup?invite=${inviteId}`);

  const emailContent = {
    to: email as string,
    from: config.from.email,
    subject: `دعوة للانضمام إلى Fixzit | Invitation to join Fixzit`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>مرحباً ${firstName} ${lastName}!</h2>
        <p>تمت دعوتك للانضمام إلى منصة Fixzit بصفة <strong>${role}</strong>.</p>
        <p>
          <a href="${inviteLink}" style="background-color: ${BRAND_COLORS.primary}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            قبول الدعوة
          </a>
        </p>
        <hr style="margin: 30px 0; border: 1px solid ${NEUTRAL_COLORS.border};">
        <div dir="ltr">
          <h2>Hello ${firstName} ${lastName}!</h2>
          <p>You've been invited to join Fixzit platform as <strong>${role}</strong>.</p>
          <p>
            <a href="${inviteLink}" style="background-color: ${BRAND_COLORS.primary}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Accept Invitation
            </a>
          </p>
        </div>
        <hr style="margin: 30px 0; border: 1px solid ${NEUTRAL_COLORS.border};">
        <p style="color: ${NEUTRAL_COLORS.textSecondary}; font-size: 12px;">
          إذا لم تطلب هذه الدعوة، يمكنك تجاهل هذه الرسالة بأمان.<br>
          If you didn't request this invitation, you can safely ignore this email.
        </p>
      </div>
    `,
  };

  await sgMail.send(emailContent);
  logger.info("Invitation email sent", { email, inviteId });
}

/**
 * Process generic email notification job
 */
async function processEmailNotification(job: Job): Promise<void> {
  const { to, subject, html } = job.payload;

  if (!to || !subject || !html) {
    throw new Error("Missing required email notification fields");
  }

  const config = getSendGridConfig();
  if (!config.apiKey) {
    logger.warn("SendGrid not configured, skipping email notification");
    return;
  }

  sgMail.setApiKey(config.apiKey);

  await sgMail.send({
    to: to as string,
    from: config.from.email,
    subject: subject as string,
    html: html as string,
  });

  logger.info("Notification email sent", { to, subject });
}

/**
 * Process S3 cleanup job
 */
async function processS3Cleanup(job: Job): Promise<void> {
  const { keys } = job.payload;

  if (!Array.isArray(keys) || keys.length === 0) {
    throw new Error("Missing S3 keys for cleanup");
  }

  const results = {
    success: 0,
    failed: 0,
  };

  for (const key of keys) {
    try {
      await deleteObject(key as string);
      results.success++;
    } catch (error) {
      logger.error("Failed to delete S3 object", error as Error, { key });
      results.failed++;
    }
  }

  logger.info("S3 cleanup completed", results);

  // If any deletions failed, throw error to retry the job (idempotent deletes are safe)
  if (results.failed > 0) {
    throw new Error(
      `Failed to delete ${results.failed} of ${keys.length} S3 objects`,
    );
  }
}

/**
 * GET /api/jobs/process
 *
 * Get job queue statistics
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(request, {
    requests: 30,
    windowMs: 60_000,
    keyPrefix: "jobs:stats",
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const session = await auth();
    const superadminSession = await getSuperadminSession(request);

    // Allow both regular SUPER_ADMIN role and superadmin portal session
    const isAuthorized = session?.user?.isSuperAdmin || !!superadminSession;

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden - Superadmin access required" }, { status: 403 });
    }

    const stats = await JobQueue.getStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    logger.error("Job stats error", error as Error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
