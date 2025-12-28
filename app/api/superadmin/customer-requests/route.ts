/**
 * @fileoverview Superadmin Customer Requests API - List, Create, Update Operations
 *
 * Provides CRUD endpoints for customer request management with tenant filtering,
 * status updates, and audit trail logging.
 *
 * @security Requires superadmin session (getSuperadminSession)
 * @see {@link /server/models/CustomerRequest.ts} for request schema
 * @see {@link /server/models/CustomerRequestEvent.ts} for audit event schema
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSuperadminSession } from '@/lib/superadmin/auth';
import { connectMongo } from '@/lib/db/mongoose';
import CustomerRequest from '@/server/models/CustomerRequest';
import CustomerRequestEvent from '@/server/models/CustomerRequestEvent';

/**
 * GET /api/superadmin/customer-requests - List customer requests with filtering
 *
 * @param {NextRequest} req - Next.js request object
 * @param {string} [req.searchParams.tenantId] - Filter by tenant
 * @param {string} [req.searchParams.status] - Filter by status
 * @param {string} [req.searchParams.requestType] - Filter by request type
 * @param {string} [req.searchParams.severity] - Filter by severity
 * @param {string} [req.searchParams.channel] - Filter by channel
 * @param {string} [req.searchParams.linkedSystemIssueId] - Filter by linked system issue
 *
 * @returns {Promise<NextResponse>} JSON response with requests array
 */
export async function GET(req: NextRequest) {
  const session = await getSuperadminSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectMongo();

  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenantId');
  const status = url.searchParams.get('status');
  const requestType = url.searchParams.get('requestType');
  const severity = url.searchParams.get('severity');
  const channel = url.searchParams.get('channel');
  const linkedSystemIssueId = url.searchParams.get('linkedSystemIssueId');

  const filter: Record<string, unknown> = {};
  if (tenantId) filter.tenantId = tenantId;
  if (status) filter.status = status;
  if (requestType) filter.requestType = requestType;
  if (severity) filter.severity = severity;
  if (channel) filter.channel = channel;
  if (linkedSystemIssueId) filter.linkedSystemIssueId = linkedSystemIssueId;

  const requests = await CustomerRequest.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  // Get aggregated stats (AUDIT-2025-12-21: Added maxTimeMS for safety)
  const stats = await CustomerRequest.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        new: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
        triaged: { $sum: { $cond: [{ $eq: ['$status', 'triaged'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        released: { $sum: { $cond: [{ $eq: ['$status', 'released'] }, 1, 0] } },
        closed: { $sum: { $cond: [{ $eq: ['$status', 'closed'] }, 1, 0] } },
        featureRequests: { $sum: { $cond: [{ $eq: ['$requestType', 'feature_request'] }, 1, 0] } },
        bugReports: { $sum: { $cond: [{ $eq: ['$requestType', 'bug_report'] }, 1, 0] } },
        incidents: { $sum: { $cond: [{ $eq: ['$requestType', 'incident'] }, 1, 0] } },
        questions: { $sum: { $cond: [{ $eq: ['$requestType', 'question'] }, 1, 0] } },
        critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
        high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
      },
    },
  ], { maxTimeMS: 10_000 });

  return NextResponse.json({
    requests,
    stats: stats[0] || {
      total: 0,
      new: 0,
      triaged: 0,
      inProgress: 0,
      released: 0,
      closed: 0,
      featureRequests: 0,
      bugReports: 0,
      incidents: 0,
      questions: 0,
      critical: 0,
      high: 0,
    },
  });
}

/**
 * POST /api/superadmin/customer-requests - Create new customer request
 */
export async function POST(req: NextRequest) {
  const session = await getSuperadminSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectMongo();

  try {
    const body = await req.json();
    const {
      tenantId,
      requestType,
      title,
      details,
      severity,
      channel,
      reporter,
      linkedSystemIssueId,
      tags,
      responseDeadline,
      resolutionDeadline,
      assignedTo,
    } = body;

    if (!tenantId || !requestType || !title || !details || !severity || !channel) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, requestType, title, details, severity, channel' },
        { status: 400 }
      );
    }

    const request = new CustomerRequest({
      tenantId,
      requestType,
      title,
      details,
      severity,
      channel,
      reporter,
      linkedSystemIssueId,
      tags: tags || [],
      responseDeadline: responseDeadline ? new Date(responseDeadline) : undefined,
      resolutionDeadline: resolutionDeadline ? new Date(resolutionDeadline) : undefined,
      assignedTo,
      status: 'new',
    });

    await request.save();

    // Create audit event
    // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Creates event for request tracking
    await CustomerRequestEvent.create({
      tenantId,
      requestId: request.requestId,
      type: 'created',
      message: `Request created: ${title}`,
      actor: session.username || 'superadmin',
      meta: { requestType, severity, channel },
    });

    return NextResponse.json({ success: true, request }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to create request', details: message }, { status: 500 });
  }
}

