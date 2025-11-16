import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { Job } from '@/server/models/Job';
import { generateSlug } from '@/lib/utils';
import { atsRBAC } from '@/lib/ats/rbac';
import { z } from 'zod';

import { rateLimit } from '@/server/security/rateLimit';
import {rateLimitError} from '@/server/utils/errorResponses';
import { getClientIP } from '@/server/security/headers';

const CreateJobSchema = z.object({
  title: z.string().min(3, 'Job title must be at least 3 characters'),
  department: z.string().min(1, 'Department is required'),
  description: z.string().optional(),
  jobType: z.enum(['full-time', 'part-time', 'contract', 'temporary', 'internship', 'remote', 'hybrid']).default('full-time'),
  status: z.enum(['draft', 'pending', 'published', 'closed', 'archived']).optional(),
  visibility: z.enum(['internal', 'public']).default('public'),
  location: z
    .object({
      city: z.string().optional(),
      country: z.string().optional(),
      mode: z.enum(['onsite', 'remote', 'hybrid']).optional(),
    })
    .optional(),
  salaryRange: z
    .object({
      min: z.number().min(0).optional(),
      max: z.number().min(0).optional(),
      currency: z.string().optional(),
    })
    .optional(),
  requirements: z.array(z.string()).optional(),
  benefits: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  screeningRules: z
    .object({
      minYears: z.number().min(0).optional(),
      requiredSkills: z.array(z.string()).optional(),
      autoRejectMissingSkills: z.boolean().optional(),
      autoRejectMissingExperience: z.boolean().optional(),
    })
    .optional(),
  metadata: z.record(z.any()).optional(),
});

type CreateJobInput = z.infer<typeof CreateJobSchema>;

const normalizeJobPayload = (input: CreateJobInput) => {
  const normalizeArray = (values?: string[]) =>
    Array.isArray(values) ? values.map((value) => value.trim()).filter(Boolean) : [];

  const location = input.location
    ? {
        ...input.location,
        mode: input.location.mode || 'onsite',
      }
    : undefined;

  return {
    title: input.title.trim(),
    department: input.department.trim(),
    description: input.description?.trim() || undefined,
    jobType: input.jobType,
    visibility: input.visibility,
    location,
    salaryRange: input.salaryRange,
    requirements: normalizeArray(input.requirements),
    benefits: normalizeArray(input.benefits),
    skills: normalizeArray(input.skills),
    screeningRules: input.screeningRules,
    metadata: input.metadata,
    status: input.status,
  };
};
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
    const authResult = await atsRBAC(req, ['jobs:read']);
    if (!authResult.authorized) {
      return authResult.response;
    }
    const { orgId } = authResult;
    
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status') || 'published';
    // REMOVED: const orgId = searchParams.get('orgId') - SECURITY VIOLATION
    const department = searchParams.get('department');
    const location = searchParams.get('location');
    const jobType = searchParams.get('jobType');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    
    const filter: Record<string, unknown> = { orgId };
    if (status !== 'all') filter.status = status;
    if (department) filter.department = department;
    if (location) filter['location.city'] = location;
    if (jobType) filter.jobType = jobType;
    if (q) filter.$text = { $search: q };
    
    const jobs = await (Job as any)
      .find(filter, q ? { score: { $meta: 'textScore' } } : {})
      .sort(q ? { score: { $meta: 'textScore' } } : { publishedAt: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    
    const total = await (Job as any).countDocuments(filter);
    
    return NextResponse.json({ 
      success: true,
      data: jobs,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logger.error('Jobs list error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch jobs' },
      { status: 500 }
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
    
    // RBAC: Check permissions for creating jobs
    const authResult = await atsRBAC(req, ['jobs:create']);
    if (!authResult.authorized) {
      return authResult.response;
    }
    const { userId, orgId, atsModule } = authResult;

    const body = await req.json();
    const parsed = CreateJobSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const normalized = normalizeJobPayload(parsed.data);

    if (
      Number.isFinite(atsModule.jobPostLimit) &&
      atsModule.jobPostLimit !== Number.MAX_SAFE_INTEGER
    ) {
      const activeJobs = await Job.countDocuments({
        orgId,
        status: { $in: ['pending', 'published'] },
      });
      if (activeJobs >= atsModule.jobPostLimit) {
        return NextResponse.json(
          {
            success: false,
            error: 'Job post limit reached for your ATS plan',
            limit: atsModule.jobPostLimit,
          },
          { status: 403 }
        );
      }
    }

    const baseSlug = generateSlug(normalized.title);
    let slug = baseSlug;
    let counter = 1;
    while (await (Job as any).findOne({ orgId, slug })) {
      slug = `${baseSlug}-${counter++}`;
    }
    
    const job = await (Job as any).create({
      ...normalized,
      orgId,
      slug,
      postedBy: userId,
      status: normalized.status || 'pending'
    });
    return NextResponse.json({ success: true, data: job }, { status: 201 });
  } catch (error) {
    logger.error('Job creation error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, error: 'Failed to create job' },
      { status: 500 }
    );
  }
}

