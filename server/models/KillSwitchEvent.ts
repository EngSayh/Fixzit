/**
 * KillSwitchEvent Model - Emergency tenant control
 * 
 * @module server/models/KillSwitchEvent
 * @description Tracks emergency kill switch activations for tenant operations.
 * Used by superadmin to temporarily suspend or restrict tenant capabilities
 * during incidents, compliance violations, or security threats.
 * 
 * @features
 * - Emergency tenant suspension capability
 * - Granular action control (block login, API, payments, etc.)
 * - Automatic reactivation scheduling
 * - Audit trail of all kill switch events
 * - Multi-tenant scoping
 * 
 * @action_types
 * - BLOCK_LOGIN: Prevent user authentication
 * - BLOCK_API: Disable API access
 * - BLOCK_PAYMENTS: Suspend payment processing
 * - BLOCK_INVOICING: Disable invoice generation
 * - READ_ONLY: Restrict to read-only mode
 * - FULL_SUSPENSION: Complete tenant lockout
 * 
 * @indexes
 * - Index: { tenant_id, deactivated_at } for active kill switches
 * - Index: { activated_at } for chronological audit
 * - Index: { action } for action-type filtering
 * 
 * @compliance
 * - Immutable records for audit compliance
 * - PII-safe logging (no sensitive data)
 * - ZATCA compliance for payment blocks
 * 
 * @security
 * - Superadmin-only operations
 * - Reason required for all activations
 * - Automatic audit log generation
 */

import { Schema, model, models } from "mongoose";
import type { MModel } from "@/types/mongoose-compat";

const KillSwitchAction = [
  "BLOCK_LOGIN",
  "BLOCK_API",
  "BLOCK_PAYMENTS",
  "BLOCK_INVOICING",
  "READ_ONLY",
  "FULL_SUSPENSION",
] as const;
type TKillSwitchAction = (typeof KillSwitchAction)[number];

export interface IKillSwitchEvent {
  tenant_id: Schema.Types.ObjectId | string;
  action: TKillSwitchAction;
  reason: string;
  activated_at: Date;
  activated_by: Schema.Types.ObjectId | string;
  deactivated_at?: Date;
  deactivated_by?: Schema.Types.ObjectId | string;
  scheduled_reactivation?: Date;
  notes?: string;
  impact_summary?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const KillSwitchEventSchema = new Schema<IKillSwitchEvent>(
  {
    tenant_id: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: KillSwitchAction,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      minlength: 10,
      maxlength: 1000,
    },
    activated_at: {
      type: Date,
      required: true,
      default: () => new Date(),
      index: true,
    },
    activated_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    deactivated_at: {
      type: Date,
      index: true,
    },
    deactivated_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    scheduled_reactivation: {
      type: Date,
    },
    notes: {
      type: String,
      maxlength: 2000,
    },
    impact_summary: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
    collection: "kill_switch_events",
  }
);

// Compound index for finding active kill switches by tenant
KillSwitchEventSchema.index({ tenant_id: 1, deactivated_at: 1 });

// Index for chronological queries
KillSwitchEventSchema.index({ activated_at: -1 });

// Prevent modifications to ensure audit integrity
KillSwitchEventSchema.pre("save", function (next) {
  if (!this.isNew) {
    // Only allow deactivation updates
    if (this.isModified() && !this.isModified("deactivated_at") && !this.isModified("deactivated_by")) {
      return next(new Error("Kill switch events are immutable except for deactivation"));
    }
  }
  next();
});

export const KillSwitchEvent: MModel<IKillSwitchEvent> =
  (models.KillSwitchEvent as MModel<IKillSwitchEvent>) ||
  model<IKillSwitchEvent>("KillSwitchEvent", KillSwitchEventSchema);
