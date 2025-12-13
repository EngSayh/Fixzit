/**
 * Single Issue API Route Handler
 * GET /api/issues/[id] - Get issue by ID
 * PATCH /api/issues/[id] - Update issue
 * DELETE /api/issues/[id] - Delete issue
 * 
 * @module app/api/issues/[id]/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import mongoose from 'mongoose';
import Issue, { 
  IssueStatus, 
  IssuePriority, 
  IssueEffort,
  IssueStatusType,
} from '@/models/issue';
import { connectDB } from '@/lib/db';
import { authOptions } from '@/lib/auth';

// ============================================================================
// GET /api/issues/[id]
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    await connectDB();
    
    const { id } = params;
    const orgId = new mongoose.Types.ObjectId(session.user.orgId);
    
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
          _id: { $in: issue.relatedIssues.map((r: any) => r.issueId) },
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
    console.error('GET /api/issues/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH /api/issues/[id]
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const allowedRoles = ['super_admin', 'admin', 'developer'];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await connectDB();
    
    const { id } = params;
    const body = await request.json();
    const orgId = new mongoose.Types.ObjectId(session.user.orgId);
    
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
      if (!Object.values(IssueStatus).includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${Object.values(IssueStatus).join(', ')}` },
          { status: 400 }
        );
      }
      
      await issue.changeStatus(
        body.status as IssueStatusType,
        session.user.email || session.user.id,
        body.statusReason
      );
      delete body.status;
      delete body.statusReason;
    }
    
    // Handle adding comment
    if (body.comment) {
      await issue.addComment(
        session.user.email || session.user.id,
        body.comment.content,
        body.comment.isInternal || false
      );
      delete body.comment;
    }
    
    // Validate other fields
    if (body.priority && !Object.values(IssuePriority).includes(body.priority)) {
      return NextResponse.json(
        { error: `Invalid priority. Must be one of: ${Object.values(IssuePriority).join(', ')}` },
        { status: 400 }
      );
    }
    
    if (body.effort && !Object.values(IssueEffort).includes(body.effort)) {
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
    ];
    
    const updates: any = {};
    for (const key of allowedUpdates) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }
    
    // Update sprint readiness based on dependencies
    if (updates.dependencies !== undefined) {
      updates.sprintReady = updates.dependencies.length === 0 && !updates.blockedBy;
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
    console.error('PATCH /api/issues/[id] error:', error);
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Only super_admin can delete
    if (session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    await connectDB();
    
    const { id } = params;
    const orgId = new mongoose.Types.ObjectId(session.user.orgId);
    
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
    console.error('DELETE /api/issues/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
