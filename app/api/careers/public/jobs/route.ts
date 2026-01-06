/**
 * @fileoverview Public Jobs Listing API
 * @description Provides public access to job listings for the careers page,
 * with search, filtering, and pagination support.
 * 
 * @module api/careers/public/jobs
 * @public Unauthenticated access allowed
 * 
 * @endpoints
 * - GET /api/careers/public/jobs - List published public jobs
 * 
 * @queryParams
 * - orgId: Organization ID (defaults to platform org)
 * - q: Text search query
 * - department: Filter by department
 * - location: Filter by city or country (regex)
 * - jobType: Filter by job type (full-time, part-time, etc.)
 * - page: Page number (default: 1)
 * - limit: Items per page (max: 50, default: 12)
 * 
 * @response
 * - success: boolean
 * - jobs: Array of job listings
 * - total: Total matching jobs
 * - page: Current page
 * - totalPages: Total pages available
 * 
 * @security
 * - Only published, public visibility jobs are returned
 * - Location regex is escaped to prevent ReDoS attacks
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Job } from "@/server/models/Job";
import { enforceRateLimit } from "@/lib/middleware/rate-limit";
import { Config } from "@/lib/config/constants";

const DEFAULT_LIMIT = 12;

const PublicJobsQuerySchema = z.object({
  orgId: z.string().max(100).optional(),
  q: z.string().max(200).optional(),
  department: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  jobType: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(DEFAULT_LIMIT),
});

export async function GET(req: NextRequest) {
  const rateLimitResponse = enforceRateLimit(req, {
    requests: 120,
    windowMs: 60_000,
    keyPrefix: "careers:public:jobs",
  });
  if (rateLimitResponse) return rateLimitResponse;
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    
    // Parse and validate query parameters with Zod
    const queryResult = PublicJobsQuerySchema.safeParse(
      Object.fromEntries(searchParams.entries())
    );

    if (!queryResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid query parameters",
          details: queryResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { orgId: orgIdParam, q, department, location, jobType, page, limit } = queryResult.data;

    const orgId =
      orgIdParam ||
      Config.features.publicJobsOrgId ||
      Config.features.platformOrgId;
    if (!orgId) {
      return NextResponse.json(
        { success: false, error: "Organization context is required" },
        { status: 400 },
      );
    }

    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      orgId,
      status: "published",
      visibility: "public",
    };

    if (q) {
      filter.$text = { $search: q };
    }
    if (department) {
      filter.department = department;
    }
    if (jobType) {
      filter.jobType = jobType;
    }
    if (location) {
      // SECURITY: Escape regex special characters to prevent ReDoS
      const escapedLocation = location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedLocation, "i");
      filter.$or = [{ "location.city": regex }, { "location.country": regex }];
    }

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .select(
          "title department location jobType salaryRange description requirements benefits slug createdAt",
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(filter),
    ]);

    const response = NextResponse.json({
      success: true,
      jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
    // Cache public job listings for 5 minutes
    response.headers.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
    return response;
  } catch (_error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
