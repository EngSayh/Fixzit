import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectMongo } from "@/lib/mongo";
import { Job } from "@/server/models/Job";
import { Candidate } from "@/server/models/Candidate";
import { Application } from "@/server/models/Application";

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
 * /api/integrations/linkedin/apply:
 *   get:
 *     summary: integrations/linkedin/apply operations
 *     tags: [integrations]
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
export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    // Check if LinkedIn integration is enabled
    if (process.env.ATS_ENABLED !== "true") {
      return createSecureResponse(
        { error: "LinkedIn integration not available in this deployment" },
        501,
        req,
      );
    }

    await connectMongo();
    const { jobSlug, profile, answers } = await req.json();
    if (!jobSlug || !profile?.email) return validationError("Missing fields");

    const job = await Job.findOne({
      slug: jobSlug,
      status: "published",
    }).lean();
    if (!job) return notFoundError("Job");

    let candidate = await Candidate.findByEmail(job.orgId, profile.email);
    if (!candidate) {
      candidate = await Candidate.create({
        orgId: job.orgId,
        firstName: profile.firstName,
        lastName: profile.lastName || "NA",
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        linkedin: profile.linkedinUrl,
        source: "linkedin",
      });
    }

    if (!candidate) {
      return NextResponse.json(
        { success: false, error: "Failed to create candidate" },
        { status: 500 },
      );
    }

    const orgId = job.orgId;
    const jobId = job._id;

    const dup = await Application.findOne({
      orgId,
      jobId,
      candidateId: candidate._id,
    });
    if (dup)
      return NextResponse.json({
        success: true,
        data: { applicationId: dup._id, message: "Already applied" },
      });

    const app = await Application.create({
      orgId,
      jobId,
      candidateId: candidate._id,
      stage: "applied",
      score: 0,
      source: "linkedin",
      answers: answers || [],
      candidateSnapshot: {
        fullName: `${candidate.firstName} ${candidate.lastName}`,
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.location,
        skills: candidate.skills || [],
        experience: candidate.experience || 0,
      },
      history: [{ action: "applied", by: "candidate", at: new Date() }],
    });

    return NextResponse.json(
      { success: true, data: { applicationId: app._id } },
      { status: 201 },
    );
  } catch (error) {
    logger.error(
      "LinkedIn apply error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse(
      { error: "Failed to apply with LinkedIn" },
      500,
      req,
    );
  }
}
