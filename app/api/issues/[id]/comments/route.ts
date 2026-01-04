/**
 * Issue Comments API Route Handler
 * GET /api/issues/[id]/comments - Get comments for an issue
 * POST /api/issues/[id]/comments - Add comment to an issue
 * 
 * @module app/api/issues/[id]/comments/route
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { logger } from '@/lib/logger';
import { enforceRateLimit } from '@/lib/middleware/rate-limit';
import { Issue } from '@/server/models/Issue';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { getSessionOrNull } from '@/lib/auth/safe-session';
import { parseBodySafe } from '@/lib/api/parse-body';
import { getSuperadminSession } from '@/lib/superadmin/auth';

// Default org ID for API token access
function resolveApiTokenOrgId(): string {
  const candidates = [
    process.env.SUPERADMIN_DEFAULT_ORG_ID?.trim(),
    process.env.SUPERADMIN_ORG_ID?.trim(),
    process.env.PUBLIC_ORG_ID?.trim(),
    process.env.DEFAULT_ORG_ID?.trim(),
  ];
  
  const validOrgId = candidates.find(id => id && id.length > 0);
  
  if (!validOrgId) {
    throw new Error(
      "CONFIGURATION_ERROR: No valid org ID configured for API token access. " +
      "Set one of: SUPERADMIN_DEFAULT_ORG_ID, SUPERADMIN_ORG_ID, PUBLIC_ORG_ID, or DEFAULT_ORG_ID"
    );
  }
  
  return validOrgId;
}

async function resolveIssueSession(request: NextRequest) {
  // Check for API token first (allows CLI access without session)
  const issueApiToken = process.env.ISSUE_API_TOKEN?.trim();
  if (issueApiToken) {
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token && token === issueApiToken) {
        return {
          ok: true as const,
          session: {
            id: 'api-token',
            role: 'super_admin',
            orgId: resolveApiTokenOrgId(),
            email: 'api@fixzit.local',
            isSuperAdmin: true,
          },
        };
      }
    }
  }

  const superadmin = await getSuperadminSession(request);
  if (superadmin) {
    return {
      ok: true as const,
      session: {
        id: superadmin.username,
        role: 'super_admin',
        orgId: superadmin.orgId,
        email: superadmin.username,
        isSuperAdmin: true,
      },
    };
  }

  return getSessionOrNull(request);
}

/**
 * Canonical admin roles that can access the issue tracker
 */
const ISSUE_TRACKER_ALLOWED_ROLES = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'CORPORATE_ADMIN',
  'MANAGER',
  'DEVELOPER',
]);

function isAllowedRole(role: string): boolean {
  const normalized = role.toUpperCase();
  return ISSUE_TRACKER_ALLOWED_ROLES.has(normalized);
}

// ============================================================================
// GET /api/issues/[id]/comments
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await resolveIssueSession(request);
    
    if (!result.ok) {
      return result.response;
    }
    
    const session = result.session;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!isAllowedRole(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await connectToDatabase();
    
    const { id } = await params;
    
    if (!session.orgId || !mongoose.isValidObjectId(session.orgId)) {
      logger.error("[COMMENTS-API] Invalid orgId in session", { issueId: id });
      return NextResponse.json(
        { error: 'Invalid organization ID' },
        { status: 400 }
      );
    }
    
    const orgId = new mongoose.Types.ObjectId(session.orgId);
    
    // Find issue by issueId or MongoDB _id
    const issue = await Issue.findOne({
      orgId,
      $or: [
        { issueId: id },
        { _id: mongoose.isValidObjectId(id) ? id : null },
      ],
    })
      .select('comments issueId')
      .lean();
    
    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        comments: issue.comments || [],
        issueId: issue.issueId,
      },
    });
  } catch (error) {
    logger.error('[COMMENTS-API] GET error', { error });
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST /api/issues/[id]/comments
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Rate limiting
    const rateLimit = enforceRateLimit(request, { requests: 30, windowMs: 60000 });
    if (rateLimit) return rateLimit;
    
    const result = await resolveIssueSession(request);
    
    if (!result.ok) {
      return result.response;
    }
    
    const session = result.session;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!isAllowedRole(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await connectToDatabase();
    
    const { id } = await params;
    
    // Parse request body
    const bodyResult = await parseBodySafe<{
      content: string;
      isInternal?: boolean;
    }>(request);
    
    if (bodyResult.error || !bodyResult.data) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    const { content, isInternal = false } = bodyResult.data;
    
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Comment content is required' },
        { status: 400 }
      );
    }
    
    if (content.length > 5000) {
      return NextResponse.json(
        { error: 'Comment exceeds maximum length (5000 characters)' },
        { status: 400 }
      );
    }
    
    if (!session.orgId || !mongoose.isValidObjectId(session.orgId)) {
      logger.error("[COMMENTS-API] Invalid orgId in session", { issueId: id });
      return NextResponse.json(
        { error: 'Invalid organization ID' },
        { status: 400 }
      );
    }
    
    const orgId = new mongoose.Types.ObjectId(session.orgId);
    
    // Find and update the issue
    // eslint-disable-next-line local/require-lean -- NO_LEAN: Document needed for .save() with comments push
    const issue = await Issue.findOne({
      orgId,
      $or: [
        { issueId: id },
        { _id: mongoose.isValidObjectId(id) ? id : null },
      ],
    });
    
    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }
    
    // Use the model's addComment method if available, otherwise push directly
    const author = session.email || session.id || 'Unknown';
    const newComment = {
      author,
      content: content.trim(),
      createdAt: new Date(),
      isInternal,
    };
    
    issue.comments.push(newComment);
    await issue.save();
    
    logger.info('[COMMENTS-API] Comment added', {
      issueId: issue.issueId,
      author,
      isInternal,
    });
    
    return NextResponse.json({
      success: true,
      data: {
        comment: newComment,
        issueId: issue.issueId,
      },
    });
  } catch (error) {
    logger.error('[COMMENTS-API] POST error', { error });
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    );
  }
}
