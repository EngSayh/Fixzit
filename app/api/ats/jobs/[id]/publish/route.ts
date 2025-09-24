import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { Job } from '@/src/server/models/Job';
import { getUserFromToken } from '@/src/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db();
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const user = token ? await getUserFromToken(token) : null;
    const userId = user?.id || 'system';
    
    const job = await Job.findById(params.id);
    if (!job) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    if (job.status === 'published') return NextResponse.json({ success: false, error: 'Job is already published' }, { status: 400 });
    
    await job.publish();
    return NextResponse.json({ success: true, data: job, message: 'Job published successfully' });
  } catch (error) {
    console.error('Job publish error:', error);
    return NextResponse.json({ success: false, error: 'Failed to publish job' }, { status: 500 });
  }
}


