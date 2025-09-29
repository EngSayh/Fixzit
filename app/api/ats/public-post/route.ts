import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/src/lib/mongodb-unified';
import { Job } from '@/src/server/models/Job';
import { generateSlug } from '@/src/lib/utils';
import { rateLimit } from '@/src/server/security/rateLimit';

export async function POST(req: NextRequest) {
  try {
    // Check if ATS module is enabled
    if (process.env.ATS_ENABLED !== 'true') {
      return NextResponse.json({ success: false, error: 'ATS public-post endpoint not available in this deployment' }, { status: 501 });
    }

    await connectToDatabase();
    const body = await req.json();
    // Basic rate limiting for public endpoint
    const rl = await rateLimit(`ats:public:${req.ip ?? '0'}`, 10, 60_000);
    if (!rl.allowed) return NextResponse.json({ success:false, error:'Rate limit' }, { status: 429 });
    const platformOrg = process.env.PLATFORM_ORG_ID || 'fixzit-platform';
    // TODO: validate with zod before use
    const baseSlug = generateSlug(body.title || 'job');
    let slug = baseSlug;
    let counter = 1;
    while (await Job.findOne({ orgId: platformOrg, slug })) slug = `${baseSlug}-${counter++}`;
    const job = await Job.create({
      orgId: platformOrg,
      title: body.title,
      department: body.department || 'General',
      jobType: body.jobType || 'full-time',
      location: body.location || { city: body.city || '', country: body.country || '', mode: body.mode || 'onsite' },
      salaryRange: body.salaryRange || { min: 0, max: 0, currency: 'SAR' },
      description: body.description || '',
      requirements: body.requirements || [],
      benefits: body.benefits || [],
      skills: body.skills || [],
      tags: body.tags || [],
      status: 'pending',
      visibility: 'public',
      slug,
      postedBy: 'public'
    });
    return NextResponse.json({ success: true, data: job }, { status: 201 });
  } catch (error) {
    console.error('Public post error:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit job' }, { status: 500 });
  }
}


