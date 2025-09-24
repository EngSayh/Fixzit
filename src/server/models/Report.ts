import { Schema, model, models, Document } from 'mongoose';

export interface IReport extends Document {
  orgId: string;
  code: string;
  name: string;
  type: string;
  params?: Record<string, any>;
  generatedAt?: Date;
  fileUrl?: string;
  status: 'PENDING' | 'READY' | 'FAILED';
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>({
  orgId: { type: String, required: true, index: true },
  code: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, required: true, index: true },
  params: { type: Map, of: Schema.Types.Mixed },
  generatedAt: Date,
  fileUrl: String,
  status: { type: String, enum: ['PENDING', 'READY', 'FAILED'], default: 'PENDING', index: true }
}, { timestamps: true, collection: 'reports' });

ReportSchema.index({ orgId: 1, code: 1 }, { unique: true });

export const Report = models.Report || model<IReport>('Report', ReportSchema);


