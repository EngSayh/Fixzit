/**
 * @fileoverview Superadmin Issues API - List and Update Operations
 *
 * Provides CRUD endpoints for superadmin backlog issue management with filtering,
 * status updates, and audit trail logging.
 *
 * @security Requires superadmin session (getSuperadminSession)
 * @see {@link /server/models/BacklogIssue.ts} for issue schema
 * @see {@link /server/models/BacklogEvent.ts} for audit event schema
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSuperadminSession } from '@/lib/superadmin/auth';
import { connectMongo } from '@/lib/db/mongoose';
import BacklogIssue from '@/server/models/BacklogIssue';
import BacklogEvent from '@/server/models/BacklogEvent';

/**
 * GET /api/superadmin/issues - List backlog issues with optional filtering
 *
 * @param {NextRequest} req - Next.js request object
 * @param {string} [req.searchParams.status] - Filter by status (pending, in_progress, resolved, wont_fix)
 * @param {string} [req.searchParams.priority] - Filter by priority (P0, P1, P2, P3)
 * @param {string} [req.searchParams.category] - Filter by category (bug, logic, test, efficiency, next_step)
 * @param {string} [req.searchParams.search] - Search in title/description
 * @param {string} [req.searchParams.page] - Page number (default: 1)
 * @param {string} [req.searchParams.limit] - Items per page (default: 25, max: 100)
 *
 * @returns {Promise<NextResponse>} JSON response with issues array and pagination
 * @returns {200} Success - { issues: BacklogIssue[], pagination: { page, limit, total, totalPages } }
 * @returns {401} Unauthorized - Superadmin session required
 *
 * @example
 * // Get all P1 pending issues with pagination
 * GET /api/superadmin/issues?status=pending&priority=P1&page=1&limit=25
 *
 * @security
 * - Requires valid superadmin session (no tenant isolation - global view)
 * - Cache-Control: no-store for live data
 */
export async function GET(req: NextRequest) {
  const session = await getSuperadminSession(req);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectMongo();

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const priority = url.searchParams.get('priority');
  const category = url.searchParams.get('category');
  const search = url.searchParams.get('search');
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '25', 10)));

  // SUPER_ADMIN: internal issue tracker is platform-wide
  const filter: Record<string, unknown> = {};
  if (status && status !== 'all') filter.status = status;
  if (priority && priority !== 'all') filter.priority = priority;
  if (category && category !== 'all') filter.category = category;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { key: { $regex: search, $options: 'i' } },
    ];
  }

  const [issues, total] = await Promise.all([
    BacklogIssue.find(filter)
      .sort({ priority: 1, impact: -1, updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    BacklogIssue.countDocuments(filter),
  ]);

  // Map BacklogIssue fields to expected UI format
  const mappedIssues = issues.map((issue) => ({
    _id: issue._id,
    issueId: issue.key,
    legacyId: issue.externalId,
    title: issue.title,
    description: issue.description,
    category: issue.category,
    priority: issue.priority,
    status: issue.status === 'pending' ? 'open' : issue.status,
    effort: issue.effort,
    module: issue.location?.section || 'general',
    location: {
      filePath: issue.location?.file || '',
      lineStart: issue.location?.lines ? parseInt(issue.location.lines.split('-')[0], 10) : undefined,
      lineEnd: issue.location?.lines ? parseInt(issue.location.lines.split('-')[1] || issue.location.lines.split('-')[0], 10) : undefined,
    },
    riskTags: issue.riskTags || [],
    labels: issue.riskTags || [],
    mentionCount: issue.mentionCount || 1,
    firstSeenAt: issue.firstSeen,
    lastSeenAt: issue.lastSeen,
    createdAt: issue.createdAt,
    updatedAt: issue.updatedAt,
  }));

  return NextResponse.json({
    issues: mappedIssues,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  }, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

/**
 * POST /api/superadmin/issues - Update issue status or add comment
 *
 * @param {NextRequest} req - Next.js request object
 * @param {object} req.body - Update payload
 * @param {string} req.body.key - Issue key (e.g., "SEC-002", "DOC-101")
 * @param {string} [req.body.status] - New status (open, in_progress, resolved, wont_fix)
 * @param {string} [req.body.comment] - Comment text for audit trail
 *
 * @returns {Promise<NextResponse>} JSON response with updated issue
 * @returns {200} Success - { success: true, issue: BacklogIssue }
 * @returns {400} Bad Request - Missing required 'key' field
 * @returns {401} Unauthorized - Superadmin session required
 * @returns {404} Not Found - Issue with specified key does not exist
 *
 * @example
 * // Mark issue as resolved
 * POST /api/superadmin/issues
 * {
 *   "key": "DOC-102",
 *   "status": "resolved",
 *   "comment": "All 51 lib modules documented"
 * }
 *
 * @example
 * // Add comment without status change
 * POST /api/superadmin/issues
 * {
 *   "key": "SEC-002",
 *   "comment": "Started tenant scope validation batch 1"
 * }
 *
 * @security
 * - Requires valid superadmin session
 * - Creates audit events (BacklogEvent) for status changes and comments
 * - Actor derived from session username/email
 */
export async function POST(req: NextRequest) {
  const session = await getSuperadminSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectMongo();

  const body = await req.json();
  const { key, status, comment } = body;

  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  // SUPER_ADMIN: backlog issues are platform-wide
  const issue = await BacklogIssue.findOne({ key });
  if (!issue) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const actor = (session as {username?: string; email?: string}).username || (session as {username?: string; email?: string}).email || 'superadmin';

  if (status) {
    issue.status = status;
    // SUPER_ADMIN: backlog events are platform-wide
    await BacklogEvent.create({
      issueKey: key,
      type: 'status_change',
      message: `Status changed to ${status}`,
      actor,
      meta: { newStatus: status },
    });
  }

  if (comment) {
    // SUPER_ADMIN: backlog events are platform-wide
    await BacklogEvent.create({
      issueKey: key,
      type: 'comment',
      message: comment,
      actor,
    });
  }

  await issue.save();

  return NextResponse.json({ success: true, issue });
}
