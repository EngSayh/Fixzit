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
 * @param {string} [req.searchParams.status] - Filter by status (open, in_progress, resolved, etc.)
 * @param {string} [req.searchParams.priority] - Filter by priority (P0, P1, P2, P3)
 * @param {string} [req.searchParams.category] - Filter by category (bug, security, test, etc.)
 *
 * @returns {Promise<NextResponse>} JSON response with issues array
 * @returns {200} Success - { issues: BacklogIssue[] } (max 100 results, sorted by priority/impact/updatedAt)
 * @returns {401} Unauthorized - Superadmin session required
 *
 * @example
 * // Get all open P1 issues
 * GET /api/superadmin/issues?status=open&priority=P1
 *
 * @example
 * // Get all security issues
 * GET /api/superadmin/issues?category=security
 *
 * @security
 * - Requires valid superadmin session (no tenant isolation - global view)
 * - No rate limiting (internal admin tool)
 */
export async function GET(req: NextRequest) {
  const session = await getSuperadminSession(req);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await connectMongo();

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const priority = url.searchParams.get('priority');
  const category = url.searchParams.get('category');

  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (category) filter.category = category;

  const issues = await BacklogIssue.find(filter).sort({ priority: 1, impact: -1, updatedAt: -1 }).limit(100).lean();

  return NextResponse.json({ issues });
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

  const issue = await BacklogIssue.findOne({ key });
  if (!issue) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const actor = (session as {username?: string; email?: string}).username || (session as {username?: string; email?: string}).email || 'superadmin';

  if (status) {
    issue.status = status;
    await BacklogEvent.create({
      issueKey: key,
      type: 'status_change',
      message: `Status changed to ${status}`,
      actor,
      meta: { newStatus: status },
    });
  }

  if (comment) {
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
