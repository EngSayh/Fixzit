import { Schema, Document, Types } from 'mongoose';
import { getModel } from '@/src/types/mongoose-compat';
import { tenantIsolationPlugin } from '../plugins/tenantIsolation';
import { auditPlugin } from '../plugins/auditPlugin';

const ActivityTypes = ['CALL', 'EMAIL', 'MEETING', 'NOTE', 'HANDOFF'] as const;

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
    leadId: { type: Schema.Types.ObjectId, ref: 'CrmLead' },
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
  { timestamps: true }
);

CrmActivitySchema.plugin(tenantIsolationPlugin);
CrmActivitySchema.plugin(auditPlugin);

CrmActivitySchema.index({ orgId: 1, performedAt: -1 });
CrmActivitySchema.index({ orgId: 1, type: 1 });

const CrmActivity = getModel<CrmActivityDocument>('CrmActivity', CrmActivitySchema);
export default CrmActivity;
