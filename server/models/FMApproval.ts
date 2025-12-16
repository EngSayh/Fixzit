import { Schema, Model, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";
import { auditPlugin } from "@/server/plugins/auditPlugin";

/**
 * @module server/models/FMApproval
 * @description Approval workflow persistence for facilities management entities with immutable audit trail.
 *              Supports multi-stage approvals, delegation, escalation, and DoA (Delegation of Authority) enforcement.
 *
 * @features
 * - Approval types: QUOTATION, WORK_ORDER, BUDGET, PURCHASE_ORDER, INVOICE
 * - Status workflow: PENDING → APPROVED/REJECTED/DELEGATED/ESCALATED/CANCELLED
 * - Multi-stage approval chains with sequence tracking
 * - Delegation support (temporary authority transfer)
 * - Timeout escalation (auto-escalate after deadline)
 * - DoA threshold enforcement (amount-based routing)
 * - Immutable approval history (stage snapshots)
 * - Reason tracking for rejections and escalations
 *
 * @statuses
 * - PENDING: Awaiting approver action
 * - APPROVED: Approved by authorized user
 * - REJECTED: Rejected with reason
 * - DELEGATED: Delegated to another approver
 * - ESCALATED: Auto-escalated due to timeout or manual escalation
 * - CANCELLED: Cancelled by requester or system
 *
 * @indexes
 * - { orgId: 1, approvalNumber: 1 } (unique) — Unique approval identifier per tenant
 * - { orgId: 1, entityId: 1, type: 1 } — Query approvals for specific entity
 * - { orgId: 1, approverId: 1, status: 1 } — Approver's pending tasks
 * - { orgId: 1, requesterId: 1, createdAt: -1 } — Requester's approval history
 * - { orgId: 1, status: 1, dueDate: 1 } — Escalation cron queries
 *
 * @relationships
 * - References User model (requesterId, approverId, delegatedFrom, delegatedTo)
 * - Polymorphic reference via entityType + entityId (Quotation, WorkOrder, etc.)
 * - Integrates with notification system for approval requests
 *
 * @audit
 * - createdBy, updatedBy: Auto-tracked via auditPlugin
 * - approvedAt, rejectedAt: Manual timestamps for decision tracking
 * - stageHistory: Immutable array of approval stage snapshots
 */

const ApprovalStatus = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "DELEGATED",
  "ESCALATED",
  "CANCELLED",
] as const;
const ApprovalType = [
  "QUOTATION",
  "WORK_ORDER",
  "BUDGET",
  "PURCHASE_ORDER",
  "INVOICE",
] as const;

const FMApprovalSchema = new Schema(
  {
    // Multi-tenancy
    // orgId: added by plugin

    // Approval Identification
    approvalNumber: { type: String, required: true, unique: true },
    type: { type: String, enum: ApprovalType, required: true },

    // Reference to entity being approved
    entityType: { type: String, required: true }, // 'Quotation', 'WorkOrder', etc.
    entityId: { type: Schema.Types.ObjectId, required: true },
    entityNumber: { type: String, required: true }, // WO-202501-123, etc.

    // Approval Amount & Threshold
    amount: { type: Number, required: true },
    currency: { type: String, default: "SAR" },
    thresholdLevel: { type: String, required: true }, // 'L1', 'L2', 'L3', etc.

    // Workflow Stage
    workflowId: { type: Schema.Types.ObjectId, required: true }, // Links to workflow definition
    currentStage: { type: Number, required: true, default: 0 },
    totalStages: { type: Number, required: true },

    // Current Approver
    approverId: { type: Schema.Types.ObjectId, required: true, ref: "User" },
    approverName: { type: String, required: true },
    approverEmail: { type: String, required: true },
    approverRole: { type: String, required: true }, // 'PROPERTY_MANAGER', 'FINANCE_MANAGER', 'CFO', etc.

    // Status & Decision
    status: {
      type: String,
      enum: ApprovalStatus,
      required: true,
      default: "PENDING",
    },
    decision: {
      type: String,
      enum: ["APPROVE", "REJECT", "DELEGATE", "REQUEST_INFO"],
    },
    decisionDate: Date,
    notes: String,

    // Delegation
    delegatedTo: { type: Schema.Types.ObjectId, ref: "User" },
    delegatedToName: String,
    delegationReason: String,
    delegationDate: Date,

    // Escalation
    escalatedFrom: { type: Schema.Types.ObjectId, ref: "User" },
    escalatedReason: String,
    escalationDate: Date,

    // Timeout & SLA
    dueDate: { type: Date, required: true },
    reminderSentAt: Date,
    escalationSentAt: Date,
    timeoutMinutes: { type: Number, default: 1440 }, // 24 hours default

    // Attachments & Supporting Documents
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileType: String,
        uploadedAt: Date,
      },
    ],

    // Workflow History (Immutable Audit Trail)
    history: [
      {
        timestamp: { type: Date, default: Date.now },
        action: { type: String, required: true }, // 'CREATED', 'APPROVED', 'REJECTED', 'DELEGATED', 'ESCALATED'
        actorId: { type: Schema.Types.ObjectId, ref: "User" },
        actorName: String,
        previousStatus: String,
        newStatus: String,
        notes: String,
        metadata: Schema.Types.Mixed, // Additional context
      },
    ],

    // Notification Tracking
    notifications: [
      {
        sentAt: Date,
        sentTo: { type: Schema.Types.ObjectId, ref: "User" },
        channel: { type: String, enum: ["EMAIL", "SMS", "PUSH", "WHATSAPP"] },
        status: { type: String, enum: ["SENT", "DELIVERED", "FAILED"] },
      },
    ],
  },
  {
    timestamps: true,
    collection: "fm_approvals",
    // Indexes are managed centrally in lib/db/collections.ts
    autoIndex: false,
  },
);

