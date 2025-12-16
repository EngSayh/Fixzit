/**
 * @module server/models/onboarding/VerificationLog
 * @description Verification Log for document review audit trail.
 * Tracks all actions on verification documents (uploads, checks, status changes, views).
 *
 * @features
 * - Action logging (UPLOADED, AUTO_CHECK, MANUAL_CHECK, STATUS_CHANGE, VIEWED)
 * - User action tracking (performed_by_id)
 * - Flexible details payload (action-specific metadata)
 * - Timestamp precision for audit compliance
 * - Read-only audit trail (no updates/deletes)
 *
 * @indexes
 * - { document_id: 1 } - Document activity history
 *
 * @relationships
 * - VerificationDocument: document_id references parent document
 * - User: performed_by_id (admin/system user)
 *
 * @compliance
 * - ZATCA audit trail requirements
 * - Immutable log (no updates after creation)
 *
 * @audit
 * - timestamp: Action timestamp (default: Date.now)
 * - performed_by_id: User who performed action (null for system actions)
 */
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
