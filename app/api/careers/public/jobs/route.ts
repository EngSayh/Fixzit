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
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Job } from "@/server/models/Job";

const DEFAULT_LIMIT = 12;

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const orgIdParam = searchParams.get("orgId");
    const orgId =
      orgIdParam ||
      process.env.PUBLIC_JOBS_ORG_ID ||
      process.env.NEXT_PUBLIC_ORG_ID ||
      process.env.PLATFORM_ORG_ID;
    if (!orgId) {
      return NextResponse.json(
        { success: false, error: "Organization context is required" },
        { status: 400 },
      );
    }

    const q = (searchParams.get("q") || "").trim();
    const department = (searchParams.get("department") || "").trim();
    const location = (searchParams.get("location") || "").trim();
    const jobType = (searchParams.get("jobType") || "").trim();

    const page = Math.max(parseInt(searchParams.get("page") || "1", 10), 1);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10),
      50,
    );
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

    return NextResponse.json({
      success: true,
      jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (_error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
