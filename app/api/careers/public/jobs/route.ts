import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { Job } from '@/server/models/Job';

const DEFAULT_LIMIT = 12;

export async function GET(req: NextRequest) {
  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const orgIdParam = searchParams.get('orgId');
  const orgId = orgIdParam || process.env.PUBLIC_JOBS_ORG_ID || process.env.NEXT_PUBLIC_ORG_ID || process.env.PLATFORM_ORG_ID;
  if (!orgId) {
    return NextResponse.json(
      { success: false, error: 'Organization context is required' },
      { status: 400 }
    );
  }

  const q = (searchParams.get('q') || '').trim();
  const department = (searchParams.get('department') || '').trim();
  const location = (searchParams.get('location') || '').trim();
  const jobType = (searchParams.get('jobType') || '').trim();

  const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
  const limit = Math.min(parseInt(searchParams.get('limit') || String(DEFAULT_LIMIT), 10), 50);
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = {
    orgId,
    status: 'published',
    visibility: 'public',
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
    const regex = new RegExp(location, 'i');
    filter.$or = [
      { 'location.city': regex },
      { 'location.country': regex },
    ];
  }

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .select('title department location jobType salaryRange description requirements benefits slug createdAt')
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
}