/**
 * PATCH /api/superadmin/customer-requests - Update customer request
 */
export async function PATCH(req: NextRequest) {
  const session = await getSuperadminSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectMongo();

  try {
    const body = await req.json();
    const { requestId, status, severity, linkedSystemIssueId, assignedTo, resolution, comment } = body;

    if (!requestId) {
      return NextResponse.json({ error: 'Missing required field: requestId' }, { status: 400 });
    }

    // eslint-disable-next-line local/require-lean, local/require-tenant-scope -- NO_LEAN: Document needed for updates; SUPER_ADMIN: Cross-tenant access
    const request = await CustomerRequest.findOne({ requestId });
    if (!request) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const updates: Record<string, unknown> = {};
    const events: { type: string; message: string; meta?: Record<string, unknown> }[] = [];
    const actor = session.username || 'superadmin';

    // Status change
    if (status && status !== request.status) {
      const oldStatus = request.status;
      updates.status = status;
      events.push({
        type: 'status_change',
        message: `Status changed from ${oldStatus} to ${status}`,
        meta: { oldStatus, newStatus: status },
      });

      if (status === 'closed') {
        updates.closedAt = new Date();
      } else if (status === 'released') {
        updates.resolvedAt = new Date();
      }
    }

    // Severity change
    if (severity && severity !== request.severity) {
      const oldSeverity = request.severity;
      updates.severity = severity;
      events.push({
        type: 'severity_change',
        message: `Severity changed from ${oldSeverity} to ${severity}`,
        meta: { oldSeverity, newSeverity: severity },
      });
    }

    // Link to system issue
    if (linkedSystemIssueId !== undefined) {
      if (linkedSystemIssueId && !request.linkedSystemIssueId) {
        updates.linkedSystemIssueId = linkedSystemIssueId;
        events.push({
          type: 'link_system_issue',
          message: `Linked to system issue: ${linkedSystemIssueId}`,
          meta: { linkedSystemIssueId },
        });
      } else if (!linkedSystemIssueId && request.linkedSystemIssueId) {
        updates.linkedSystemIssueId = null;
        events.push({
          type: 'unlink_system_issue',
          message: `Unlinked from system issue: ${request.linkedSystemIssueId}`,
          meta: { unlinkedIssueId: request.linkedSystemIssueId },
        });
      }
    }

    // Assignment change
    if (assignedTo !== undefined && assignedTo !== request.assignedTo) {
      updates.assignedTo = assignedTo || null;
      events.push({
        type: 'assignment',
        message: assignedTo
          ? `Assigned to ${assignedTo}`
          : `Unassigned from ${request.assignedTo}`,
        meta: { oldAssignee: request.assignedTo, newAssignee: assignedTo },
      });
    }

    // Resolution
    if (resolution) {
      updates.resolution = resolution;
    }

    // Comment
    if (comment) {
      events.push({
        type: 'comment',
        message: comment,
      });
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
      // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Cross-tenant access
      await CustomerRequest.updateOne({ requestId }, { $set: updates });
    }

    // Create audit events
    for (const event of events) {
      // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Creates event for request tracking
      await CustomerRequestEvent.create({
        tenantId: request.tenantId,
        requestId,
        type: event.type,
        message: event.message,
        actor,
        meta: event.meta,
      });
    }

    // eslint-disable-next-line local/require-tenant-scope -- SUPER_ADMIN: Cross-tenant access
    const updated = await CustomerRequest.findOne({ requestId }).lean();
    return NextResponse.json({ success: true, request: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to update request', details: message }, { status: 500 });
  }
}
