import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { Application } from '@/src/server/models/Application';

export async function GET(req: NextRequest) {
  try {
    await db();
    
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    const candidateId = searchParams.get('candidateId');
    const stage = searchParams.get('stage');
    const orgId = searchParams.get('orgId') || process.env.NEXT_PUBLIC_ORG_ID || 'fixzit-platform';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100);
    
    const filter: any = { orgId };
    
    if (jobId) filter.jobId = jobId;
    if (candidateId) filter.candidateId = candidateId;
    if (stage) filter.stage = stage;
    
    const applications = await Application
      .find(filter)
      .populate('jobId', 'title department location')
      .populate('candidateId', 'firstName lastName email skills')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    
    const total = await Application.countDocuments(filter);
    
    // Get stage statistics
    const stageStats = await Application.getStageStats(orgId, jobId || undefined);
    
    return NextResponse.json({ 
      success: true,
      data: applications,
      stageStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Applications list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch applications' },
      { status: 500 }
    );
  }
}
