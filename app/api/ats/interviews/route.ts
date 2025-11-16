import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { Interview } from '@/server/models/ats/Interview';
import { atsRBAC } from '@/lib/ats/rbac';

import { rateLimit } from '@/server/security/rateLimit';
import { rateLimitError } from '@/server/utils/errorResponses';
import { getClientIP } from '@/server/security/headers';

/**
 * GET /api/ats/interviews - List interviews with filtering
 */
export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();
    
    // RBAC: Check permissions for reading interviews
    const authResult = await atsRBAC(req, ['interviews:read']);
    if (!authResult.authorized) {
      return authResult.response;
    }
    const { orgId } = authResult;
    
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get('jobId');
    const applicationId = searchParams.get('applicationId');
    const candidateId = searchParams.get('candidateId');
    const status = searchParams.get('status');
    const stage = searchParams.get('stage');
    const from = searchParams.get('from'); // Date filter
    const to = searchParams.get('to');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    
    const filter: Record<string, unknown> = { orgId };
    if (jobId) filter.jobId = jobId;
    if (applicationId) filter.applicationId = applicationId;
    if (candidateId) filter.candidateId = candidateId;
    if (status && status !== 'all') filter.status = status;
    if (stage && stage !== 'all') filter.stage = stage;
    
    // Date range filter
    if (from || to) {
      filter.scheduledAt = {};
      if (from) (filter.scheduledAt as any).$gte = new Date(from);
      if (to) (filter.scheduledAt as any).$lte = new Date(to);
    }
    
    const interviews = await (Interview as any)
      .find(filter)
      .populate('jobId', 'title department')
      .populate('candidateId', 'firstName lastName email phone')
      .populate('applicationId', 'stage score')
      .sort({ scheduledAt: 1 }) // Upcoming first
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    
    const total = await (Interview as any).countDocuments(filter);
    
    return NextResponse.json({ 
      success: true,
      data: interviews,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logger.error('Interviews list error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, error: 'Failed to fetch interviews' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ats/interviews - Create new interview
 */
export async function POST(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  try {
    await connectToDatabase();
    const body = await req.json();
    
    // RBAC: Check permissions for creating interviews
    const authResult = await atsRBAC(req, ['interviews:create']);
    if (!authResult.authorized) {
      return authResult.response;
    }
    const { userId, orgId } = authResult;
    
    // Validate required fields
    if (!body.applicationId || !body.jobId || !body.candidateId || !body.scheduledAt) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: applicationId, jobId, candidateId, scheduledAt' },
        { status: 400 }
      );
    }
    
    const interview = await (Interview as any).create({
      ...body,
      orgId,
      createdBy: userId
    });
    
    return NextResponse.json({ success: true, data: interview }, { status: 201 });
  } catch (error) {
    logger.error('Interview creation error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, error: 'Failed to create interview' },
      { status: 500 }
    );
  }
}