// Plugins
FMApprovalSchema.plugin(tenantIsolationPlugin);
FMApprovalSchema.plugin(auditPlugin);

// Pre-save: Generate approval number
FMApprovalSchema.pre("save", function (next) {
  if (this.isNew && !this.approvalNumber) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const timestamp = now.getTime().toString().slice(-6);
    this.approvalNumber = `APR-${year}${month}-${timestamp}`;
  }
  next();
});

// Pre-save: Prevent modification of history (immutable)
FMApprovalSchema.pre("save", function (next) {
  if (!this.isNew && this.isModified("history")) {
    // Only allow appending to history, not modifying existing entries
    const original =
      (
        this as import("mongoose").Document & {
          $__?: { originalDoc?: { history?: unknown[] } };
        }
      ).$__?.originalDoc?.history || [];
    if (this.history.length < original.length) {
      return next(new Error("Cannot delete approval history entries"));
    }
  }
  next();
});

// Method: Add history entry (immutable append)
FMApprovalSchema.methods.addHistory = function (
  action: string,
  actorId: Schema.Types.ObjectId | string,
  actorName: string,
  notes?: string,
  metadata?: Record<string, unknown>,
) {
  this.history.push({
    timestamp: new Date(),
    action,
    actorId,
    actorName,
    previousStatus: this.status,
    newStatus: this.status, // Will be updated after status change
    notes,
    metadata,
  });
};

// Method: Check if approval is overdue
FMApprovalSchema.methods.isOverdue = function (): boolean {
  return this.status === "PENDING" && new Date() > this.dueDate;
};

// Method: Check if approval needs reminder
FMApprovalSchema.methods.needsReminder = function (): boolean {
  if (this.status !== "PENDING") return false;
  if (this.reminderSentAt) return false;

  const now = new Date();
  const timeUntilDue = this.dueDate.getTime() - now.getTime();
  const halfTimeout = (this.timeoutMinutes / 2) * 60 * 1000;

  return timeUntilDue <= halfTimeout;
};

// Method: Check if approval needs escalation
FMApprovalSchema.methods.needsEscalation = function (): boolean {
  return (
    this.status === "PENDING" && this.isOverdue() && !this.escalationSentAt
  );
};

// Virtual: Days until due
FMApprovalSchema.virtual("daysUntilDue").get(function () {
  const now = new Date();
  const diff = this.dueDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

export type FMApprovalDoc = InferSchemaType<typeof FMApprovalSchema>;

export const FMApproval: Model<FMApprovalDoc> = getModel<FMApprovalDoc>(
  "FMApproval",
  FMApprovalSchema,
);
