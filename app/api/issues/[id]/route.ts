/**
 * Single Issue API Route Handler
 * GET /api/issues/[id] - Get issue by ID
 * PATCH /api/issues/[id] - Update issue
 * DELETE /api/issues/[id] - Delete issue
 * 
 * @module app/api/issues/[id]/route
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { logger } from '@/lib/logger';
import { enforceRateLimit } from '@/lib/middleware/rate-limit';
import { 
  Issue,
  IIssue,
  IssueStatus, 
  IssuePriority, 
  IssueEffort,
  IssueStatusType,
  IFileLocation,
  IRelatedIssue,
} from '@/server/models/Issue';
import IssueEvent from '@/server/models/IssueEvent';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { getSessionOrNull } from '@/lib/auth/safe-session';
import { parseBodySafe } from '@/lib/api/parse-body';
import { getSuperadminSession } from '@/lib/superadmin/auth';

/** Lean document type for Issue.findOne().lean() results */
type IssueLeanDoc = {
  _id: mongoose.Types.ObjectId;
  key?: string;
  issueId?: string;
  location?: IFileLocation;
  relatedIssues?: IRelatedIssue[];
} & Record<string, unknown>;

async function resolveIssueSession(request: NextRequest) {
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
 * Uses uppercase values to match UserRole enum
 * Includes DEVELOPER for issue creation/management workflow
 */
const ISSUE_TRACKER_ALLOWED_ROLES = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'CORPORATE_ADMIN',
  'MANAGER',
  'DEVELOPER',
]);

/**
 * Check if a role is allowed to access the issue tracker
 * Handles both lowercase (superadmin session) and uppercase (normal session)
 */
function isAllowedRole(role: string): boolean {
  const normalized = role.toUpperCase();
  return ISSUE_TRACKER_ALLOWED_ROLES.has(normalized);
}

