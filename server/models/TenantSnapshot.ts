/**
 * TenantSnapshot Model - Tenant data backup and recovery
 * 
 * @module server/models/TenantSnapshot
 * @description Tracks tenant data snapshots for backup, recovery, migration,
 * and compliance purposes. Snapshots capture complete tenant state at a point in time.
 * 
 * @features
 * - Point-in-time tenant data capture
 * - Multiple snapshot types (backup, migration, compliance)
 * - Size and metadata tracking
 * - Retention policy support
 * - S3/cloud storage integration
 * - Automatic cleanup based on retention
 * 
 * @snapshot_types
 * - SCHEDULED: Automated regular backups
 * - MANUAL: Operator-triggered snapshots
 * - PRE_MIGRATION: Before tenant migration
 * - COMPLIANCE: Regulatory compliance requirement
 * - INCIDENT: Created during incident investigation
 * - PRE_DELETION: Before tenant offboarding
 * 
 * @snapshot_statuses
 * - PENDING: Snapshot creation initiated
 * - IN_PROGRESS: Snapshot being created
 * - COMPLETED: Successfully created
 * - FAILED: Creation failed
 * - EXPIRED: Past retention period
 * - DELETED: Snapshot removed
 * 
 * @indexes
 * - Index: { tenant_id, created_at } for tenant snapshot history
 * - Index: { type, status } for snapshot management
 * - Index: { created_at, retention_until } for cleanup jobs
 * - Index: { status } for operational queries
 * 
 * @compliance
 * - GDPR right to erasure support
 * - ZATCA data retention requirements
 * - ISO 27001 backup verification
 * - Audit trail for all snapshots
 * 
 * @security
 * - Superadmin-only operations
 * - Encrypted storage references only
 * - No sensitive data in metadata
 * - Access logging required
 */

import { Schema, model, models } from "mongoose";
import type { MModel } from "@/types/mongoose-compat";

const SnapshotType = [
  "SCHEDULED",
  "MANUAL",
  "PRE_MIGRATION",
  "COMPLIANCE",
  "INCIDENT",
  "PRE_DELETION",
] as const;
type TSnapshotType = (typeof SnapshotType)[number];

const SnapshotStatus = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
  "EXPIRED",
  "DELETED",
] as const;
type TSnapshotStatus = (typeof SnapshotStatus)[number];

export interface ITenantSnapshot {
  tenant_id: Schema.Types.ObjectId | string;
  type: TSnapshotType;
  status: TSnapshotStatus;
  created_at: Date;
  created_by: Schema.Types.ObjectId | string;
  size_bytes: number;
  storage_path?: string;
  storage_provider?: string;
  retention_until?: Date;
  collections_included: string[];
  record_count?: number;
  compression?: string;
  encryption?: string;
  checksum?: string;
  error_message?: string;
  completed_at?: Date;
  deleted_at?: Date;
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
  updatedAt?: Date;
}

const TenantSnapshotSchema = new Schema<ITenantSnapshot>(
  {
    tenant_id: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: SnapshotType,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: SnapshotStatus,
      required: true,
      default: "PENDING",
      index: true,
    },
    created_at: {
      type: Date,
      required: true,
      default: () => new Date(),
      index: true,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    size_bytes: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    storage_path: {
      type: String,
      maxlength: 500,
    },
    storage_provider: {
      type: String,
      enum: ["S3", "AZURE_BLOB", "GCS", "LOCAL"],
      default: "S3",
    },
    retention_until: {
      type: Date,
      index: true,
    },
    collections_included: {
      type: [String],
      required: true,
      default: [],
    },
    record_count: {
      type: Number,
      min: 0,
    },
    compression: {
      type: String,
      enum: ["NONE", "GZIP", "BZIP2", "LZ4"],
      default: "GZIP",
    },
    encryption: {
      type: String,
      enum: ["NONE", "AES256", "AES256_GCM"],
      default: "AES256_GCM",
    },
    checksum: {
      type: String,
      maxlength: 128, // SHA-512 hex length
    },
    error_message: {
      type: String,
      maxlength: 1000,
    },
    completed_at: {
      type: Date,
    },
    deleted_at: {
      type: Date,
    },
    notes: {
      type: String,
      maxlength: 2000,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "tenant_snapshots",
  }
);

// Compound indexes for efficient queries
TenantSnapshotSchema.index({ tenant_id: 1, created_at: -1 });
TenantSnapshotSchema.index({ type: 1, status: 1 });
TenantSnapshotSchema.index({ created_at: -1, retention_until: 1 });

// Auto-set retention based on snapshot type
TenantSnapshotSchema.pre("save", function (next) {
  if (this.isNew && !this.retention_until) {
    const now = new Date();
    let retentionDays = 30; // Default

    switch (this.type) {
      case "SCHEDULED":
        retentionDays = 30; // 30 days for scheduled backups
        break;
      case "MANUAL":
        retentionDays = 90; // 90 days for manual backups
        break;
      case "PRE_MIGRATION":
        retentionDays = 365; // 1 year for migration snapshots
        break;
      case "COMPLIANCE":
        retentionDays = 2555; // 7 years for compliance (ZATCA requirement)
        break;
      case "INCIDENT":
        retentionDays = 180; // 6 months for incident investigation
        break;
      case "PRE_DELETION":
        retentionDays = 90; // 90 days for offboarding snapshots
        break;
    }

    this.retention_until = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);
  }
  next();
});

// Validate status transitions
TenantSnapshotSchema.pre("save", function (next) {
  if (!this.isNew && this.isModified("status")) {
    const validTransitions: Record<TSnapshotStatus, TSnapshotStatus[]> = {
      PENDING: ["IN_PROGRESS", "FAILED"],
      IN_PROGRESS: ["COMPLETED", "FAILED"],
      COMPLETED: ["EXPIRED", "DELETED"],
      FAILED: ["PENDING"], // Allow retry
      EXPIRED: ["DELETED"],
      DELETED: [], // Terminal state
    };

    const originalStatus = this.$locals.previousStatus as TSnapshotStatus | undefined;
    if (originalStatus) {
      const allowed = validTransitions[originalStatus] || [];
      if (!allowed.includes(this.status)) {
        return next(
          new Error(
            `Invalid status transition: ${originalStatus} -> ${this.status}`
          )
        );
      }
    }
  }
  next();
});

// Store previous status for validation
TenantSnapshotSchema.post("init", function () {
  this.$locals.previousStatus = this.status;
});

export const TenantSnapshot: MModel<ITenantSnapshot> =
  (models.TenantSnapshot as MModel<ITenantSnapshot>) ||
  model<ITenantSnapshot>("TenantSnapshot", TenantSnapshotSchema);
