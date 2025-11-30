import { Schema, type Document } from 'mongoose';
import { getModel } from '@/types/mongoose-compat';
import { ONBOARDING_ROLES, type OnboardingRole } from './OnboardingCase';

export interface IDocumentType extends Document {
  code: string;
  name_en: string;
  name_ar: string;
  applies_to: OnboardingRole[];
  is_mandatory: boolean;
  requires_expiry: boolean;
  max_file_size_mb: number;
  allowed_mime_types: string[];
  review_required: boolean;
}

const DocumentTypeSchema = new Schema<IDocumentType>(
  {
    code: { type: String, required: true, unique: true },
    name_en: { type: String, required: true },
    name_ar: { type: String, required: true },
    applies_to: [{ type: String, enum: ONBOARDING_ROLES }],
    is_mandatory: { type: Boolean, default: true },
    requires_expiry: { type: Boolean, default: true },
    max_file_size_mb: { type: Number, default: 10 },
    allowed_mime_types: [{ type: String }],
    review_required: { type: Boolean, default: true },
  },
  { collection: 'document_types' },
);

export const DocumentType = getModel<IDocumentType>('DocumentType', DocumentTypeSchema);
export default DocumentType;
