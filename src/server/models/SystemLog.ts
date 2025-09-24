import { Schema, model, models, Document } from 'mongoose';

export interface ISystemLog extends Document {
  orgId?: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  context?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const SystemLogSchema = new Schema<ISystemLog>({
  orgId: { type: String, index: true },
  level: { type: String, enum: ['INFO', 'WARN', 'ERROR'], default: 'INFO', index: true },
  message: { type: String, required: true },
  context: { type: Map, of: Schema.Types.Mixed }
}, { timestamps: true, collection: 'system_logs' });

SystemLogSchema.index({ level: 1, createdAt: -1 });

export const SystemLog = models.SystemLog || model<ISystemLog>('SystemLog', SystemLogSchema);


