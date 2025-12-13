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
import { 
  Issue,
  IssueStatus, 
  IssuePriority, 
  IssueEffort,
  IssueStatusType,
} from '@/server/models/Issue';
import { connectToDatabase } from '@/lib/mongodb-unified';
import { getSessionOrNull } from '@/lib/auth/safe-session';
import { parseBodySafe } from '@/lib/api/parse-body';

// ============================================================================
// GET /api/issues/[id]
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await getSessionOrNull(request);
    
    if (!result.ok) {
      return result.response;
    }
    
    const session = result.session;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await connectToDatabase();
    
    const { id } = await params;
    const orgId = new mongoose.Types.ObjectId(session.orgId);
    
    // Find by issueId (e.g., BUG-0001) or MongoDB _id
    const issue = await Issue.findOne({
      orgId,
      $or: [
        { issueId: id },
        { _id: mongoose.isValidObjectId(id) ? id : null },
        { legacyId: id },
      ],
    }).lean();
    
    if (!issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }
    
    // Get related issues
    const relatedIssues = issue.relatedIssues?.length
      ? await Issue.find({
          _id: { $in: issue.relatedIssues.map((r) => r.issueId) },
        })
          .select('issueId title status priority')
          .lean()
      : [];
    
    return NextResponse.json({
      success: true,
      data: {
        issue: {
          ...issue,
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
  try {
    const result = await getSessionOrNull(request);
    
    if (!result.ok) {
      return result.response;
    }
    
    const session = result.session;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const allowedRoles = ['super_admin', 'admin', 'developer'];
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await connectToDatabase();
    
    const { id } = await params;
    const bodyResult = await parseBodySafe<UpdateIssueBody>(request);
    if (!bodyResult.ok) {
      return NextResponse.json({ error: bodyResult.error }, { status: 400 });
    }
    const body = bodyResult.data;
    const orgId = new mongoose.Types.ObjectId(session.orgId);
    
    // Find issue
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
      
      await issue.changeStatus(
        body.status as IssueStatusType,
        session.email || session.id,
        body.statusReason
      );
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
  try {
    const result = await getSessionOrNull(request);
    
    if (!result.ok) {
      return result.response;
    }
    
    const session = result.session;
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only super_admin can delete
    if (session.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await connectToDatabase();
    
    const { id } = await params;
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
