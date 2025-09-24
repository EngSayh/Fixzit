import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { Application } from '@/src/server/models/Application';
import { getUserFromToken } from '@/src/lib/auth';

/**
 * Retrieve a single application by ID, enforcing authentication and tenant authorization.
 *
 * Awaits database initialization, extracts a token from the `Authorization` header (supports `Bearer ` or raw token),
 * resolves the user, and returns 401 if the token is missing/invalid. Loads the Application by the route `id`,
 * populating `jobId` and `candidateId` and using a lean result. Returns 404 if not found, 403 if the application's
 * `orgId` does not match the authenticated user's `tenantId`, or 500 on unexpected errors. On success returns the
 * application document in the response body as `{ success: true, data: application }`.
 *
 * @returns A NextResponse containing JSON. Possible status codes:
 * - 200: success with application data
 * - 401: Unauthorized (missing/invalid token)
 * - 403: Forbidden (tenant mismatch)
 * - 404: Application not found
 * - 500: Failed to fetch application (server error)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db;
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const user = token ? await getUserFromToken(token) : null;
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const application = await Application
      .findById(params.id)
      .populate('jobId')
      .populate('candidateId')
      .lean();
    if (!application) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    if (String((application as any).orgId) !== String(user.tenantId)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    return NextResponse.json({ success: true, data: application });
  } catch (error) {
    console.error('Application fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch application' }, { status: 500 });
  }
}

/**
 * Partially updates an Application by ID after authenticating and authorizing the requester.
 *
 * Updates allowed fields: stage (records a history entry with optional reason), score (records a history entry),
 * note (appends to notes with privacy flag), flags (replaces array), and reviewers (replaces array). Persists changes
 * to the database and returns the updated application.
 *
 * Responds with:
 * - 200 and { success: true, data: application } on success,
 * - 401 if the requester is not authenticated,
 * - 403 if the requester is not authorized for the application's org,
 * - 404 if the application is not found,
 * - 500 on server error.
 *
 * @param params - Route parameters; `params.id` is the application ID to update.
 */
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
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const userId = user.id;
    
    const application = await Application.findById(params.id);
    if (!application) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    if (String((application as any).orgId) !== String(user.tenantId)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }
    
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


