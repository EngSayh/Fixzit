import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/src/lib/auth';
import { z } from 'zod';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (process.env.ATS_ENABLED !== 'true') {
      return NextResponse.json({ success: false, error: 'ATS Applications endpoint not available in this deployment' }, { status: 501 });
    }
    const { db } = await import('@/src/lib/mongo');
    await db;
    const AppMod = await import('@/src/server/models/Application').catch(() => null);
    const Application = AppMod && (AppMod as any).Application;
    if (!Application) {
      return NextResponse.json({ success: false, error: 'ATS dependencies are not available in this deployment' }, { status: 501 });
    }
    // Require auth and scope by org
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const user = token ? await getUserFromToken(token) : null;
    if (!user?.tenantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    // Derive privilege for PII access
    const PRIVILEGED_ROLES = new Set(['ADMIN','OWNER','ATS_ADMIN','RECRUITER','SUPER_ADMIN','CORPORATE_ADMIN']);
    const userRoles = Array.isArray((user as any).roles) && (user as any).roles.length > 0
      ? (user as any).roles
      : [ (user as any).role ].filter(Boolean);
    const canSeePII = userRoles.some((r: string) => PRIVILEGED_ROLES.has(r));
    const candidateFields = canSeePII
      ? 'firstName lastName email phone location'
      : 'firstName lastName location';
    // Optional: fast id sanity check to avoid cast errors
    if (!/^[a-fA-F0-9]{24}$/.test(params.id)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }
    const application = await (Application as any)
      .findOne({ _id: params.id, orgId: user.tenantId })
      .select('-__v -attachments -internal -secrets') // tighten as needed
      .populate('jobId', 'title department status location')
      .populate('candidateId', candidateFields)
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
    await db;
    const AppMod = await import('@/src/server/models/Application').catch(() => null);
    const Application = AppMod && (AppMod as any).Application;
    if (!Application) {
      return NextResponse.json({ success: false, error: 'ATS dependencies are not available in this deployment' }, { status: 501 });
    }
    const applicationUpdateSchema = z.object({
      stage: z.enum(['applied','screening','interview','offer','hired','rejected']).optional(),
      score: z.number().min(0).max(100).optional(),
      note: z.string().optional(),
      reason: z.string().optional(),
      isPrivate: z.boolean().optional(),
      flags: z.array(z.string()).max(50).optional(),
      reviewers: z.array(z.string().regex(/^[a-fA-F0-9]{24}$/)).max(50).optional()
    });
    
    const body = applicationUpdateSchema.parse(await req.json());
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const user = token ? await getUserFromToken(token) : null;
    if (!user?.tenantId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const allowedRoles = new Set(['SUPER_ADMIN','CORPORATE_ADMIN','ADMIN','HR','ATS_ADMIN','RECRUITER']);
    if (!allowedRoles.has((user as any).role || '')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    const userId = user.id;
    if (!/^[a-fA-F0-9]{24}$/.test(params.id)) {
      return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });
    }
    const application = await (Application as any).findOne({ _id: params.id, orgId: user.tenantId });
    if (!application) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    // Optional: restrict stage transitions
    const allowedStages = new Set(['applied','screening','interview','offer','hired','rejected']);
    if (body.stage && body.stage !== application.stage) {
      if (!allowedStages.has(body.stage)) {
        return NextResponse.json({ success: false, error: 'Invalid stage' }, { status: 400 });
      }
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
      application.notes = application.notes || [];
      // Gate private notes to privileged roles (accept user.role or user.roles[])
      const privilegedRoles = new Set(['ADMIN','OWNER','ATS_ADMIN','RECRUITER','SUPER_ADMIN','CORPORATE_ADMIN']);
      const userRoles = Array.isArray((user as any).roles) && (user as any).roles.length > 0 ? (user as any).roles : [ (user as any).role ].filter(Boolean);
      const canWritePrivate = userRoles.some((r: string) => privilegedRoles.has(r));
      const isPrivate = !!body.isPrivate && canWritePrivate;
      application.notes.push({ author: userId, text: String(body.note).slice(0, 5000), createdAt: new Date(), isPrivate });
    }
    if (Array.isArray(body.flags)) (application as any).flags = body.flags.filter((f: any) => typeof f === 'string').slice(0, 50);
    if (Array.isArray(body.reviewers)) (application as any).reviewers = body.reviewers.filter((r: any) => /^[a-fA-F0-9]{24}$/.test(r)).slice(0, 50);
    await application.save();
    const result = application.toObject();
    // Hide private notes from non-privileged users
    const privilegedRoles = new Set(['ADMIN','OWNER','ATS_ADMIN','RECRUITER','SUPER_ADMIN','CORPORATE_ADMIN']);
    const userRolesResult = Array.isArray((user as any).roles) && (user as any).roles.length > 0 ? (user as any).roles : [ (user as any).role ].filter(Boolean);
    const canSeePrivate = userRolesResult.some((r: string) => privilegedRoles.has(r));
    if (!canSeePrivate && Array.isArray(result.notes)) {
      result.notes = result.notes.filter((n: any) => !n?.isPrivate);
    }
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update application' }, { status: 500 });
  }
}


