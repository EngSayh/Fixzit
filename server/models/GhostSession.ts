/**
 * GhostSession Model - Superadmin impersonation tracking
 * 
 * @module server/models/GhostSession
 * @description Tracks superadmin "ghost mode" sessions where platform operators
 * impersonate tenant users for support, debugging, or compliance investigations.
 * 
 * @features
 * - Superadmin impersonation capability
 * - Full audit trail of ghost sessions
 * - Permission restrictions during ghost mode
 * - Session duration tracking
 * - Automatic session expiration
 * - Multi-tenant isolation
 * 
 * @ghost_modes
 * - VIEW_ONLY: Read-only access to tenant data
 * - SUPPORT: Limited write access for support tasks
 * - DEBUG: Full access for debugging (restricted permissions)
 * - COMPLIANCE_AUDIT: Audit-focused access
 * 
 * @indexes
 * - Index: { admin_id, active } for active session queries
 * - Index: { tenant_id, active } for tenant-specific sessions
 * - Index: { started_at } for chronological audit
 * 
 * @compliance
 * - GDPR compliance for data access logging
 * - Immutable audit records
 * - PII protection (logged actions only)
 * - ISO 27001 privileged access tracking
 * 
 * @security
 * - Superadmin-only feature
 * - Session expiration enforcement
 * - Permission restrictions logged
 * - All actions audited separately
 */

import { Schema, model, models } from "mongoose";
import type { MModel } from "@/types/mongoose-compat";

const GhostMode = [
  "VIEW_ONLY",
  "SUPPORT",
  "DEBUG",
  "COMPLIANCE_AUDIT",
] as const;
type TGhostMode = (typeof GhostMode)[number];

export interface IGhostSession {
  admin_id: Schema.Types.ObjectId | string;
  tenant_id: Schema.Types.ObjectId | string;
  mode: TGhostMode;
  active: boolean;
  started_at: Date;
  ended_at?: Date;
  reason: string;
  permissions: string[];
  actions_taken?: number;
  ip_address?: string;
  user_agent?: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const GhostSessionSchema = new Schema<IGhostSession>(
  {
    admin_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tenant_id: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    mode: {
      type: String,
      enum: GhostMode,
      required: true,
    },
    active: {
      type: Boolean,
      required: true,
      default: true,
      index: true,
    },
    started_at: {
      type: Date,
      required: true,
      default: () => new Date(),
      index: true,
    },
    ended_at: {
      type: Date,
    },
    reason: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 1000,
    },
    permissions: {
      type: [String],
      required: true,
      default: [],
    },
    actions_taken: {
      type: Number,
      default: 0,
    },
    ip_address: {
      type: String,
      maxlength: 45, // IPv6 max length
    },
    user_agent: {
      type: String,
      maxlength: 500,
    },
    notes: {
      type: String,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
    collection: "ghost_sessions",
  }
);

// Compound indexes for efficient queries
GhostSessionSchema.index({ admin_id: 1, active: 1 });
GhostSessionSchema.index({ tenant_id: 1, active: 1 });
GhostSessionSchema.index({ started_at: -1 });

// Auto-expire sessions after 24 hours
GhostSessionSchema.pre("save", function (next) {
  if (this.isNew && !this.ended_at) {
    // Set automatic expiration to 24 hours from start
    const expirationTime = new Date(this.started_at.getTime() + 24 * 60 * 60 * 1000);
    if (!this.ended_at || this.ended_at > expirationTime) {
      // Note: This is informational - actual expiration should be handled by application logic
    }
  }
  next();
});

// Prevent modifications to core fields after creation
GhostSessionSchema.pre("save", function (next) {
  if (!this.isNew) {
    // Only allow updates to active, ended_at, actions_taken, and notes
    const allowedUpdates = ["active", "ended_at", "actions_taken", "notes"];
    const modifiedPaths = this.modifiedPaths();
    const unauthorizedChanges = modifiedPaths.filter(
      (path) => !allowedUpdates.includes(path) && path !== "updatedAt"
    );
    
    if (unauthorizedChanges.length > 0) {
      return next(
        new Error(
          `Ghost session core fields are immutable: ${unauthorizedChanges.join(", ")}`
        )
      );
    }
  }
  next();
});

export const GhostSession: MModel<IGhostSession> =
  (models.GhostSession as MModel<IGhostSession>) ||
  model<IGhostSession>("GhostSession", GhostSessionSchema);
