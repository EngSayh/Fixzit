import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/src/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (process.env.ATS_ENABLED !== 'true') {
      return NextResponse.json({ success: false, error: 'ATS Applications endpoint not available in this deployment' }, { status: 501 });
    }
    const { db } = await import('@/src/lib/mongo');
    await (db as any)();
    const AppMod = await import('@/src/server/models/Application').catch(() => null);
    const Application = AppMod && (AppMod as any).Application;
    if (!Application) {
      return NextResponse.json({ success: false, error: 'ATS dependencies are not available in this deployment' }, { status: 501 });
    }
    const application = await (Application as any)
      .findById(params.id)
      .populate('jobId')
      .populate('candidateId')
      .lean();
    if (!application) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: application });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch application' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (process.env.ATS_ENABLED !== 'true') {
      return NextResponse.json({ success: false, error: 'ATS Applications endpoint not available in this deployment' }, { status: 501 });
    }
    const { db } = await import('@/src/lib/mongo');
    await (db as any)();
    const AppMod = await import('@/src/server/models/Application').catch(() => null);
    const Application = AppMod && (AppMod as any).Application;
    if (!Application) {
      return NextResponse.json({ success: false, error: 'ATS dependencies are not available in this deployment' }, { status: 501 });
    }
    const body = await req.json();
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const user = token ? await getUserFromToken(token) : null;
    const userId = user?.id || 'system';
    const application = await (Application as any).findById(params.id);
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
    return NextResponse.json({ success: false, error: 'Failed to update application' }, { status: 500 });
  }
}


