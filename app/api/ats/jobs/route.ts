import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/src/lib/auth';

export async function GET(req: NextRequest) {
  try {
    if (process.env.ATS_ENABLED !== 'true') {
      return NextResponse.json({ success: false, error: 'ATS jobs endpoint not available in this deployment' }, { status: 501 });
    }
    const { db } = await import('@/src/lib/mongo');
    await (db as any)();
    const JobMod = await import('@/src/server/models/Job').catch(() => null);
    const Job = JobMod && (JobMod as any).Job;
    if (!Job) {
      return NextResponse.json({ success: false, error: 'ATS dependencies are not available in this deployment' }, { status: 501 });
    }
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const statusParam = searchParams.get('status') || 'published';
    const requestedOrgId = searchParams.get('orgId') || process.env.NEXT_PUBLIC_ORG_ID || 'fixzit-platform';
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const { getUserFromToken } = await import('@/src/lib/auth');
    const user = token ? await getUserFromToken(token) : null;
    const allowedRoles = new Set(['SUPER_ADMIN','CORPORATE_ADMIN','ADMIN','HR']);
    const isPrivileged = !!user && allowedRoles.has((user as any).role || '');
    // Always restrict to caller's tenant; ignore arbitrary orgId for privileged users
    const orgId = (user && (user as any).tenantId) ? (user as any).tenantId : requestedOrgId;
    const status = isPrivileged ? statusParam : 'published';
    const department = searchParams.get('department');
    const location = searchParams.get('location');
    const jobType = searchParams.get('jobType');
    const pageRaw = Number.parseInt(searchParams.get('page') ?? '', 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limitRaw = Number.parseInt(searchParams.get('limit') ?? '', 10);
    const limit = Math.max(1, Math.min(Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : 20, 100));
    const filter: any = { orgId };
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
    console.error('Jobs list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (process.env.ATS_ENABLED !== 'true') {
      return NextResponse.json({ success: false, error: 'ATS jobs endpoint not available in this deployment' }, { status: 501 });
    }
    const { db } = await import('@/src/lib/mongo');
    await (db as any)();
    const JobMod = await import('@/src/server/models/Job').catch(() => null);
    const Job = JobMod && (JobMod as any).Job;
    if (!Job) {
      return NextResponse.json({ success: false, error: 'ATS dependencies are not available in this deployment' }, { status: 501 });
    }
    const body = await req.json();
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const user = token ? await getUserFromToken(token) : null;
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const allowedRoles = new Set(['SUPER_ADMIN','CORPORATE_ADMIN','ADMIN','HR']);
    if (!allowedRoles.has((user as any).role || '')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const userId = (user as any).id;
    const orgId = (user as any).tenantId;
    let slugBase = (body.title || '').toString().toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
    if (!slugBase) slugBase = 'job';
    let job;
    for (let attempt = 0; attempt < 6; attempt++) {
      const slug = attempt === 0 ? slugBase : `${slugBase}-${attempt}`;
      try {
        job = await (Job as any).create({
          ...body,
          orgId,
          slug,
          postedBy: userId,
          status: body.status || 'draft'
        });
        break;
      } catch (e: any) {
        if (e?.code === 11000) continue; // duplicate slug; retry
        throw e;
      }
    }
    if (!job) throw new Error('Failed to create job with unique slug');
    return NextResponse.json({ success: true, data: job }, { status: 201 });
  } catch (error) {
    console.error('Job creation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create job' },
      { status: 500 }
    );
  }
}


