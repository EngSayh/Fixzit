import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { Job } from '@/src/server/models/Job';
import { generateSlug } from '@/src/lib/utils';
import { getUserFromToken } from '@/src/lib/auth';

/**
 * Retrieve a paginated list of jobs with optional filtering and text search.
 *
 * Accepts query parameters:
 * - `q` (string): full-text search string (optional).
 * - `status` (string): job status filter; default `"published"`. Use `"all"` to disable status filtering.
 * - `orgId` (string): organization ID; defaults to `process.env.NEXT_PUBLIC_ORG_ID` or `"fixzit-platform"`.
 * - `department` (string): department filter (optional).
 * - `location` (string): city name to match `location.city` (optional).
 * - `jobType` (string): job type filter (optional).
 * - `page` (number): 1-based page number; defaults to `1`.
 * - `limit` (number): items per page; defaults to `20`, capped at `100`.
 *
 * Returns a JSON NextResponse with shape:
 * {
 *   success: true,
 *   data: Array<Job>,
 *   pagination: { page, limit, total, pages }
 * }
 *
 * Performs a MongoDB text search and uses text score for projection/sorting when `q` is provided;
 * otherwise sorts by `publishedAt` and `createdAt` descending. On failure returns a 500 JSON error.
 */
export async function GET(req: NextRequest) {
  try {
    await db();
    
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
    
    if (status !== 'all') {
      filter.status = status;
    }
    
    if (department) filter.department = department;
    if (location) filter['location.city'] = location;
    if (jobType) filter.jobType = jobType;
    
    if (q) {
      filter.$text = { $search: q };
    }
    
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
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Jobs list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

/**
 * Create a new job record.
 *
 * Reads the request JSON body and optional Authorization header to determine the posting user and organization, generates a URL-friendly unique slug for the job title (ensuring uniqueness within the organization by appending numeric suffixes as needed), and inserts a new Job document into the database. The created job is returned with HTTP 201.
 *
 * Behavior notes:
 * - If an authorization token is present and valid, the job's `postedBy` is set to that user's id and `orgId` is preferred from the user's tenant; otherwise `postedBy` is set to `"system"` and `orgId` falls back to `body.orgId`, NEXT_PUBLIC_ORG_ID, or `"fixzit-platform"`.
 * - `status` defaults to `"draft"` when not provided.
 * - Ensures slug uniqueness per organization by appending `-1`, `-2`, ... when collisions occur.
 *
 * @returns A NextResponse JSON payload containing `{ success: true, data: job }` with HTTP status 201 on success, or `{ success: false, error: 'Failed to create job' }` with status 500 on failure.
 */
export async function POST(req: NextRequest) {
  try {
    await db();
    
    const body = await req.json();
    
    // Derive user/org from Authorization header when available
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const user = token ? await getUserFromToken(token) : null;
    const userId = user?.id || 'system';
    const orgId = user?.tenantId || body.orgId || process.env.NEXT_PUBLIC_ORG_ID || 'fixzit-platform';
    
    // Generate slug
    const baseSlug = generateSlug(body.title);
    let slug = baseSlug;
    let counter = 1;
    
    // Ensure unique slug
    while (await Job.findOne({ orgId, slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    const job = await Job.create({
      ...body,
      orgId,
      slug,
      postedBy: userId,
      status: body.status || 'draft'
    });
    
    return NextResponse.json({ 
      success: true, 
      data: job 
    }, { status: 201 });
  } catch (error) {
    console.error('Job creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create job' },
      { status: 500 }
    );
  }
}
