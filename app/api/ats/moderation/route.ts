import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/src/lib/auth';

export async function PUT(req: NextRequest) {
  try {
    if (process.env.ATS_ENABLED !== 'true') {
      return NextResponse.json({ success: false, error: 'ATS moderation endpoint not available in this deployment' }, { status: 501 });
    }
    const { db } = await import('@/src/lib/mongo');
    await db;
    const JobMod = await import('@/src/server/models/Job').catch(() => null);
    const Job = JobMod && (JobMod as any).Job;
    if (!Job) {
      return NextResponse.json({ success: false, error: 'ATS dependencies are not available in this deployment' }, { status: 501 });
    }
    const body = await req.json();
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const user = token ? await getUserFromToken(token) : null;

    const { jobId, action } = body;
    if (!jobId || !['approve', 'reject'].includes(action)) return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });

    const job = await (Job as any).findById(jobId);
    if (!job) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    if (String(job.orgId) !== String((user as any).tenantId)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (action === 'approve') {
      job.status = 'published' as any;
      job.publishedAt = new Date();
      await job.save();
    } else {
      job.status = 'closed' as any;
      await job.save();
    }

    return NextResponse.json({ success: true, data: job });
  } catch (error) {
    console.error('Moderation error:', error);
    return NextResponse.json({ success: false, error: 'Failed to moderate job' }, { status: 500 });
  }
}


