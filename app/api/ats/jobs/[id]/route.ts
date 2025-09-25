import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { Job } from '@/src/server/models/Job';

/**
 * Retrieve a job by ID and return it as JSON, incrementing its view count.
 *
 * Connects to the database, fetches the job document by `params.id` (using a lean query),
 * and, if found, increments the job's `viewCount` before returning the job data.
 * Responds with a 404 JSON error when the job does not exist, or a 500 JSON error on failure.
 *
 * @returns A NextResponse containing JSON:
 * - Success (200): { success: true, data: job }
 * - Not found (404): { success: false, error: 'Job not found' }
 * - Server error (500): { success: false, error: 'Failed to fetch job' }
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db();
    
    const job = await Job.findById(params.id).lean();
    
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }
    
    // Increment view count
    await Job.findByIdAndUpdate(params.id, { $inc: { viewCount: 1 } });
    
    return NextResponse.json({ 
      success: true, 
      data: job 
    });
  } catch (error) {
    console.error('Job fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

/**
 * Update an existing job by ID using the JSON body from the request.
 *
 * Accepts a JSON payload with job fields to update and returns the updated job document.
 * Responds with 404 if no job with the given `id` exists, or 500 on failure.
 *
 * @param params.id - The Job document ID to update.
 * @returns A NextResponse containing `{ success: true, data: job }` on success,
 * or `{ success: false, error: string }` with the appropriate HTTP status (404 or 500) on error.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db();
    
    const body = await req.json();
    
    // TODO: Get user from auth and check permissions
    const userId = 'system';
    
    const job = await Job.findByIdAndUpdate(
      params.id,
      { 
        ...body,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      data: job 
    });
  } catch (error) {
    console.error('Job update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update job' },
      { status: 500 }
    );
  }
}

/**
 * Deletes a job by ID and returns a JSON response indicating the result.
 *
 * Connects to the database, attempts to remove the job document identified by `params.id`,
 * and returns 404 if the job does not exist. On success returns a success message.
 *
 * @param params.id - The ID of the job to delete
 * @returns A NextResponse with JSON: on success `{ success: true, message: 'Job deleted successfully' }`,
 *          on not found `{ success: false, error: 'Job not found' }` (404),
 *          on internal error `{ success: false, error: 'Failed to delete job' }` (500).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db();
    
    // TODO: Get user from auth and check permissions
    
    const job = await Job.findByIdAndDelete(params.id);
    
    if (!job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Job deleted successfully' 
    });
  } catch (error) {
    console.error('Job deletion error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}
