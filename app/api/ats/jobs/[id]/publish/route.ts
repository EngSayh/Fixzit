/**
 * @fileoverview Job Publishing Control
 * @description Controls the publication status of job postings, allowing jobs to be published or unpublished.
 * @route POST /api/ats/jobs/[id]/publish - Publish a job posting
 * @access Protected - Requires jobs:publish permission
 * @module ats
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Job } from "@/server/models/Job";
import { atsRBAC } from "@/lib/ats/rbac";

import { smartRateLimit } from "@/server/security/rateLimit";
import {
  notFoundError,
  validationError,
  rateLimitError,
} from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";

/**
 * @openapi
 * /api/ats/jobs/[id]/publish:
 *   get:
 *     summary: ats/jobs/[id]/publish operations
 *     tags: [ats]
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
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();

    // RBAC: Check permissions
    const authResult = await atsRBAC(req, ["jobs:publish"]);
    if (!authResult.authorized) {
      return authResult.response;
    }
    const { orgId, isSuperAdmin } = authResult;

    // SEC-002 FIX: Scope Job query by orgId upfront (super admins bypass)
    const query = isSuperAdmin ? { _id: (await params).id } : { _id: (await params).id, orgId };
    // eslint-disable-next-line local/require-lean -- NO_LEAN: Document needed for .publish() method
    const job = await Job.findOne(query);
    if (!job) return notFoundError("Job");
    if (job.status === "published")
      return validationError("Job is already published");

    await job.publish();
    return NextResponse.json({
      success: true,
      data: job,
      message: "Job published successfully",
    });
  } catch (error) {
    logger.error(
      "Job publish error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse({ error: "Failed to publish job" }, 500, req);
  }
}
