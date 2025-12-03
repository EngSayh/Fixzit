import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb-unified";
import { Job } from "@/server/models/Job";
import { logger } from "@/lib/logger";
import { rateLimit } from "@/server/security/rateLimit";
import { rateLimitError } from "@/server/utils/errorResponses";
import { getClientIP } from "@/server/security/headers";
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
  // Rate limiting (higher limit for public endpoint)
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 100, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    
    // Security: Only allow configured orgs for public job board
    // Do NOT accept arbitrary orgId from query params to prevent cross-tenant enumeration
    const orgId = process.env.PUBLIC_JOBS_ORG_ID || process.env.PLATFORM_ORG_ID;

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

    // CRITICAL FIX: Normalize inputs BEFORE using in both cache key AND query
    // This ensures cache hits always serve correct data for the exact query being made.
    // Without this, a 100-char search would have a 64-char cache key, but query uses full 100 chars,
    // causing subsequent 100-char searches sharing first 64 chars to serve wrong cached results.
    const normalizedSearch = normalizeCacheKeySegment(search);
    const normalizedDepartment = normalizeCacheKeySegment(department);
    const normalizedLocation = normalizeCacheKeySegment(location);
    const normalizedJobType = normalizeCacheKeySegment(jobType);

    // Cache key with normalized segments to prevent Redis key bloat from unbounded user input
    // Security: Clamp search/filter lengths to prevent cache churn attacks
    const cacheKey = `public-jobs:${orgId}:${normalizedSearch}:${normalizedDepartment}:${normalizedLocation}:${normalizedJobType}:${page}:${limit}`;

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

        // Search across title and description (using normalized input)
        if (normalizedSearch) {
          const regex = new RegExp(escapeRegex(normalizedSearch), "i");
          query.$or = [
            { title: regex },
            { description: regex },
            { skills: regex },
            { tags: regex },
          ];
        }

        // Filter by department (using normalized input)
        if (normalizedDepartment) {
          query.department = normalizedDepartment;
        }

        // Filter by location (using normalized input)
        if (normalizedLocation) {
          const locationRegex = new RegExp(escapeRegex(normalizedLocation), "i");
          andFilters.push({
            $or: [
              { "location.city": locationRegex },
              { "location.country": locationRegex },
              { "location.mode": locationRegex },
            ],
          });
        }

        // Filter by job type (using normalized input)
        if (normalizedJobType) {
          query.jobType = normalizedJobType;
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
    logger.error("Error fetching public jobs", { error });
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Internal server error", message },
      { status: 500 },
    );
  }
}
