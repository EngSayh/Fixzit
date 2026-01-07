/**
 * LeadActivity Model - Activity timeline for leads
 * 
 * @module server/models/souq/LeadActivity
 * @description Tracks all activities on leads: calls, emails, notes, status changes.
 * Provides audit trail for lead management.
 * 
 * @features
 * - Multi-tenant isolation
 * - Activity type categorization
 * - Duration tracking for calls/meetings
 * - Before/after state for changes
 */

import { Schema, model, models, Types, Document, Model } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const ActivityType = {
  NOTE: "note",
  CALL: "call",
  EMAIL: "email",
  MEETING: "meeting",
  SMS: "sms",
  WHATSAPP: "whatsapp",
  STATUS_CHANGE: "status_change",
  ASSIGNMENT: "assignment",
  REMINDER: "reminder",
} as const;

export type ActivityTypeValue = (typeof ActivityType)[keyof typeof ActivityType];

// ============================================================================
// INTERFACES
// ============================================================================

export interface ILeadActivity extends Document {
  org_id: Types.ObjectId;
  lead_id: Types.ObjectId;
  user_id: Types.ObjectId;
  type: ActivityTypeValue;
  description: string;
  description_ar?: string;
  old_value?: unknown;
  new_value?: unknown;
  duration_minutes?: number;
  outcome?: string;
  created_at: Date;
}

export interface ILeadActivityModel extends Model<ILeadActivity> {
  logStatusChange(org_id: Types.ObjectId | string, lead_id: string, old_status: string, new_status: string, user_id: string): Promise<ILeadActivity>;
  logAssignment(org_id: Types.ObjectId | string, lead_id: string, assigned_to: string, user_id: string): Promise<ILeadActivity>;
}

// ============================================================================
// SCHEMA
// ============================================================================

const LeadActivitySchema = new Schema<ILeadActivity>(
  {
    org_id: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    lead_id: {
      type: Schema.Types.ObjectId,
      ref: "SouqLead",
      required: true,
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(ActivityType),
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    description_ar: {
      type: String,
      maxlength: 2000,
    },
    old_value: {
      type: Schema.Types.Mixed,
    },
    new_value: {
      type: Schema.Types.Mixed,
    },
    duration_minutes: {
      type: Number,
      min: 0,
    },
    outcome: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: false, // Immutable
    },
    collection: "lead_activities",
  }
);

// ============================================================================
// INDEXES
// ============================================================================

LeadActivitySchema.index({ org_id: 1, lead_id: 1, created_at: -1 });
LeadActivitySchema.index({ org_id: 1, user_id: 1, created_at: -1 });
LeadActivitySchema.index({ org_id: 1, type: 1, created_at: -1 });

// ============================================================================
// PLUGINS
// ============================================================================

LeadActivitySchema.plugin(tenantIsolationPlugin);

// ============================================================================
// STATICS
// ============================================================================

/**
 * Log a status change activity
 */
LeadActivitySchema.statics.logStatusChange = async function (
  org_id: Types.ObjectId | string,
  lead_id: string,
  old_status: string,
  new_status: string,
  user_id: string
): Promise<ILeadActivity> {
  return this.create({
    org_id,
    lead_id,
    user_id,
    type: ActivityType.STATUS_CHANGE,
    description: `Status changed from ${old_status} to ${new_status}`,
    description_ar: `تم تغيير الحالة من ${old_status} إلى ${new_status}`,
    old_value: old_status,
    new_value: new_status,
  });
};

/**
 * Log an assignment activity
 */
LeadActivitySchema.statics.logAssignment = async function (
  org_id: Types.ObjectId | string,
  lead_id: string,
  assigned_to: string,
  user_id: string
): Promise<ILeadActivity> {
  return this.create({
    org_id,
    lead_id,
    user_id,
    type: ActivityType.ASSIGNMENT,
    description: `Lead assigned`,
    description_ar: `تم تعيين العميل`,
    new_value: assigned_to,
  });
};

// ============================================================================
// MODEL EXPORT
// ============================================================================

export const LeadActivity = getModel<ILeadActivity, ILeadActivityModel>("LeadActivity", LeadActivitySchema);
export default LeadActivity;
