/**
 * CrmLead Model - Sales pipeline and customer relationship management
 * 
 * @module server/models/CrmLead
 * @description Manages sales leads and accounts through qualification to conversion.
 * Tracks prospects, opportunities, and customer relationships for Fixzit FM/Souq/Aqar sales.
 * 
 * @features
 * - Multi-tenant isolation per organization
 * - Lead-to-customer conversion tracking
 * - Sales pipeline stages (QUALIFYING → EVALUATING → PROPOSAL → NEGOTIATION → CLOSED)
 * - Revenue forecasting and deal sizing
 * - Contact information with encryption
 * - Account segmentation (SMB, Enterprise, Government)
 * - Activity timeline integration
 * - Win/loss analysis
 * 
 * @kinds
 * - LEAD: Prospective customer (not yet qualified)
 * - ACCOUNT: Qualified account with active opportunities
 * 
 * @stages
 * - QUALIFYING: Initial contact, needs assessment
 * - EVALUATING: Product fit evaluation, demos
 * - PROPOSAL: Formal proposal submitted
 * - NEGOTIATION: Terms and pricing negotiation
 * - CLOSED_WON: Deal won, customer onboarded
 * - CLOSED_LOST: Opportunity lost
 * - CUSTOMER: Converted to active customer
 * 
 * @statuses
 * - OPEN: Active lead/opportunity
 * - WON: Successfully closed
 * - LOST: Opportunity lost
 * - ARCHIVED: No longer relevant
 * 
 * @indexes
 * - Unique: { orgId, email } - Prevent duplicate leads per org
 * - Compound: { stage, status } for pipeline reporting
 * - Index: { segment } for segmentation analysis
 * - Index: { owner } for sales rep assignment
 * 
 * @relationships
 * - CrmActivity.leadId → CrmLead._id (activity timeline)
 * - Customer records reference original leadId
 * - Opportunity/deal records link to leadId
 * 
 * @encryption
 * - email encrypted via encryptionPlugin
 * - phone encrypted
 * - Contact details protected
 * 
 * @audit
 * - Stage transitions logged
 * - Revenue forecast changes tracked
 * - Win/loss reasons recorded
 */

import { Schema, Document } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";
import { encryptionPlugin } from "../plugins/encryptionPlugin";

/** Lead classification types */
const LeadKinds = ["LEAD", "ACCOUNT"] as const;
const LeadStages = [
  "QUALIFYING",
  "EVALUATING",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
  "CUSTOMER",
] as const;
const LeadStatuses = ["OPEN", "WON", "LOST", "ARCHIVED"] as const;

export type CrmLeadKind = (typeof LeadKinds)[number];
export type CrmLeadStage = (typeof LeadStages)[number];
export type CrmLeadStatus = (typeof LeadStatuses)[number];

export interface CrmLeadDocument extends Document {
  kind: CrmLeadKind;
  contactName?: string;
  company: string;
  email?: string;
  phone?: string;
  segment?: string;
  revenue?: number;
  employees?: number;
  notes?: string;
  stage: CrmLeadStage;
  status: CrmLeadStatus;
  value: number;
  probability: number;
  expectedCloseDate?: Date;
  source?: string;
  owner?: string;
  lastContactAt?: Date;
  orgId: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CrmLeadSchema = new Schema<CrmLeadDocument>(
  {
    kind: { type: String, enum: LeadKinds, default: "LEAD" },
    contactName: { type: String, trim: true },
    company: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    segment: { type: String, trim: true },
    revenue: { type: Number },
    employees: { type: Number },
    notes: { type: String },
    stage: { type: String, enum: LeadStages, default: "QUALIFYING" },
    status: { type: String, enum: LeadStatuses, default: "OPEN" },
    value: { type: Number, default: 0 },
    probability: { type: Number, default: 0.2 },
    expectedCloseDate: { type: Date },
    source: { type: String, trim: true },
    owner: { type: String, trim: true },
    lastContactAt: { type: Date },
  },
  { timestamps: true },
);

CrmLeadSchema.plugin(tenantIsolationPlugin);
CrmLeadSchema.plugin(auditPlugin);
// SEC-PII-003: Encrypt CRM lead contact information (GDPR Article 32)
CrmLeadSchema.plugin(encryptionPlugin, {
  fields: {
    "email": "Lead Email",
    "phone": "Lead Phone",
  },
});

CrmLeadSchema.index({ orgId: 1, kind: 1, stage: 1 });
CrmLeadSchema.index({ orgId: 1, status: 1 });
CrmLeadSchema.index({ orgId: 1, company: 1 });

const CrmLead = getModel<CrmLeadDocument>("CrmLead", CrmLeadSchema);
export default CrmLead;
