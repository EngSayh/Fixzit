/**
 * @module server/models/CustomerRequest
 * @description Customer Request/Report model for tenant-scoped issue tracking.
 * Tracks feature requests, bug reports, incidents, and questions from customers.
 *
 * @features
 * - Tenant isolation (tenantId required for all queries)
 * - Request type classification (feature_request, bug_report, incident, question)
 * - Severity levels (low, medium, high, critical)
 * - Status workflow (new, triaged, in_progress, released, closed)
 * - Channel tracking (web, whatsapp, email, support_portal, phone)
 * - Optional link to System Issue (linkedSystemIssueId)
 * - Reporter information (with PII protection)
 * - SLA tracking (responseDeadline, resolutionDeadline)
 *
 * @statuses
 * - new: Request received, not yet reviewed
 * - triaged: Reviewed and prioritized
 * - in_progress: Actively being worked on
 * - released: Fix/feature deployed
 * - closed: Request completed or rejected
 *
 * @indexes
 * - { tenantId: 1 } - Tenant isolation (REQUIRED for all queries)
 * - { tenantId: 1, status: 1 } - Tenant + status filtering
 * - { tenantId: 1, requestType: 1 } - Tenant + type filtering
 * - { tenantId: 1, severity: 1 } - Tenant + severity filtering
 * - { linkedSystemIssueId: 1 } - Link to system issues
 * - { tenantId: 1, createdAt: -1 } - Tenant + date sorting
 *
 * @relationships
 * - BacklogIssue: linkedSystemIssueId links customer request to system issue
 * - Organization: tenantId links to organization
 *
 * @compliance
 * - Multi-tenancy: tenantId required for all queries (SECURITY)
 * - PII protection: reporter field should be masked for non-superadmin
 * - Audit trail: createdAt/updatedAt/events
 */
import { Schema, model, models, type Document, type Types } from 'mongoose';

/**
 * Customer request type classification
 */
export type RequestType = 'feature_request' | 'bug_report' | 'incident' | 'question';

/**
 * Customer request severity levels
 */
export type RequestSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Customer request status workflow
 */
export type RequestStatus = 'new' | 'triaged' | 'in_progress' | 'released' | 'closed';

/**
 * Channel through which request was received
 */
export type RequestChannel = 'web' | 'whatsapp' | 'email' | 'support_portal' | 'phone' | 'api';

/**
 * Reporter information (with PII considerations)
 */
export interface RequestReporter {
  userId?: string;
  name?: string;
  email?: string;
  phone?: string;
}

/**
 * CustomerRequest document interface
 */
export interface ICustomerRequest extends Document {
  _id: Types.ObjectId;
  tenantId: string;
  requestId: string; // Human-readable ID (e.g., REQ-001)
  requestType: RequestType;
  title: string;
  details: string;
  severity: RequestSeverity;
  status: RequestStatus;
  channel: RequestChannel;
  reporter?: RequestReporter;
  linkedSystemIssueId?: string; // Link to BacklogIssue.key
  tags: string[];
  attachments: string[];
  responseDeadline?: Date;
  resolutionDeadline?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  resolution?: string;
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomerRequestSchema = new Schema<ICustomerRequest>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    requestType: {
      type: String,
      required: true,
      enum: ['feature_request', 'bug_report', 'incident', 'question'],
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    details: {
      type: String,
      required: true,
      maxlength: 5000,
    },
    severity: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'critical'],
      index: true,
    },
    status: {
      type: String,
      required: true,
      enum: ['new', 'triaged', 'in_progress', 'released', 'closed'],
      default: 'new',
      index: true,
    },
    channel: {
      type: String,
      required: true,
      enum: ['web', 'whatsapp', 'email', 'support_portal', 'phone', 'api'],
    },
    reporter: {
      userId: { type: String },
      name: { type: String },
      email: { type: String },
      phone: { type: String },
    },
    linkedSystemIssueId: {
      type: String,
      index: true,
      sparse: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    attachments: {
      type: [String],
      default: [],
    },
    responseDeadline: {
      type: Date,
    },
    resolutionDeadline: {
      type: Date,
    },
    resolvedAt: {
      type: Date,
    },
    closedAt: {
      type: Date,
    },
    resolution: {
      type: String,
      maxlength: 2000,
    },
    assignedTo: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: 'customer_requests',
  }
);

// Compound indexes for efficient tenant-scoped queries
CustomerRequestSchema.index({ tenantId: 1, status: 1 });
CustomerRequestSchema.index({ tenantId: 1, requestType: 1 });
CustomerRequestSchema.index({ tenantId: 1, severity: 1 });
CustomerRequestSchema.index({ tenantId: 1, createdAt: -1 });
CustomerRequestSchema.index({ tenantId: 1, channel: 1 });

// Pre-save hook to generate requestId if not provided
CustomerRequestSchema.pre('save', async function (next) {
  if (!this.requestId) {
    const count = await (this.constructor as typeof CustomerRequest).countDocuments({
      tenantId: this.tenantId,
    });
    this.requestId = `REQ-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

const CustomerRequest =
  models.CustomerRequest || model<ICustomerRequest>('CustomerRequest', CustomerRequestSchema);

export default CustomerRequest;
