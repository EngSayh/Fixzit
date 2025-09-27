import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/src/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (process.env.ATS_ENABLED !== 'true') {
      return NextResponse.json({ success: false, error: 'ATS publish endpoint not available in this deployment' }, { status: 501 });
    }
    const { db } = await import('@/src/lib/mongo');
    await db;
    const JobMod = await import('@/src/server/models/Job').catch(() => null);
    const Job = JobMod && (JobMod as any).Job;
    if (!Job) {
      return NextResponse.json({ success: false, error: 'ATS dependencies are not available in this deployment' }, { status: 501 });
    }
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const user = token ? await getUserFromToken(token) : null;
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    const allowedRoles = new Set(['SUPER_ADMIN','CORPORATE_ADMIN','ADMIN','HR']);
    if (!allowedRoles.has((user as any).role || '')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    
    const job = await (Job as any).findById(params.id);
    if (!job) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    if (String(job.orgId) !== String((user as any).tenantId)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    if (job.status === 'published') return NextResponse.json({ success: false, error: 'Job is already published' }, { status: 400 });
    
    await job.publish();
    return NextResponse.json({ success: true, data: job, message: 'Job published successfully' });
  } catch (error) {
    console.error('Job publish error:', error);
    return NextResponse.json({ success: false, error: 'Failed to publish job' }, { status: 500 });
  }
}


