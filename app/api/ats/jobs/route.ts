import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Job } from "@/server/models/Job";
import { generateSlug } from "@/lib/utils";
import { atsRBAC } from "@/lib/ats/rbac";
import { getServerTranslation } from "@/lib/i18n/server";

import { rateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";
/**
 * @openapi
 * /api/ats/jobs:
 *   get:
 *     summary: ats/jobs operations
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
export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();

    // RBAC: Check permissions for reading jobs
    const authResult = await atsRBAC(req, ["jobs:read"]);
    if (!authResult.authorized) {
      return authResult.response;
    }
    const { orgId } = authResult;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const status = searchParams.get("status") || "published";
    // REMOVED: const orgId = searchParams.get('orgId') - SECURITY VIOLATION
    const department = searchParams.get("department");
    const location = searchParams.get("location");
    const jobType = searchParams.get("jobType");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      100,
    );

    const filter: Record<string, unknown> = { orgId };
    if (status !== "all") filter.status = status;
    if (department) filter.department = department;
    if (location) filter["location.city"] = location;
    if (jobType) filter.jobType = jobType;
    if (q) filter.$text = { $search: q };

    const jobs = await Job.find(
      filter,
      q ? { score: { $meta: "textScore" } } : {},
    )
      .sort(
        q
          ? { score: { $meta: "textScore" } }
          : { publishedAt: -1, createdAt: -1 },
      )
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const total = await Job.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: jobs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error(
      "Jobs list error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    const t = await getServerTranslation(req);
    return NextResponse.json(
      { success: false, error: t("ats.errors.jobsFetchFailed") },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();
    const body = await req.json();

    // RBAC: Check permissions for creating jobs
    const authResult = await atsRBAC(req, ["jobs:create"]);
    if (!authResult.authorized) {
      return authResult.response;
    }
    const { userId, orgId, atsModule } = authResult;

    if (!body?.title) {
      return NextResponse.json(
        { success: false, error: "Job title is required" },
        { status: 400 },
      );
    }

    const jobPostLimit = atsModule?.jobPostLimit ?? Number.MAX_SAFE_INTEGER;
    const shouldEnforceLimit =
      Number.isFinite(jobPostLimit) && jobPostLimit !== Number.MAX_SAFE_INTEGER;
    if (shouldEnforceLimit) {
      const activeJobCount = await Job.countDocuments({
        orgId,
        status: { $in: ["pending", "published"] },
      });

      if (activeJobCount >= jobPostLimit) {
        const t = await getServerTranslation(req);
        return NextResponse.json(
          {
            success: false,
            error: t("ats.errors.jobPostLimitExceeded"),
            limit: jobPostLimit,
            count: activeJobCount,
          },
          { status: 403 },
        );
      }
    }

    const baseSlug = generateSlug(body.title);
    let slug = baseSlug;
    let counter = 1;
    while (await Job.findOne({ orgId, slug })) {
      slug = `${baseSlug}-${counter++}`;
    }

    const job = await Job.create({
      ...body,
      orgId,
      slug,
      postedBy: userId,
      status: body.status || "draft",
    });
    return NextResponse.json({ success: true, data: job }, { status: 201 });
  } catch (error) {
    logger.error(
      "Job creation error:",
      error instanceof Error ? error.message : "Unknown error",
    );
    const t = await getServerTranslation(req);
    return NextResponse.json(
      { success: false, error: t("ats.errors.jobCreationFailed") },
      { status: 500 },
    );
  }
}
