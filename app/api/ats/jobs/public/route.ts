import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { Job } from '@/server/models/Job';
import { logger } from '@/lib/logger';
import { rateLimit } from '@/server/security/rateLimit';
import { rateLimitError } from '@/server/utils/errorResponses';
import { getClientIP } from '@/server/security/headers';
import { getCached, CacheTTL } from '@/lib/cache/redis';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const parsePositiveInt = (value: string | null, field: string, {
  defaultValue,
  max
}: { defaultValue: number; max?: number }): number => {
  if (value === null || value === undefined || value === '') {
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
    const orgId = searchParams.get('orgId') || process.env.PUBLIC_JOBS_ORG_ID || process.env.PLATFORM_ORG_ID;

    if (!orgId) {
      return NextResponse.json(
        { error: 'Missing orgId', message: 'Specify the organization whose jobs should be returned.' },
        { status: 400 }
      );
    }

    const search = (searchParams.get('search') || '').trim();
    const department = (searchParams.get('department') || '').trim();
    const location = (searchParams.get('location') || '').trim();
    const jobType = (searchParams.get('jobType') || '').trim();
    let page: number;
    let limit: number;

    try {
      page = parsePositiveInt(searchParams.get('page'), 'page', { defaultValue: DEFAULT_PAGE });
      limit = parsePositiveInt(searchParams.get('limit'), 'limit', { defaultValue: DEFAULT_LIMIT, max: 50 });
    } catch (err) {
      return NextResponse.json(
        { error: 'Validation failed', message: (err as Error).message },
        { status: 400 }
      );
    }

    const skip = (page - 1) * limit;

    // Cache key: public-jobs:{orgId}:{search}:{department}:{location}:{jobType}:{page}:{limit}
    const cacheKey = `public-jobs:${orgId}:${search}:${department}:${location}:${jobType}:${page}:${limit}`;
    
    // Use cached data if available (15 minutes TTL)
    const result = await getCached(cacheKey, CacheTTL.FIFTEEN_MINUTES, async () => {
      // Build query for published jobs only
      const query: Record<string, unknown> = { status: 'published', orgId };
      const andFilters: Record<string, unknown>[] = [];

      // Search across title and description
      if (search) {
        const regex = new RegExp(escapeRegex(search), 'i');
        query.$or = [
          { title: regex },
          { description: regex },
          { skills: regex },
          { tags: regex }
        ];
      }

      // Filter by department
      if (department) {
        query.department = department;
      }

      // Filter by location
      if (location) {
        const locationRegex = new RegExp(escapeRegex(location), 'i');
        andFilters.push({
          $or: [
            { 'location.city': locationRegex },
            { 'location.country': locationRegex },
            { 'location.mode': locationRegex }
          ]
        });
      }

      // Filter by job type
      if (jobType) {
        query.jobType = jobType;
      }

      if (andFilters.length) {
        query.$and = andFilters;
      }

      // Fetch jobs with pagination
      const [jobs, totalCount] = await Promise.all([
        Job.find(query)
          .select('title description department location jobType skills tags salaryRange slug createdAt requirements responsibilities benefits')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Job.countDocuments(query)
      ]);

      return {
        data: jobs,
        pagination: {
          page,
          limit,
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        }
      };
    });

    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error: unknown) {
    logger.error('Error fetching public jobs:, { error });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Internal server error', message },
      { status: 500 }
    );
  }
}
