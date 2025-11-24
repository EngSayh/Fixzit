import { Schema, Types, type HydratedDocument } from 'mongoose';
import { getModel } from '@/src/types/mongoose-compat';

export const DOCUMENT_STATUSES = ['UPLOADED', 'PROCESSING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED', 'EXPIRED'] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export interface IVerificationDocument {
  onboarding_case_id: Types.ObjectId;
  document_type_code: string;
  file_storage_key: string;
  original_name: string;
  mime_type?: string;
  size_bytes?: number;
  status: DocumentStatus;
  ocr_data?: Record<string, unknown>;
  ocr_confidence?: number;
  expiry_date?: Date;
  rejection_reason?: {
    en?: string;
    ar?: string;
  };
  uploaded_by_id: Types.ObjectId;
  verified_by_id?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const VerificationDocumentSchema = new Schema<IVerificationDocument>(
  {
    onboarding_case_id: { type: Schema.Types.ObjectId, ref: 'OnboardingCase', required: true, index: true },
    document_type_code: { type: String, required: true, index: true },
    file_storage_key: { type: String, required: true },
    original_name: { type: String, required: true },
    mime_type: String,
    size_bytes: Number,
    status: { type: String, enum: DOCUMENT_STATUSES, default: 'UPLOADED', index: true },
    ocr_data: {
      extracted_text: String,
      confidence: Number,
      fields: Schema.Types.Mixed,
    },
    ocr_confidence: Number,
    expiry_date: Date,
    rejection_reason: {
      en: String,
      ar: String,
    },
    uploaded_by_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    verified_by_id: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { collection: 'verification_documents', timestamps: true },
);

VerificationDocumentSchema.index({ status: 1, expiry_date: 1 });
VerificationDocumentSchema.index({ onboarding_case_id: 1, status: 1 });

export type VerificationDocumentDoc = HydratedDocument<IVerificationDocument>;
export const VerificationDocument = getModel<IVerificationDocument>('VerificationDocument', VerificationDocumentSchema);
export default VerificationDocument;
