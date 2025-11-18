import { Schema, Document } from 'mongoose';
import { getModel } from '@/src/types/mongoose-compat';
import { tenantIsolationPlugin } from '../plugins/tenantIsolation';
import { auditPlugin } from '../plugins/auditPlugin';

const LeadKinds = ['LEAD', 'ACCOUNT'] as const;
const LeadStages = [
  'QUALIFYING',
  'EVALUATING',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
  'CUSTOMER',
] as const;
const LeadStatuses = ['OPEN', 'WON', 'LOST', 'ARCHIVED'] as const;

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
    kind: { type: String, enum: LeadKinds, default: 'LEAD' },
    contactName: { type: String, trim: true },
    company: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    phone: { type: String, trim: true },
    segment: { type: String, trim: true },
    revenue: { type: Number },
    employees: { type: Number },
    notes: { type: String },
    stage: { type: String, enum: LeadStages, default: 'QUALIFYING' },
    status: { type: String, enum: LeadStatuses, default: 'OPEN' },
    value: { type: Number, default: 0 },
    probability: { type: Number, default: 0.2 },
    expectedCloseDate: { type: Date },
    source: { type: String, trim: true },
    owner: { type: String, trim: true },
    lastContactAt: { type: Date },
  },
  { timestamps: true }
);

CrmLeadSchema.plugin(tenantIsolationPlugin);
CrmLeadSchema.plugin(auditPlugin);

CrmLeadSchema.index({ orgId: 1, kind: 1, stage: 1 });
CrmLeadSchema.index({ orgId: 1, status: 1 });
CrmLeadSchema.index({ orgId: 1, company: 1 });

const CrmLead = getModel<CrmLeadDocument>('CrmLead', CrmLeadSchema);
export default CrmLead;
