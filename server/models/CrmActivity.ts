/**
 * CrmActivity Model - Sales activity tracking and timeline
 * 
 * @module server/models/CrmActivity
 * @description Tracks all sales interactions: calls, emails, meetings, notes, handoffs.
 * Provides activity timeline for leads and accounts, enabling sales follow-up and reporting.
 * 
 * @features
 * - Multi-tenant isolation per organization
 * - Activity timeline for leads/accounts
 * - Multiple activity types (CALL, EMAIL, MEETING, NOTE, HANDOFF)
 * - Next action reminders
 * - Lead stage snapshot at activity time
 * - Owner assignment for follow-ups
 * - Contact name/company denormalized for fast queries
 * 
 * @types
 * - CALL: Phone call activity
 * - EMAIL: Email correspondence
 * - MEETING: In-person or virtual meeting
 * - NOTE: Internal note or comment
 * - HANDOFF: Lead reassignment between reps
 * 
 * @indexes
 * - Index: { leadId, performedAt } for lead timeline
 * - Index: { owner, nextActionAt } for follow-up reminders
 * - Index: { orgId, performedAt } for reporting
 * - Index: { type } for activity type filtering
 * 
 * @relationships
 * - leadId → CrmLead._id (optional, activities can be orphaned)
 * - owner → User.username or email
 * 
 * @audit
 * - All activities logged via auditPlugin
 * - Lead stage snapshot preserved
 * - Activity modifications tracked
 */

import { Schema, Document, Types } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

/** Activity types for sales interactions */
const ActivityTypes = ["CALL", "EMAIL", "MEETING", "NOTE", "HANDOFF"] as const;

export type CrmActivityType = (typeof ActivityTypes)[number];

export interface CrmActivityDocument extends Document {
  leadId?: Types.ObjectId;
  type: CrmActivityType;
  summary: string;
  notes?: string;
  owner?: string;
  performedAt: Date;
  nextActionAt?: Date;
  contactName?: string;
  company?: string;
  leadStageSnapshot?: string;
  orgId: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CrmActivitySchema = new Schema<CrmActivityDocument>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: "CrmLead" },
    type: { type: String, enum: ActivityTypes, required: true },
    summary: { type: String, required: true },
    notes: { type: String },
    owner: { type: String, trim: true },
    performedAt: { type: Date, default: Date.now },
    nextActionAt: { type: Date },
    contactName: { type: String, trim: true },
    company: { type: String, trim: true },
    leadStageSnapshot: { type: String, trim: true },
  },
  { timestamps: true },
);

CrmActivitySchema.plugin(tenantIsolationPlugin);
CrmActivitySchema.plugin(auditPlugin);

CrmActivitySchema.index({ orgId: 1, performedAt: -1 });
CrmActivitySchema.index({ orgId: 1, type: 1 });

const CrmActivity = getModel<CrmActivityDocument>(
  "CrmActivity",
  CrmActivitySchema,
);
export default CrmActivity;