// ============================================================================
// GET /api/issues/[id]
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
    
    // Check for allowed admin/developer role
    if (!isAllowedRole(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await connectToDatabase();
    
    const { id } = await params;
    
    // Validate orgId before ObjectId conversion to prevent server crashes
    if (!session.orgId || !mongoose.isValidObjectId(session.orgId)) {
      logger.error("[FIXZIT-API-004] Invalid or missing orgId in session (GET issue)", {
        hasOrgId: !!session.orgId,
        issueId: id,
      });
      return NextResponse.json(
        {
          error: {
            code: "FIXZIT-API-004",
            message: "Invalid organization ID",
            details: "Session contains an invalid or missing organization identifier.",
          },
        },
        { status: 400 }
      );
    }
    const orgId = new mongoose.Types.ObjectId(session.orgId);
    
    // Find by issueId (e.g., BUG-0001) or MongoDB _id
    const issue = await Issue.findOne({
      orgId,
      $or: [
        { issueId: id },
        { _id: mongoose.isValidObjectId(id) ? id : null },
        { legacyId: id },
      ],
    }).lean() as IssueLeanDoc | null;
    
    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }
    // Ensure key is populated for response
    const issueWithKey = {
      ...issue,
      key: issue.key || issue.issueId || (await params).id,
    };
    
    // Get related issues
    const relatedIssues = issue.relatedIssues?.length
      ? await Issue.find({
          orgId,
          _id: { $in: issue.relatedIssues.map((r) => r.issueId) },
        })
          .select('issueId title status priority')
          .lean()
      : [];
    
    return NextResponse.json({
      success: true,
      data: {
        issue: {
          ...issueWithKey,
          relatedIssuesDetails: relatedIssues,
        },
      },
    });
    
  } catch (error) {
    logger.error('GET /api/issues/[id] error:', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH /api/issues/[id]
// ============================================================================

interface UpdateIssueBody {
  status?: string;
  statusReason?: string;
  comment?: { content: string; isInternal?: boolean };
  title?: string;
  description?: string;
  priority?: string;
  effort?: string;
  location?: { filePath: string; lineStart?: number; lineEnd?: number };
  module?: string;
  subModule?: string;
  action?: string;
  rootCause?: string;
  resolution?: string;
  definitionOfDone?: string;
  acceptanceCriteria?: string[];
  riskTags?: string[];
  dependencies?: string[];
  blockedBy?: string;
  assignedTo?: string;
  reviewedBy?: string;
  validation?: { type: string; command?: string; expectedResult?: string };
  sprintReady?: boolean;
  sprintId?: string;
  storyPoints?: number;
  labels?: string[];
  externalLinks?: { jira?: string; github?: string; notion?: string };
  suggestedPrTitle?: string;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit: 60 updates per minute
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "issues:update",
    requests: 60,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const result = await resolveIssueSession(request);
    
    if (!result.ok) {
      return result.response;
    }
    
    const session = result.session;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check for allowed roles (handles both lowercase superadmin and uppercase normal roles)
    if (!isAllowedRole(session.role)) {
      return NextResponse.json({ error: 'Forbidden - insufficient role' }, { status: 403 });
    }
    
    await connectToDatabase();
    
    const { id } = await params;
    const bodyResult = await parseBodySafe<UpdateIssueBody>(request);
    if (bodyResult.error) {
      return NextResponse.json({ error: bodyResult.error }, { status: 400 });
    }
    const body = bodyResult.data!;
    
    // Validate orgId before ObjectId conversion to prevent server crashes
    if (!session.orgId || !mongoose.isValidObjectId(session.orgId)) {
      logger.error("[FIXZIT-API-005] Invalid or missing orgId in session (PATCH issue)", {
        hasOrgId: !!session.orgId,
        issueId: id,
      });
      return NextResponse.json(
        {
          error: {
            code: "FIXZIT-API-005",
            message: "Invalid organization ID",
            details: "Session contains an invalid or missing organization identifier.",
          },
        },
        { status: 400 }
      );
    }
    const orgId = new mongoose.Types.ObjectId(session.orgId);
    let statusChanged = false;
    let previousStatus: IssueStatusType | null = null;
    let nextStatus: IssueStatusType | null = null;
    
    // Find issue
    // eslint-disable-next-line local/require-lean -- NO_LEAN: Document needed for status update and .save()
    const issue = await Issue.findOne({
      orgId,
      $or: [
        { issueId: id },
        { _id: mongoose.isValidObjectId(id) ? id : null },
        { legacyId: id },
      ],
    });
    
    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }
    
    // Handle status change with history
    if (body.status && body.status !== issue.status) {
      if (!Object.values(IssueStatus).includes(body.status as IssueStatusType)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${Object.values(IssueStatus).join(', ')}` },
          { status: 400 }
        );
      }
      previousStatus = issue.status as IssueStatusType;
      nextStatus = body.status as IssueStatusType;
      await issue.changeStatus(
        body.status as IssueStatusType,
        session.email || session.id,
        body.statusReason
      );
      statusChanged = true;
      delete body.status;
      delete body.statusReason;
    }
    
    // Handle adding comment
    if (body.comment) {
      await issue.addComment(
        session.email || session.id,
        body.comment.content,
        body.comment.isInternal || false
      );
      delete body.comment;
    }
    
    // Validate other fields
    if (body.priority && !Object.values(IssuePriority).includes(body.priority as typeof IssuePriority[keyof typeof IssuePriority])) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${Object.values(IssuePriority).join(', ')}` },
        { status: 400 }
      );
    }
    
    if (body.effort && !Object.values(IssueEffort).includes(body.effort as typeof IssueEffort[keyof typeof IssueEffort])) {
      return NextResponse.json(
        { error: `Invalid effort. Must be one of: ${Object.values(IssueEffort).join(', ')}` },
        { status: 400 }
      );
    }
    
    // Whitelist updateable fields
    const allowedUpdates = [
      'title', 'description', 'priority', 'effort', 'location',
      'module', 'subModule', 'action', 'rootCause', 'resolution',
      'definitionOfDone', 'acceptanceCriteria', 'riskTags',
      'dependencies', 'blockedBy', 'assignedTo', 'reviewedBy',
      'validation', 'sprintReady', 'sprintId', 'storyPoints',
      'labels', 'externalLinks', 'suggestedPrTitle',
    ] as const;
    
    const updates: Record<string, unknown> = {};
    for (const key of allowedUpdates) {
      if (body[key as keyof UpdateIssueBody] !== undefined) {
        updates[key] = body[key as keyof UpdateIssueBody];
      }
    }
    
    // Update sprint readiness based on dependencies
    if (updates.dependencies !== undefined) {
      updates.sprintReady = (updates.dependencies as string[]).length === 0 && !updates.blockedBy;
    }
    
    if (Object.keys(updates).length > 0) {
      Object.assign(issue, updates);
      await issue.save();
    }
    
    if (statusChanged && previousStatus && nextStatus) {
      await IssueEvent.create({
        issueId: issue._id,
        key: (issue as IIssue).key,
        type: nextStatus === IssueStatus.RESOLVED ? "RESOLVED" : "STATUS_CHANGED",
        sourceRef: "manual-update",
        sourceHash: issue.sourceHash,
        orgId,
        metadata: { from: previousStatus, to: nextStatus },
      });
    }
    
    return NextResponse.json({
      success: true,
      data: { issue },
    });
    
  } catch (error) {
    logger.error('PATCH /api/issues/[id] error:', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE /api/issues/[id]
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Rate limit: 10 deletions per minute
  const rateLimitResponse = enforceRateLimit(request, {
    keyPrefix: "issues:delete",
    requests: 10,
    windowMs: 60_000,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const result = await resolveIssueSession(request);
    
    if (!result.ok) {
      return result.response;
    }
    
    const session = result.session;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only super_admin can delete
    if (session.role !== 'SUPER_ADMIN' && session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await connectToDatabase();
    
    const { id } = await params;
    
    // Validate orgId before ObjectId conversion to prevent server crashes
    if (!session.orgId || !mongoose.isValidObjectId(session.orgId)) {
      logger.error("[FIXZIT-API-006] Invalid or missing orgId in session (DELETE issue)", {
        hasOrgId: !!session.orgId,
        issueId: id,
      });
      return NextResponse.json(
        {
          error: {
            code: "FIXZIT-API-006",
            message: "Invalid organization ID",
            details: "Session contains an invalid or missing organization identifier.",
          },
        },
        { status: 400 }
      );
    }
    const orgId = new mongoose.Types.ObjectId(session.orgId);
    
    const issue = await Issue.findOneAndDelete({
      orgId,
      $or: [
        { issueId: id },
        { _id: mongoose.isValidObjectId(id) ? id : null },
        { legacyId: id },
      ],
    });
    
    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: { 
        message: 'Issue deleted successfully',
        deletedId: issue.issueId,
      },
    });
    
  } catch (error) {
    logger.error('DELETE /api/issues/[id] error:', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
