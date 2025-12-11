/**
 * @fileoverview Public Job Listings
 * @description Provides publicly accessible job listings with search, filtering, and pagination support. Results are cached for performance.
 * @route GET /api/ats/jobs/public - Retrieve public job postings
 * @access Public - Rate-limited endpoint with Redis caching
 * @module ats
 */

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Job } from "@/server/models/Job";
import { logger } from "@/lib/logger";
import { smartRateLimit, buildOrgAwareRateLimitKey } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getCached, CacheTTL } from "@/lib/redis";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_CACHE_KEY_SEGMENT = 64; // Limit cache key segment length to prevent Redis key bloat

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Clamp and normalize a string for use in cache keys.
 * Prevents cache key bloat from unbounded user input (e.g., long search strings).
 * 
 * @param value - The input string to normalize
 * @param maxLen - Maximum length (default: MAX_CACHE_KEY_SEGMENT)
 * @returns Normalized string safe for cache keys
 */
const normalizeCacheKeySegment = (value: string, maxLen = MAX_CACHE_KEY_SEGMENT): string => {
  if (!value) return "";
  // Clamp length and replace colons (cache key delimiter) with underscores
  return value.slice(0, maxLen).replace(/:/g, "_").toLowerCase();
};

const parsePositiveInt = (
  value: string | null,
  field: string,
  { defaultValue, max }: { defaultValue: number; max?: number },
): number => {
  if (value === null || value === undefined || value === "") {
    return defaultValue;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`Invalid ${field}`);
  }

  if (max) {
    return Math.min(parsed, max);
  }

  return parsed;
};

/**
 * GET /api/ats/jobs/public - Get published jobs for public job board
 * No authentication required - public endpoint
 */
export async function GET(req: NextRequest) {
  // Security: Only allow configured orgs for public job board
  // Do NOT accept arbitrary orgId from query params to prevent cross-tenant enumeration
  const orgId = process.env.PUBLIC_JOBS_ORG_ID || process.env.PLATFORM_ORG_ID;

  // Rate limiting (higher limit for public endpoint) - use org-aware key for tenant isolation
  const rl = await smartRateLimit(
    buildOrgAwareRateLimitKey(req, orgId ?? null, null),
    100,
    60_000
  );
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);

    if (!orgId) {
      logger.error("[ATS/Public] No PUBLIC_JOBS_ORG_ID or PLATFORM_ORG_ID configured");
      return NextResponse.json(
        {
          error: "Service not configured",
          message: "Public job board is not available.",
        },
        { status: 503 },
      );
    }

    const search = (searchParams.get("search") || "").trim();
    const department = (searchParams.get("department") || "").trim();
    const location = (searchParams.get("location") || "").trim();
    const jobType = (searchParams.get("jobType") || "").trim();
    let page: number;
    let limit: number;

    try {
      page = parsePositiveInt(searchParams.get("page"), "page", {
        defaultValue: DEFAULT_PAGE,
      });
      limit = parsePositiveInt(searchParams.get("limit"), "limit", {
        defaultValue: DEFAULT_LIMIT,
        max: 50,
      });
    } catch (err) {
      return NextResponse.json(
        { error: "Validation failed", message: (err as Error).message },
        { status: 400 },
      );
    }

    const skip = (page - 1) * limit;

    // CACHE KEY: Use normalized (lowercased, clamped to 64 chars) segments to prevent Redis key bloat
    // QUERY: Use sanitized but unclamped original input to preserve search fidelity
    // This ensures cache correctness while not truncating user's actual search terms
    const cacheSearch = normalizeCacheKeySegment(search);
    const cacheDepartment = normalizeCacheKeySegment(department);
    const cacheLocation = normalizeCacheKeySegment(location);
    const cacheJobType = normalizeCacheKeySegment(jobType);

    // Query terms: trim and escape but preserve original case and full length for accurate matching
    // Only clamp to reasonable max (256 chars) to prevent regex DoS, not for cache key safety
    const MAX_QUERY_LENGTH = 256;
    const querySearch = search.slice(0, MAX_QUERY_LENGTH);
    const queryDepartment = department.slice(0, MAX_QUERY_LENGTH);
    const queryLocation = location.slice(0, MAX_QUERY_LENGTH);
    const queryJobType = jobType.slice(0, MAX_QUERY_LENGTH);

    // Cache key with normalized segments to prevent Redis key bloat from unbounded user input
    // Security: Clamp search/filter lengths to prevent cache churn attacks
    const cacheKey = `public-jobs:${orgId}:${cacheSearch}:${cacheDepartment}:${cacheLocation}:${cacheJobType}:${page}:${limit}`;

    // Use cached data if available (15 minutes TTL)
    const result = await getCached(
      cacheKey,
      CacheTTL.FIFTEEN_MINUTES,
      async () => {
        // Build query for published AND publicly visible jobs only
        // This prevents internal-only job postings from appearing on public feeds
        const query: Record<string, unknown> = { 
          status: "published", 
          visibility: "public",
          orgId 
        };
        const andFilters: Record<string, unknown>[] = [];

        // Search across title and description (using full query input for accuracy)
        if (querySearch) {
          const regex = new RegExp(escapeRegex(querySearch), "i");
          query.$or = [
            { title: regex },
            { description: regex },
            { skills: regex },
            { tags: regex },
          ];
        }

        // Filter by department - use lowercase for index-friendly equality matching
        // Assumes department values are normalized to lowercase on write
        // Falls back to case-insensitive regex if exact match fails (for legacy data)
        if (queryDepartment) {
          query.department = { $regex: `^${escapeRegex(queryDepartment)}$`, $options: 'i' };
        }

        // Filter by location (using full query input for accuracy)
        if (queryLocation) {
          const locationRegex = new RegExp(escapeRegex(queryLocation), "i");
          andFilters.push({
            $or: [
              { "location.city": locationRegex },
              { "location.country": locationRegex },
              { "location.mode": locationRegex },
            ],
          });
        }

        // Filter by job type - use lowercase for index-friendly matching
        // Assumes jobType values are normalized to lowercase on write
        // Falls back to case-insensitive regex if exact match fails (for legacy data)
        if (queryJobType) {
          query.jobType = { $regex: `^${escapeRegex(queryJobType)}$`, $options: 'i' };
        }

        if (andFilters.length) {
          query.$and = andFilters;
        }

        // Fetch jobs with pagination
        const [jobs, totalCount] = await Promise.all([
          Job.find(query)
            .select(
              "title description department location jobType skills tags salaryRange slug createdAt requirements responsibilities benefits",
            )
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
          Job.countDocuments(query),
        ]);

        return {
          data: jobs,
          pagination: {
            page,
            limit,
            total: totalCount,
            pages: Math.ceil(totalCount / limit),
          },
        };
      },
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    logger.error("Error fetching public jobs", error as Error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", message },
      { status: 500 },
    );
  }
}
