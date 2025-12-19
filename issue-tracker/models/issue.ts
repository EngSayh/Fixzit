/**
 * Issue Tracker Model
 * MongoDB Schema for tracking development issues, bugs, and tasks
 * 
 * @module models/issue
 * @requires mongoose
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const IssueCategory = {
  BUG: 'bug',
  LOGIC_ERROR: 'logic_error',
  MISSING_TEST: 'missing_test',
  EFFICIENCY: 'efficiency',
  SECURITY: 'security',
  FEATURE: 'feature',
  REFACTOR: 'refactor',
  DOCUMENTATION: 'documentation',
  NEXT_STEP: 'next_step',
} as const;

export const IssuePriority = {
  P0_CRITICAL: 'P0',
  P1_HIGH: 'P1',
  P2_MEDIUM: 'P2',
  P3_LOW: 'P3',
} as const;

export const IssueStatus = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  BLOCKED: 'blocked',
  RESOLVED: 'resolved',
  CLOSED: 'closed',
  WONT_FIX: 'wont_fix',
} as const;

export const IssueEffort = {
  XS: 'XS',  // < 1 hour
  S: 'S',    // 1-4 hours
  M: 'M',    // 4-8 hours (1 day)
  L: 'L',    // 2-3 days
  XL: 'XL',  // 1+ week
} as const;

export const RiskTag = {
  SECURITY: 'SECURITY',
  MULTI_TENANT: 'MULTI_TENANT',
  FINANCIAL: 'FINANCIAL',
  PERFORMANCE: 'PERFORMANCE',
  TEST_GAP: 'TEST_GAP',
  DATA_INTEGRITY: 'DATA_INTEGRITY',
  INTEGRATION: 'INTEGRATION',
  REGRESSION: 'REGRESSION',
} as const;

export const IssueSource = {
  MANUAL: 'manual',
  AUDIT: 'audit',
  CI_CD: 'ci_cd',
  USER_REPORT: 'user_report',
  AUTOMATED_SCAN: 'automated_scan',
  CODE_REVIEW: 'code_review',
  MONITORING: 'monitoring',
  IMPORT: 'import',
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type IssueCategoryType = typeof IssueCategory[keyof typeof IssueCategory];
export type IssuePriorityType = typeof IssuePriority[keyof typeof IssuePriority];
export type IssueStatusType = typeof IssueStatus[keyof typeof IssueStatus];
export type IssueEffortType = typeof IssueEffort[keyof typeof IssueEffort];
export type RiskTagType = typeof RiskTag[keyof typeof RiskTag];
export type IssueSourceType = typeof IssueSource[keyof typeof IssueSource];

// ============================================================================
// INTERFACES
// ============================================================================

export interface IFileLocation {
  filePath: string;
  lineStart?: number;
  lineEnd?: number;
  functionName?: string;
  className?: string;
}

export interface IValidation {
  type: 'test' | 'assertion' | 'manual' | 'automated';
  command?: string;
  expectedResult?: string;
  actualResult?: string;
  lastRun?: Date;
  passed?: boolean;
}

export interface IStatusChange {
  from: IssueStatusType;
  to: IssueStatusType;
  changedBy: string;
  changedAt: Date;
  reason?: string;
}

export interface IComment {
  _id?: mongoose.Types.ObjectId;
  author: string;
  content: string;
  createdAt: Date;
  updatedAt?: Date;
  isInternal: boolean;
}

export interface IRelatedIssue {
  issueId: mongoose.Types.ObjectId;
  relationship: 'blocks' | 'blocked_by' | 'duplicates' | 'related_to' | 'parent' | 'child';
}

export interface IAuditEntry {
  sessionId: string;
  timestamp: Date;
  findings: string;
}

export interface IIssue extends Document {
  // Identifiers
  issueId: string;           // Human-readable ID: BUG-0001, LOGIC-0001, etc.
  legacyId?: string;         // Original ID from PENDING_MASTER.md (e.g., BUG-1714)
  
  // Core Fields
  title: string;
  description: string;
  category: IssueCategoryType;
  priority: IssuePriorityType;
  status: IssueStatusType;
  effort: IssueEffortType;
  
  // Location
  location: IFileLocation;
  
  // Classification
  riskTags: RiskTagType[];
  module: string;            // e.g., 'fm', 'souq', 'aqar', 'auth'
  subModule?: string;        // e.g., 'finance', 'kyc', 'seller-central'
  
  // Action & Resolution
  action: string;            // What needs to be done
  rootCause?: string;        // Why the issue exists
  resolution?: string;       // How it was fixed
  suggestedPrTitle?: string;
  
  // Validation & DoD
  validation?: IValidation;
  definitionOfDone: string;
  acceptanceCriteria?: string[];
  
  // Dependencies & Relations
  dependencies: string[];    // Issue IDs this depends on
  blockedBy?: string;        // Issue ID blocking this
  relatedIssues: IRelatedIssue[];
  
  // Ownership
  reportedBy: string;
  assignedTo?: string;
  reviewedBy?: string;
  
  // Tracking
  source: IssueSourceType;
  auditEntries: IAuditEntry[];
  mentionCount: number;      // How many times seen in audits
  firstSeenAt: Date;
  lastSeenAt: Date;
  
  // Sprint & Planning
  sprintReady: boolean;
  sprintId?: string;
  storyPoints?: number;
  
  // Comments & History
  comments: IComment[];
  statusHistory: IStatusChange[];
  
  // Metadata
  labels: string[];
  externalLinks?: {
    jira?: string;
    github?: string;
    notion?: string;
  };
  
  // Organization (Multi-tenant support)
  orgId: mongoose.Types.ObjectId;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
}

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================

const FileLocationSchema = new Schema<IFileLocation>({
  filePath: { type: String, required: true },
  lineStart: { type: Number },
  lineEnd: { type: Number },
  functionName: { type: String },
  className: { type: String },
}, { _id: false });

const ValidationSchema = new Schema<IValidation>({
  type: { 
    type: String, 
    enum: ['test', 'assertion', 'manual', 'automated'],
    required: true 
  },
  command: { type: String },
  expectedResult: { type: String },
  actualResult: { type: String },
  lastRun: { type: Date },
  passed: { type: Boolean },
}, { _id: false });

const StatusChangeSchema = new Schema<IStatusChange>({
  from: { type: String, enum: Object.values(IssueStatus), required: true },
  to: { type: String, enum: Object.values(IssueStatus), required: true },
  changedBy: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
  reason: { type: String },
}, { _id: false });

const CommentSchema = new Schema<IComment>({
  author: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  isInternal: { type: Boolean, default: false },
});

const RelatedIssueSchema = new Schema<IRelatedIssue>({
  issueId: { type: Schema.Types.ObjectId, ref: 'Issue', required: true },
  relationship: { 
    type: String, 
    enum: ['blocks', 'blocked_by', 'duplicates', 'related_to', 'parent', 'child'],
    required: true 
  },
}, { _id: false });

const AuditEntrySchema = new Schema<IAuditEntry>({
  sessionId: { type: String, required: true },
  timestamp: { type: Date, required: true },
  findings: { type: String, required: true },
}, { _id: false });

const IssueSchema = new Schema<IIssue>({
  // Identifiers
  issueId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true,
  },
  legacyId: { type: String, index: true },
  
  // Core Fields
  title: { type: String, required: true, maxlength: 200 },
  description: { type: String, required: true },
  category: { 
    type: String, 
    enum: Object.values(IssueCategory), 
    required: true,
    index: true,
  },
  priority: { 
    type: String, 
    enum: Object.values(IssuePriority), 
    required: true,
    index: true,
  },
  status: { 
    type: String, 
    enum: Object.values(IssueStatus), 
    default: IssueStatus.OPEN,
    index: true,
  },
  effort: { 
    type: String, 
    enum: Object.values(IssueEffort), 
    required: true,
  },
  
  // Location
  location: { type: FileLocationSchema, required: true },
  
  // Classification
  riskTags: [{ 
    type: String, 
    enum: Object.values(RiskTag),
  }],
  module: { type: String, required: true, index: true },
  subModule: { type: String },
  
  // Action & Resolution
  action: { type: String, required: true },
  rootCause: { type: String },
  resolution: { type: String },
  suggestedPrTitle: { type: String },
  
  // Validation & DoD
  validation: { type: ValidationSchema },
  definitionOfDone: { type: String, required: true },
  acceptanceCriteria: [{ type: String }],
  
  // Dependencies & Relations
  dependencies: [{ type: String }],
  blockedBy: { type: String },
  relatedIssues: [RelatedIssueSchema],
  
  // Ownership
  reportedBy: { type: String, required: true },
  assignedTo: { type: String, index: true },
  reviewedBy: { type: String },
  
  // Tracking
  source: { 
    type: String, 
    enum: Object.values(IssueSource), 
    default: IssueSource.MANUAL,
  },
  auditEntries: [AuditEntrySchema],
  mentionCount: { type: Number, default: 1 },
  firstSeenAt: { type: Date, default: Date.now },
  lastSeenAt: { type: Date, default: Date.now },
  
  // Sprint & Planning
  sprintReady: { type: Boolean, default: false },
  sprintId: { type: String },
  storyPoints: { type: Number, min: 0, max: 100 },
  
  // Comments & History
  comments: [CommentSchema],
  statusHistory: [StatusChangeSchema],
  
  // Metadata
  labels: [{ type: String }],
  externalLinks: {
    jira: { type: String },
    github: { type: String },
    notion: { type: String },
  },
  
  // Organization
  orgId: { 
    type: Schema.Types.ObjectId, 
    required: true,
    index: true,
  },
  
  // Resolution timestamps
  resolvedAt: { type: Date },
  closedAt: { type: Date },
}, {
  timestamps: true,
  collection: 'issues',
});

// ============================================================================
// INDEXES
// ============================================================================

// Compound indexes for common queries
IssueSchema.index({ orgId: 1, status: 1, priority: 1 });
IssueSchema.index({ orgId: 1, category: 1, status: 1 });
IssueSchema.index({ orgId: 1, module: 1, status: 1 });
IssueSchema.index({ orgId: 1, assignedTo: 1, status: 1 });
IssueSchema.index({ orgId: 1, sprintId: 1 });
IssueSchema.index({ 'location.filePath': 1, status: 1 });
IssueSchema.index({ firstSeenAt: 1 });
IssueSchema.index({ updatedAt: -1 });

// Text index for search
IssueSchema.index({ 
  title: 'text', 
  description: 'text', 
  action: 'text',
  'location.filePath': 'text',
});

// ============================================================================
// VIRTUALS
// ============================================================================

IssueSchema.virtual('age').get(function() {
  return Math.floor((Date.now() - this.firstSeenAt.getTime()) / (1000 * 60 * 60 * 24));
});

IssueSchema.virtual('isStale').get(function() {
  const staleDays = 7;
  return this.age > staleDays && this.status === IssueStatus.OPEN;
});

IssueSchema.virtual('isQuickWin').get(function() {
  const quickEfforts = [IssueEffort.XS, IssueEffort.S];
  const quickPriorities = [IssuePriority.P1_HIGH, IssuePriority.P2_MEDIUM];
  return quickEfforts.includes(this.effort) && quickPriorities.includes(this.priority);
});

IssueSchema.virtual('isBlocked').get(function() {
  return this.status === IssueStatus.BLOCKED || !!this.blockedBy;
});

// ============================================================================
// METHODS
// ============================================================================

IssueSchema.methods.changeStatus = function(
  newStatus: IssueStatusType, 
  changedBy: string, 
  reason?: string
) {
  const oldStatus = this.status;
  
  this.statusHistory.push({
    from: oldStatus,
    to: newStatus,
    changedBy,
    changedAt: new Date(),
    reason,
  });
  
  this.status = newStatus;
  
  if (newStatus === IssueStatus.RESOLVED) {
    this.resolvedAt = new Date();
  } else if (newStatus === IssueStatus.CLOSED) {
    this.closedAt = new Date();
  }
  
  return this.save();
};

IssueSchema.methods.addComment = function(
  author: string, 
  content: string, 
  isInternal = false
) {
  this.comments.push({
    author,
    content,
    createdAt: new Date(),
    isInternal,
  });
  
  return this.save();
};

IssueSchema.methods.recordAuditMention = function(sessionId: string, findings: string) {
  this.auditEntries.push({
    sessionId,
    timestamp: new Date(),
    findings,
  });
  
  this.mentionCount += 1;
  this.lastSeenAt = new Date();
  
  return this.save();
};

// ============================================================================
// STATICS
// ============================================================================

IssueSchema.statics.generateIssueId = async function(
  category: IssueCategoryType
): Promise<string> {
  const prefixMap: Record<IssueCategoryType, string> = {
    [IssueCategory.BUG]: 'BUG',
    [IssueCategory.LOGIC_ERROR]: 'LOGIC',
    [IssueCategory.MISSING_TEST]: 'TEST',
    [IssueCategory.EFFICIENCY]: 'PERF',
    [IssueCategory.SECURITY]: 'SEC',
    [IssueCategory.FEATURE]: 'FEAT',
    [IssueCategory.REFACTOR]: 'REFAC',
    [IssueCategory.DOCUMENTATION]: 'DOC',
    [IssueCategory.NEXT_STEP]: 'TASK',
  };
  
  const prefix = prefixMap[category] || 'ISSUE';
  
  const lastIssue = await this.findOne({ issueId: new RegExp(`^${prefix}-`) })
    .sort({ issueId: -1 })
    .select('issueId')
    .lean();
  
  let nextNumber = 1;
  if (lastIssue?.issueId) {
    const match = lastIssue.issueId.match(/\d+$/);
    if (match) {
      nextNumber = parseInt(match[0], 10) + 1;
    }
  }
  
  return `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
};

IssueSchema.statics.getStats = async function(orgId: mongoose.Types.ObjectId) {
  const stats = await this.aggregate([
    { $match: { orgId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
        resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
        blocked: { $sum: { $cond: [{ $eq: ['$status', 'blocked'] }, 1, 0] } },
        p0: { $sum: { $cond: [{ $eq: ['$priority', 'P0'] }, 1, 0] } },
        p1: { $sum: { $cond: [{ $eq: ['$priority', 'P1'] }, 1, 0] } },
        p2: { $sum: { $cond: [{ $eq: ['$priority', 'P2'] }, 1, 0] } },
        p3: { $sum: { $cond: [{ $eq: ['$priority', 'P3'] }, 1, 0] } },
      },
    },
  ], { maxTimeMS: 10_000 });
  
  return stats[0] || {
    total: 0, open: 0, inProgress: 0, resolved: 0, blocked: 0,
    p0: 0, p1: 0, p2: 0, p3: 0,
  };
};

IssueSchema.statics.getFileHeatMap = async function(
  orgId: mongoose.Types.ObjectId, 
  limit = 10
) {
  return this.aggregate([
    { $match: { orgId, status: { $ne: 'closed' } } },
    {
      $group: {
        _id: '$location.filePath',
        bugs: { $sum: { $cond: [{ $eq: ['$category', 'bug'] }, 1, 0] } },
        logic: { $sum: { $cond: [{ $eq: ['$category', 'logic_error'] }, 1, 0] } },
        tests: { $sum: { $cond: [{ $eq: ['$category', 'missing_test'] }, 1, 0] } },
        efficiency: { $sum: { $cond: [{ $eq: ['$category', 'efficiency'] }, 1, 0] } },
        total: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
    { $limit: limit },
  ], { maxTimeMS: 10_000 });
};

IssueSchema.statics.getQuickWins = async function(orgId: mongoose.Types.ObjectId) {
  return this.find({
    orgId,
    status: IssueStatus.OPEN,
    effort: { $in: [IssueEffort.XS, IssueEffort.S] },
    priority: { $in: [IssuePriority.P1_HIGH, IssuePriority.P2_MEDIUM] },
    blockedBy: { $exists: false },
  })
    .sort({ priority: 1, effort: 1 })
    .lean();
};

IssueSchema.statics.getStaleIssues = async function(
  orgId: mongoose.Types.ObjectId, 
  staleDays = 7
) {
  const staleDate = new Date();
  staleDate.setDate(staleDate.getDate() - staleDays);
  
  return this.find({
    orgId,
    status: IssueStatus.OPEN,
    firstSeenAt: { $lt: staleDate },
  })
    .sort({ firstSeenAt: 1 })
    .lean();
};

IssueSchema.statics.findByFile = async function(
  orgId: mongoose.Types.ObjectId, 
  filePath: string
) {
  return this.find({
    orgId,
    'location.filePath': { $regex: filePath, $options: 'i' },
  })
    .sort({ priority: 1, status: 1 })
    .lean();
};

IssueSchema.statics.findDuplicates = async function(
  orgId: mongoose.Types.ObjectId,
  filePath: string,
  lineStart?: number
) {
  const query: any = {
    orgId,
    'location.filePath': filePath,
  };
  
  if (lineStart) {
    query['location.lineStart'] = lineStart;
  }
  
  return this.find(query).lean();
};

// ============================================================================
// MODEL EXPORT
// ============================================================================

export interface IIssueModel extends Model<IIssue> {
  generateIssueId(category: IssueCategoryType): Promise<string>;
  getStats(orgId: mongoose.Types.ObjectId): Promise<any>;
  getFileHeatMap(orgId: mongoose.Types.ObjectId, limit?: number): Promise<any[]>;
  getQuickWins(orgId: mongoose.Types.ObjectId): Promise<IIssue[]>;
  getStaleIssues(orgId: mongoose.Types.ObjectId, staleDays?: number): Promise<IIssue[]>;
  findByFile(orgId: mongoose.Types.ObjectId, filePath: string): Promise<IIssue[]>;
  findDuplicates(orgId: mongoose.Types.ObjectId, filePath: string, lineStart?: number): Promise<IIssue[]>;
}

const Issue = (mongoose.models.Issue as IIssueModel) || 
  mongoose.model<IIssue, IIssueModel>('Issue', IssueSchema);

export default Issue;
