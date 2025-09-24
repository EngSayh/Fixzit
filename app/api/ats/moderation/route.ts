import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { Job } from '@/src/server/models/Job';
import { getUserFromToken } from '@/src/lib/auth';

/**
 * Handle PUT requests to moderate a job (approve or reject).
 *
 * Expects a JSON body with `jobId` and `action` ("approve" | "reject"). If `action` is
 * "approve" the job's status is set to "published" and `publishedAt` is set to now;
 * if "reject" the job's status is set to "closed". Authentication via an optional
 * Bearer token in the `Authorization` header is supported but not required.
 *
 * @param req - Incoming NextRequest whose JSON body must include `jobId` and `action`.
 * @returns A NextResponse with JSON:
 *  - 200: { success: true, data: job } with the updated job document
 *  - 400: { success: false, error: 'Invalid request' } for missing/invalid input
 *  - 404: { success: false, error: 'Job not found' } if the job ID does not exist
 *  - 500: { success: false, error: 'Failed to moderate job' } on server error
 */
export async function PUT(req: NextRequest) {
  try {
    await db();
    const body = await req.json();
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const user = token ? await getUserFromToken(token) : null;

    const { jobId, action } = body;
    if (!jobId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }

    const job = await Job.findById(jobId);
    if (!job) return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });

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


