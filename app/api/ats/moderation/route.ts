/**
 * @fileoverview Job Moderation Control
 * @description Handles moderation actions on job postings such as approval, rejection, and flagging for review.
 * @route PUT /api/ats/moderation - Update moderation status of a job posting
 * @access Protected - Requires authenticated moderator or admin role
 * @module ats
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Job } from "@/server/models/Job";
import { getUserFromToken } from "@/lib/auth";

import { smartRateLimit } from "@/server/security/rateLimit";
import {
  notFoundError,
  validationError,
  rateLimitError,
  unauthorizedError,
} from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";

/**
 * @openapi
 * /api/ats/moderation:
 *   get:
 *     summary: ats/moderation operations
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
export async function PUT(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();
    const body = await req.json();
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;
    const user = token ? await getUserFromToken(token) : null;

    // Enforce authentication for moderation actions
    if (!user?.id) {
      return unauthorizedError("Authentication required for moderation");
    }

    const { jobId, action } = body;
    if (!jobId || !["approve", "reject"].includes(action))
      return validationError("Invalid request");

    // SECURITY: Use orgId scoping for tenant isolation
    // Ensures users can only moderate jobs within their organization
    // NO_LEAN: Document required for save() method
    // eslint-disable-next-line local/require-lean
    const job = await Job.findOne({ _id: jobId, orgId: user.orgId });
    if (!job) return notFoundError("Job");

    if (action === "approve") {
      job.status = "published";
      job.publishedAt = new Date();
      await job.save();
    } else {
      job.status = "closed";
      await job.save();
    }

    return NextResponse.json({ success: true, data: job });
  } catch (error) {
    logger.error(
      "Moderation error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse({ error: "Failed to moderate job" }, 500, req);
  }
}
