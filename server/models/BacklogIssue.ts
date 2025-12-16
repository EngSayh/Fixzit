/**
 * @module server/models/BacklogIssue
 * @description Backlog Issue model for project issue tracking and MongoDB SSOT sync.
 * Tracks bugs, tests, efficiency improvements, and next steps with prioritization and effort estimates.
 *
 * @features
 * - Issue categorization (bug, logic, test, efficiency, next_step)
 * - Priority scoring (P0-P3 with impact rating 1-10)
 * - Effort estimation (XS, S, M, L, XL)
 * - Status workflow (pending, in_progress, resolved, wont_fix)
 * - Location tracking (file, lines, section)
 * - External ID sync (for GitHub Issues, Jira, etc.)
 * - Mention count (frequency of issue references)
 * - Source tracking (audit logs, code comments, reviews)
 * - Risk tags (SECURITY, PERFORMANCE, DATA_INTEGRITY, etc.)
 * - First/last seen timestamps (recurrence tracking)
 * - Unique key identifier (internal reference)
 * - MongoDB SSOT synchronization (import/export)
 *
 * @statuses
 * - pending: Issue identified, not started
 * - in_progress: Actively being worked on
 * - resolved: Fix completed and verified
 * - wont_fix: Accepted as-is (technical debt, low priority)
 *
 * @indexes
 * - { key: 1 } unique - Internal issue key
 * - { externalId: 1 } unique sparse - External system sync
 * - { category: 1 } - Category filtering
 * - { priority: 1 } - Priority sorting
 * - { effort: 1 } - Effort-based queries
 * - { impact: 1 } - Impact sorting
 * - { status: 1 } - Status filtering
 * - { priority: 1, impact: -1, updatedAt: -1 } - Priority/impact dashboard
 * - { 'location.file': 1, status: 1 } - File-based issue tracking
 *
 * @relationships
 * - BACKLOG_AUDIT.json: Export/import sync for MongoDB SSOT
 * - External systems: externalId links to GitHub/Jira/etc.
 *
 * @compliance
 * - SSOT protocol (MongoDB as single source of truth)
 * - Immutable audit trail (firstSeen, lastSeen, mentionCount)
 *
 * @audit
 * - firstSeen: Initial issue discovery
 * - lastSeen: Most recent mention
 * - mentionCount: Occurrence frequency
 * - createdAt/updatedAt: Record lifecycle
 */
import { Schema, model, models } from 'mongoose';

export type BacklogCategory = 'bug' | 'logic' | 'test' | 'efficiency' | 'next_step';
export type BacklogPriority = 'P0' | 'P1' | 'P2' | 'P3';
export type BacklogEffort = 'XS' | 'S' | 'M' | 'L' | 'XL';
export type BacklogStatus = 'pending' | 'in_progress' | 'resolved' | 'wont_fix';

const BacklogIssueSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    externalId: { type: String, unique: true, sparse: true, index: true },
    category: { type: String, required: true, enum: ['bug', 'logic', 'test', 'efficiency', 'next_step'], index: true },
    title: { type: String, required: true, maxlength: 200 },
    description: { type: String, required: true, maxlength: 2000 },
    action: { type: String, required: true, maxlength: 2000 },
    location: {
      file: { type: String },
      lines: { type: String },
      section: { type: String },
    },
    priority: { type: String, required: true, enum: ['P0', 'P1', 'P2', 'P3'], index: true },
    effort: { type: String, required: true, enum: ['XS', 'S', 'M', 'L', 'XL'], index: true },
    impact: { type: Number, required: true, min: 1, max: 10, index: true },
    riskTags: { type: [String], default: [] },
    status: { type: String, required: true, enum: ['pending', 'in_progress', 'resolved', 'wont_fix'], default: 'pending', index: true },
    firstSeen: { type: Date, required: true },
    lastSeen: { type: Date, required: true },
    mentionCount: { type: Number, default: 1 },
    sourceEntries: { type: [String], default: [] },
    rawSource: { type: String, required: true, maxlength: 4000 },
    sourcePath: { type: String },
  },
  {
    timestamps: true,
    collection: 'backlog_issues',
  }
);

BacklogIssueSchema.index({ priority: 1, impact: -1, updatedAt: -1 });
BacklogIssueSchema.index({ 'location.file': 1, status: 1 });

export default models.BacklogIssue || model('BacklogIssue', BacklogIssueSchema);
