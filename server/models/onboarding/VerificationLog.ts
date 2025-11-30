import { Schema, Types, type HydratedDocument } from 'mongoose';
import { getModel } from '@/types/mongoose-compat';

export type VerificationAction = 'UPLOADED' | 'AUTO_CHECK' | 'MANUAL_CHECK' | 'STATUS_CHANGE' | 'VIEWED';

export interface IVerificationLog {
  document_id: Types.ObjectId;
  action: VerificationAction;
  performed_by_id?: Types.ObjectId;
  details?: Record<string, unknown>;
  timestamp: Date;
}

const VerificationLogSchema = new Schema<IVerificationLog>(
  {
    document_id: { type: Schema.Types.ObjectId, ref: 'VerificationDocument', required: true, index: true },
    action: { type: String, enum: ['UPLOADED', 'AUTO_CHECK', 'MANUAL_CHECK', 'STATUS_CHANGE', 'VIEWED'], required: true },
    performed_by_id: { type: Schema.Types.ObjectId, ref: 'User' },
    details: Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now },
  },
  { collection: 'verification_logs' },
);

export type VerificationLogDoc = HydratedDocument<IVerificationLog>;
export const VerificationLog = getModel<IVerificationLog>('VerificationLog', VerificationLogSchema);
export default VerificationLog;
