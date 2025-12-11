/**
 * @fileoverview Public Job Posting Creation
 * @description Allows creation of public job postings with validation for title, department, job type, location, and salary range.
 * @route POST /api/ats/public-post - Create a new public job posting
 * @access Rate-limited public endpoint
 * @module ats
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Job } from "@/server/models/Job";
import { generateSlug } from "@/lib/utils";
import { z } from "zod";
import { smartRateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";
import { getClientIP } from "@/server/security/headers";

const publicJobSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200),
  department: z.string().optional(),
  jobType: z
    .enum(["full-time", "part-time", "contract", "temporary", "internship"])
    .optional(),
  location: z
    .object({
      city: z.string().optional(),
      country: z.string().optional(),
      mode: z.enum(["onsite", "remote", "hybrid"]).optional(),
    })
    .optional(),
  salaryRange: z
    .object({
      min: z.number().min(0),
      max: z.number().min(0),
      currency: z.string().default("SAR"),
    })
    .optional(),
  description: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  benefits: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

/**
 * @openapi
 * /api/ats/public-post:
 *   post:
 *     summary: ats/public-post operations
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
export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = await smartRateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();
    const body = await req.json();

    const validation = publicJobSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validation.error.format(),
        },
        { status: 400 },
      );
    }

    const validatedBody = validation.data;

    if (process.env.ATS_ENABLED !== "true") {
      return createSecureResponse({ error: "Feature not available" }, 501, req);
    }

    const platformOrg = process.env.PLATFORM_ORG_ID || "fixzit-platform";

    const baseSlug = generateSlug(validatedBody.title || "job");
    let slug = baseSlug;
    let counter = 1;
    while (await Job.findOne({ orgId: platformOrg, slug }))
      slug = `${baseSlug}-${counter++}`;
    const job = await Job.create({
      orgId: platformOrg,
      title: validatedBody.title,
      department: validatedBody.department || "General",
      jobType: validatedBody.jobType || "full-time",
      location: validatedBody.location || {
        city: "",
        country: "",
        mode: "onsite",
      },
      salaryRange: validatedBody.salaryRange || {
        min: 0,
        max: 0,
        currency: "SAR",
      },
      description: validatedBody.description || "",
      requirements: validatedBody.requirements || [],
      benefits: validatedBody.benefits || [],
      skills: validatedBody.skills || [],
      tags: validatedBody.tags || [],
      status: "pending",
      visibility: "public",
      slug,
      postedBy: "public",
    });
    return NextResponse.json({ success: true, data: job }, { status: 201 });
  } catch (error) {
    logger.error(
      "Public post error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    return createSecureResponse({ error: "Failed to submit job" }, 500, req);
  }
}
