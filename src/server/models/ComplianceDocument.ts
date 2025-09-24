import { Schema, model, models, Document } from 'mongoose';

export interface IComplianceDocument extends Document {
  orgId: string;
  type: string;
  title: string;
  fileUrl: string;
  version?: string;
  issuedAt?: Date;
  expiresAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ComplianceDocumentSchema = new Schema<IComplianceDocument>({
  orgId: { type: String, required: true, index: true },
  type: { type: String, required: true, index: true },
  title: { type: String, required: true },
  fileUrl: { type: String, required: true },
  version: String,
  issuedAt: Date,
  expiresAt: Date,
  metadata: { type: Map, of: Schema.Types.Mixed }
}, { timestamps: true, collection: 'compliance_documents' });

ComplianceDocumentSchema.index({ orgId: 1, type: 1, title: 1, version: 1 });

export const ComplianceDocument = models.ComplianceDocument || model<IComplianceDocument>('ComplianceDocument', ComplianceDocumentSchema);


