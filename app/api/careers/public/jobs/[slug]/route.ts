import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { Job } from '@/server/models/Job';

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const orgIdParam = searchParams.get('orgId');
  const orgId = orgIdParam || process.env.PUBLIC_JOBS_ORG_ID || process.env.NEXT_PUBLIC_ORG_ID || process.env.PLATFORM_ORG_ID;

  const filter: Record<string, unknown> = {
    slug: params.slug,
    status: 'published',
    visibility: 'public',
  };
  if (orgId) filter.orgId = orgId;

  const job = await Job.findOne(filter)
    .select('title department location jobType salaryRange description requirements benefits slug createdAt orgId screeningRules')
    .lean();

  if (!job) {
    return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, job });
}
