/**
 * SouqLead Model - CRM lead management for Souq marketplace
 * 
 * @module server/models/souq/Lead
 * @description Property lead capture and tracking for real estate agents/brokers.
 * Distinct from CrmLead which is for B2B sales pipeline.
 * 
 * @features
 * - Multi-tenant isolation per organization
 * - Property-linked lead tracking
 * - Priority and status management
 * - Reminder system integration
 * - Activity timeline
 * - Saudi phone number validation
 * 
 * @indexes
 * - { org_id, status, created_at } - Lead list queries
 * - { org_id, assigned_to, status } - Assignment queries
 * - { org_id, phone } - Duplicate detection
 * - { reminder_datetime } - Reminder job queries
 */

import { Schema, model, models, Types, Document } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";
import { auditPlugin } from "@/server/plugins/auditPlugin";

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const LeadPriority = {
  LOW: "low",
  NORMAL: "normal",
  HIGH: "high",
} as const;

export const LeadStatus = {
  NEW: "new",
  CONTACTED: "contacted",
  QUALIFIED: "qualified",
  NEGOTIATING: "negotiating",
  WON: "won",
  LOST: "lost",
  ARCHIVED: "archived",
} as const;

export const LeadSource = {
  PLATFORM: "platform",
  REFERRAL: "referral",
  WALK_IN: "walk_in",
  PHONE: "phone",
  WEBSITE: "website",
  SOCIAL: "social",
  OTHER: "other",
} as const;

export type LeadPriorityValue = (typeof LeadPriority)[keyof typeof LeadPriority];
export type LeadStatusValue = (typeof LeadStatus)[keyof typeof LeadStatus];
export type LeadSourceValue = (typeof LeadSource)[keyof typeof LeadSource];

// ============================================================================
// INTERFACES
// ============================================================================

export interface ISouqLead extends Document {
  org_id: Types.ObjectId;
  created_by: Types.ObjectId;
  assigned_to?: Types.ObjectId;
  
  // Contact Info
  name: string;
  phone: string; // Saudi format: 05XXXXXXXX
  email?: string;
  
  // Source Tracking
  source: LeadSourceValue;
  source_details?: string;
  linked_listing_id?: Types.ObjectId;
  
  // Lead Details
  priority: LeadPriorityValue;
  status: LeadStatusValue;
  property_interest?: string;
  budget_min?: number;
  budget_max?: number;
  preferred_locations?: string[];
  notes?: string;
  next_step?: string;
  
  // Reminder
  reminder_enabled: boolean;
  reminder_datetime?: Date;
  
  // Activity Tracking
  last_contacted_at?: Date;
  total_activities: number;
  
  // Conversion
  converted_at?: Date;
  conversion_value?: number;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
  
  // Audit fields
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

// ============================================================================
// SCHEMA
// ============================================================================

const SouqLeadSchema = new Schema<ISouqLead>(
  {
    org_id: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assigned_to: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    
    // Contact Info
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^(05|5|9665|\+9665)\d{8}$/, "Invalid Saudi phone number"],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email address"],
    },
    
    // Source Tracking
    source: {
      type: String,
      required: true,
      enum: Object.values(LeadSource),
      default: LeadSource.PLATFORM,
    },
    source_details: {
      type: String,
      maxlength: 500,
    },
    linked_listing_id: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
    },
    
    // Lead Details
    priority: {
      type: String,
      required: true,
      enum: Object.values(LeadPriority),
      default: LeadPriority.NORMAL,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(LeadStatus),
      default: LeadStatus.NEW,
    },
    property_interest: {
      type: String,
      maxlength: 200,
    },
    budget_min: {
      type: Number,
      min: 0,
    },
    budget_max: {
      type: Number,
      min: 0,
    },
    preferred_locations: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      maxlength: 2000,
    },
    next_step: {
      type: String,
      maxlength: 500,
    },
    
    // Reminder
    reminder_enabled: {
      type: Boolean,
      default: false,
    },
    reminder_datetime: {
      type: Date,
    },
    
    // Activity Tracking
    last_contacted_at: {
      type: Date,
    },
    total_activities: {
      type: Number,
      default: 0,
    },
    
    // Conversion
    converted_at: {
      type: Date,
    },
    conversion_value: {
      type: Number,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    collection: "souq_leads",
  }
);

// ============================================================================
// INDEXES
// ============================================================================

// Lead list queries
SouqLeadSchema.index({ org_id: 1, status: 1, created_at: -1 });

// Assignment queries
SouqLeadSchema.index({ org_id: 1, assigned_to: 1, status: 1 });

// Phone lookup (for duplicate detection)
SouqLeadSchema.index({ org_id: 1, phone: 1 });

// Reminder queries (for job scheduler)
SouqLeadSchema.index({ reminder_datetime: 1 }, { sparse: true });

// Priority filtering
SouqLeadSchema.index({ org_id: 1, priority: 1, status: 1 });

// Text search on name and notes
SouqLeadSchema.index({ name: "text", notes: "text", property_interest: "text" });

// ============================================================================
// PLUGINS
// ============================================================================

SouqLeadSchema.plugin(tenantIsolationPlugin);
SouqLeadSchema.plugin(auditPlugin);

// ============================================================================
// VIRTUALS
// ============================================================================

/**
 * Is lead active (not archived/won/lost)
 */
SouqLeadSchema.virtual("isActive").get(function () {
  const closedStatuses: LeadStatusValue[] = [LeadStatus.ARCHIVED, LeadStatus.WON, LeadStatus.LOST];
  return !closedStatuses.includes(this.status as LeadStatusValue);
});

/**
 * Has pending reminder
 */
SouqLeadSchema.virtual("hasPendingReminder").get(function () {
  if (!this.reminder_enabled || !this.reminder_datetime) return false;
  return this.reminder_datetime > new Date();
});

// ============================================================================
// STATICS
// ============================================================================

/**
 * Get leads with pending reminders
 */
SouqLeadSchema.statics.getLeadsWithPendingReminders = async function (
  before: Date = new Date()
): Promise<ISouqLead[]> {
  return this.find({
    reminder_enabled: true,
    reminder_datetime: { $lte: before },
    status: { $nin: [LeadStatus.ARCHIVED, LeadStatus.WON, LeadStatus.LOST] },
  }).sort({ reminder_datetime: 1 });
};

/**
 * Get lead stats for dashboard
 */
SouqLeadSchema.statics.getStats = async function (
  org_id: Types.ObjectId | string
): Promise<Record<string, number>> {
  const results = await this.aggregate([
    { $match: { org_id: new Types.ObjectId(org_id) } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  
  const stats: Record<string, number> = {
    total: 0,
    new: 0,
    contacted: 0,
    qualified: 0,
    negotiating: 0,
    won: 0,
    lost: 0,
    archived: 0,
  };
  
  for (const result of results) {
    stats[result._id] = result.count;
    stats.total += result.count;
  }
  
  return stats;
};

// ============================================================================
// MODEL EXPORT
// ============================================================================

export const SouqLead = getModel<ISouqLead>("SouqLead", SouqLeadSchema);
export default SouqLead;
