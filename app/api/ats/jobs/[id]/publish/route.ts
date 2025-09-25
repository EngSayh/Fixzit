import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { Job } from '@/src/server/models/Job';
import { getUserFromToken } from '@/src/lib/auth';

/**
 * Publishes a job by id.
 *
 * Looks up the job using the route parameter `id`, prevents publishing an already published job, invokes the job's `publish()` method, and returns a JSON NextResponse indicating success or an error.
 *
 * @param params - Route parameters; must include `id` (the job id to publish).
 * @returns A NextResponse with JSON `{ success: boolean, data?: Job, error?: string, message?: string }` and an appropriate HTTP status (200 on success, 400/404/500 on errors).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db();
    
    // Derive user/org from Authorization header when available
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const user = token ? await getUserFromToken(token) : null;
    const userId = user?.id || 'system';
    
    const job = await Job.findById(params.id);
    
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }
    
    if (job.status === 'published') {
      return NextResponse.json(
        { success: false, error: 'Job is already published' },
        { status: 400 }
      );
    }
    
    await job.publish();
    
    // TODO: Send notifications to subscribed candidates
    // await notificationService.notifyJobPosted(job);
    
    return NextResponse.json({ 
      success: true, 
      data: job,
      message: 'Job published successfully'
    });
  } catch (error) {
    console.error('Job publish error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to publish job' },
      { status: 500 }
    );
  }
}
