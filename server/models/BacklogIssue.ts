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

/**
 * Backlog issue category classification
 *
 * @category - Issue type for prioritization and routing
 * - bug: Defects, errors, crashes, incorrect behavior
 * - logic: Algorithmic flaws, incorrect business rules
 * - test: Missing or insufficient test coverage
 * - efficiency: Performance, optimization, resource usage
 * - next_step: Feature work, enhancements, planned improvements
 *
 * @usage Assign during issue creation to route to appropriate team/workflow
 * @example
 * // Bug classification
 * const issue: BacklogCategory = 'bug';
 *
 * // Test coverage issue
 * const testIssue: BacklogCategory = 'test';
 */
export type BacklogCategory = 'bug' | 'logic' | 'test' | 'efficiency' | 'next_step';

/**
 * Backlog issue priority levels (0 = highest, 3 = lowest)
 *
 * @priority - Urgency and business impact classification
 * - P0: Critical - System down, data loss, security breach (fix immediately)
 * - P1: High - Major functionality broken, affects many users (fix within 24h)
 * - P2: Medium - Minor functionality issues, workarounds exist (fix within 1 week)
 * - P3: Low - Nice-to-have, cosmetic, documentation (backlog)
 *
 * @usage Combine with impact (1-10) for prioritization scoring
 * @example
 * // Security issue - immediate attention
 * const priority: BacklogPriority = 'P0';
 *
 * // Documentation gap - backlog
 * const docPriority: BacklogPriority = 'P3';
 */
export type BacklogPriority = 'P0' | 'P1' | 'P2' | 'P3';

/**
 * Backlog issue effort estimation (time to complete)
 *
 * @effort - T-shirt sizing for sprint planning
 * - XS: < 1 hour (simple fix, one-line change, typo)
 * - S: 1-4 hours (small feature, minor refactor, straightforward bug)
 * - M: 1-2 days (moderate complexity, multiple files, some testing)
 * - L: 3-5 days (complex feature, significant refactor, extensive testing)
 * - XL: > 1 week (major feature, architectural change, requires research)
 *
 * @usage Sprint capacity planning and velocity tracking
 * @example
 * // Quick win - JSDoc addition
 * const effort: BacklogEffort = 'XS';
 *
 * // Major refactor - multi-day work
 * const largeEffort: BacklogEffort = 'L';
 */
export type BacklogEffort = 'XS' | 'S' | 'M' | 'L' | 'XL';

/**
 * Backlog issue status workflow
 *
 * @status - Issue lifecycle state
 * - pending: Issue identified, not yet started (awaiting triage/assignment)
 * - in_progress: Actively being worked on (assigned to developer)
 * - resolved: Fix completed and verified (code merged, tests passing)
 * - wont_fix: Accepted as-is (technical debt, low ROI, out of scope)
 *
 * @transitions
 * - pending → in_progress (developer starts work)
 * - in_progress → resolved (fix verified)
 * - in_progress → pending (deprioritized, blocked)
 * - pending → wont_fix (team decision to skip)
 * - resolved (terminal state - no further transitions)
 *
 * @usage Track issue progress in Kanban/Scrum workflows
 * @example
 * // New issue
 * let status: BacklogStatus = 'pending';
 *
 * // Start work
 * status = 'in_progress';
 *
 * // Complete fix
 * status = 'resolved';
 */
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
