import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/lib/mongo';
import { Application } from '@/src/server/models/Application';
import { getUserFromToken } from '@/src/lib/auth';

/**
 * Retrieves a single application by ID, including populated job and candidate data.
 *
 * Initializes the database connection, queries the Application model with `jobId` and
 * `candidateId` populated and converted to a plain object via `lean()`, and returns
 * the application in a JSON NextResponse.
 *
 * Returns 404 JSON when the application is not found, and 500 JSON on unexpected errors.
 *
 * @param params - Route parameters; expects `params.id` to be the application ID to fetch.
 * @returns A NextResponse with `{ success: true, data: application }` on success,
 *          `{ success: false, error: 'Application not found' }` with status 404 if missing,
 *          or `{ success: false, error: 'Failed to fetch application' }` with status 500 on error.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db();
    
    const application = await Application
      .findById(params.id)
      .populate('jobId')
      .populate('candidateId')
      .lean();
    
    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      data: application 
    });
  } catch (error) {
    console.error('Application fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch application' },
      { status: 500 }
    );
  }
}

/**
 * Updates an application by ID: supports stage changes, score updates, adding notes, and setting flags/reviewers; records history and authorship, then saves the application.
 *
 * Accepts a JSON body with any of:
 * - `stage` (string) — if different, updates `application.stage` and appends a history entry (details may come from `reason`).
 * - `reason` (string) — optional explanation stored in the stage-change history entry.
 * - `score` (number) — if different, updates `application.score` and appends a history entry describing the change.
 * - `note` (string) — if present, appends a note object { author, text, createdAt, isPrivate } to `application.notes`.
 * - `isPrivate` (boolean) — used when creating the note (coerced to boolean).
 * - `flags` (array) — replaces `application.flags` when provided as an array.
 * - `reviewers` (array) — replaces `application.reviewers` when provided as an array.
 *
 * Authentication: if an Authorization header with a token is provided, the token is resolved to a user via `getUserFromToken` and that user's id is recorded as the author of history/notes; otherwise actions are attributed to `'system'`.
 *
 * Responses:
 * - 200 JSON { success: true, data: application } on success (returns the updated application).
 * - 404 JSON { success: false, error: 'Application not found' } if the application does not exist.
 * - 500 JSON { success: false, error: 'Failed to update application' } on unexpected errors.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await db();
    
    const body = await req.json();
    
    // Derive user from Authorization header when available
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const user = token ? await getUserFromToken(token) : null;
    const userId = user?.id || 'system';
    
    const application = await Application.findById(params.id);
    
    if (!application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }
    
    // Handle stage change (inline without relying on TS method typing)
    if (body.stage && body.stage !== application.stage) {
      const oldStage = application.stage;
      application.stage = body.stage;
      application.history.push({
        action: `stage_change:${oldStage}->${body.stage}`,
        by: userId,
        at: new Date(),
        details: body.reason
      });
    }

    // Handle score update
    if (typeof body.score === 'number' && body.score !== application.score) {
      const oldScore = application.score;
      application.score = body.score;
      application.history.push({
        action: 'score_updated',
        by: userId,
        at: new Date(),
        details: `Score changed from ${oldScore} to ${body.score}`
      });
    }

    // Handle note addition
    if (body.note) {
      application.notes.push({
        author: userId,
        text: body.note,
        createdAt: new Date(),
        isPrivate: !!body.isPrivate
      });
    }
    
    // Handle other updates
    if (Array.isArray(body.flags)) {
      (application as any).flags = body.flags;
    }
    if (Array.isArray(body.reviewers)) {
      (application as any).reviewers = body.reviewers;
    }
    
    await application.save();
    
    return NextResponse.json({ 
      success: true, 
      data: application 
    });
  } catch (error) {
    console.error('Application update error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update application' },
      { status: 500 }
    );
  }
}
