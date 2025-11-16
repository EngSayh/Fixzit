import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { Job } from '@/server/models/Job';
import { rateLimit } from '@/server/security/rateLimit';
import { rateLimitError } from '@/server/utils/errorResponses';
import { getClientIP } from '@/server/security/headers';
import { getCached, CacheTTL } from '@/lib/cache/redis';

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
    
    // Extract query parameters
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const location = searchParams.get('location') || '';
    const jobType = searchParams.get('jobType') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const skip = (page - 1) * limit;

    // Cache key: public-jobs:{search}:{department}:{location}:{jobType}:{page}:{limit}
    const cacheKey = `public-jobs:${search}:${department}:${location}:${jobType}:${page}:${limit}`;
    
    // Use cached data if available (15 minutes TTL)
    const result = await getCached(cacheKey, CacheTTL.FIFTEEN_MINUTES, async () => {
      // Build query for published jobs only
      const query: any = { status: 'published' };

      // Search across title and description
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { 'skills': { $regex: search, $options: 'i' } }
        ];
      }

      // Filter by department
      if (department) {
        query.department = department;
      }

      // Filter by location
      if (location) {
        query.location = location;
      }

      // Filter by job type
      if (jobType) {
        query.jobType = jobType;
      }

      // Fetch jobs with pagination
      const [jobs, totalCount] = await Promise.all([
        Job.find(query)
          .select('title description department location jobType skills experience salary slug createdAt')
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
  } catch (error: any) {
    console.error('Error fetching public jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
