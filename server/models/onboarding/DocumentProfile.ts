import { Schema, type Document } from 'mongoose';
import { getModel } from '@/types/mongoose-compat';
import { ONBOARDING_ROLES, type OnboardingRole } from './OnboardingCase';

export interface IDocumentProfile extends Document {
  role: OnboardingRole;
  country: string;
  required_doc_codes: string[];
}

const DocumentProfileSchema = new Schema<IDocumentProfile>(
  {
    role: { type: String, enum: ONBOARDING_ROLES, required: true },
    country: { type: String, required: true },
    required_doc_codes: [{ type: String, required: true }],
  },
  { collection: 'document_profiles' },
);

DocumentProfileSchema.index({ role: 1, country: 1 });

export const DocumentProfile = getModel<IDocumentProfile>('DocumentProfile', DocumentProfileSchema);
export default DocumentProfile;
