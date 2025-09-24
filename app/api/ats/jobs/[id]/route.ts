import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { Job } from '@/src/server/models/Job';

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
