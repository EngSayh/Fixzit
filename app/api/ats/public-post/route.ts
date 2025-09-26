import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    if (process.env.ATS_ENABLED !== 'true') {
      return NextResponse.json({ success: false, error: 'ATS public post endpoint not available in this deployment' }, { status: 501 });
    }
    const { db } = await import('@/src/lib/mongo');
    await db;
    const JobMod = await import('@/src/server/models/Job').catch(() => null);
    const Job = JobMod && (JobMod as any).Job;
    if (!Job) {
      return NextResponse.json({ success: false, error: 'ATS dependencies are not available in this deployment' }, { status: 501 });
    }
    const body = await req.json();
    // TODO: validate `body` via a schema (title required, max lengths, enums).
    // TODO: verify CAPTCHA token (Turnstile/hCaptcha) here and reject on failure.
    // TODO: enforce rate limiting per IP/org before proceeding.

    const platformOrg = process.env.NEXT_PUBLIC_ORG_ID || 'fixzit-platform';
    let baseSlug = (body.title || 'job').toString().toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    let job: any = null;
    for (let attempt = 0; attempt < 6; attempt++) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt}`;
      try {
        job = await (Job as any).create({
          orgId: platformOrg,
          title: body.title,
          department: body.department || 'General',
          jobType: body.jobType || 'full-time',
          location: body.location || { city: body.city || '', country: body.country || '', mode: 'onsite' },
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
        break;
      } catch (e: any) {
        const dup = e?.code === 11000 || String(e?.message || '').includes('duplicate key');
        if (!dup || attempt === 5) throw e;
      }
    }
    if (!job) return NextResponse.json({ success: false, error: 'Failed to submit job' }, { status: 500 });
    return NextResponse.json({ success: true, data: job }, { status: 201 });
  } catch (error) {
    console.error('Public post error:', error);
    return NextResponse.json({ success: false, error: 'Failed to submit job' }, { status: 500 });
  }
}


