import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { Application } from '@/src/server/models/Application';
import { getUserFromToken } from '@/src/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
  await db;
    const application = await Application
      .findById(params.id)
      .populate('jobId')
      .populate('candidateId')
      .lean();
    if (!application) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: application });
  } catch (error) {
    console.error('Application fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch application' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
  await db;
    const body = await req.json();
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const user = token ? await getUserFromToken(token) : null;
    const userId = user?.id || 'system';
    
    const application = await Application.findById(params.id);
    if (!application) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    
    if (body.stage && body.stage !== application.stage) {
      const oldStage = application.stage;
      application.stage = body.stage;
      application.history.push({ action: `stage_change:${oldStage}->${body.stage}`, by: userId, at: new Date(), details: body.reason });
    }
    if (typeof body.score === 'number' && body.score !== application.score) {
      const oldScore = application.score;
      application.score = body.score;
      application.history.push({ action: 'score_updated', by: userId, at: new Date(), details: `Score changed from ${oldScore} to ${body.score}` });
    }
    if (body.note) {
      application.notes.push({ author: userId, text: body.note, createdAt: new Date(), isPrivate: !!body.isPrivate });
    }
    if (Array.isArray(body.flags)) (application as any).flags = body.flags;
    if (Array.isArray(body.reviewers)) (application as any).reviewers = body.reviewers;
    
    await application.save();
    return NextResponse.json({ success: true, data: application });
  } catch (error) {
    console.error('Application update error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update application' }, { status: 500 });
  }
}


