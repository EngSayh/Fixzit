import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { Job } from '@/server/models/Job';
import { generateSlug } from '@/lib/utils';
import { getUserFromToken } from '@/lib/auth';

import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';

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
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${req.url}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status') || 'published';
    const orgId = searchParams.get('orgId') || process.env.NEXT_PUBLIC_ORG_ID || 'fixzit-platform';
    const department = searchParams.get('department');
    const location = searchParams.get('location');
    const jobType = searchParams.get('jobType');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    
    const filter: any = { orgId };
    if (status !== 'all') filter.status = status;
    if (department) filter.department = department;
    if (location) filter['location.city'] = location;
    if (jobType) filter.jobType = jobType;
    if (q) filter.$text = { $search: q };
    
    const jobs = await Job
      .find(filter, q ? { score: { $meta: 'textScore' } } : {})
      .sort(q ? { score: { $meta: 'textScore' } } : { publishedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    
    const total = await Job.countDocuments(filter);
    
    return NextResponse.json({ 
      success: true,
      data: jobs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    console.error('Jobs list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const rl = rateLimit(`${req.url}:${clientIp}`, 60, 60);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();
    const body = await req.json();
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const user = token ? await getUserFromToken(token) : null;
    const userId = user?.id || 'system';
    const orgId = user?.orgId || body.orgId || process.env.NEXT_PUBLIC_ORG_ID || 'fixzit-platform';
    
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
      status: body.status || 'draft'
    });
    return NextResponse.json({ success: true, data: job }, { status: 201 });
  } catch (error) {
    console.error('Job creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create job' },
      { status: 500 }
    );
  }
}




