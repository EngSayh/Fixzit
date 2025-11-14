import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { Application } from '@/server/models/Application';
import { getUserFromToken } from '@/lib/auth';

import { rateLimit } from '@/server/security/rateLimit';
import {notFoundError, rateLimitError} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
import { getClientIP } from '@/server/security/headers';

/**
 * @openapi
 * /api/ats/applications/[id]:
 *   get:
 *     summary: ats/applications/[id] operations
 *     tags: [ats]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  // Rate limiting
  const clientIp = getClientIP(req);
  const rl = rateLimit(`${new URL(req.url).pathname}:${clientIp}`, 60, 60_000);
  if (!rl.allowed) {
    return rateLimitError();
  }

  const params = await props.params;
  try {
  await connectToDatabase();
    const application = await (Application as any)
      .findById(params.id)
      .populate('jobId')
      .populate('candidateId')
      .lean();
    if (!application) return notFoundError("Application");
    return NextResponse.json({ success: true, data: application });
  } catch (error) {
    logger.error('Application fetch error:', error instanceof Error ? error.message : 'Unknown error');
    return createSecureResponse({ error: "Failed to fetch application" }, 500, req);
  }
}

export async function PATCH(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
  await connectToDatabase();
    const body = await req.json();
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const user = token ? await getUserFromToken(token) : null;
    const userId = user?.id || 'system';
    
    const application = await Application.findById(params.id);
    if (!application) return notFoundError("Application");
    
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
    if (Array.isArray(body.flags)) application.flags = body.flags;
    if (Array.isArray(body.reviewers)) application.reviewers = body.reviewers;
    
    await application.save();
    return NextResponse.json({ success: true, data: application });
  } catch (error) {
    logger.error('Application update error:', error instanceof Error ? error.message : 'Unknown error');
    return createSecureResponse({ error: "Failed to update application" }, 500, req);
  }
}


