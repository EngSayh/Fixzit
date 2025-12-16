/**
 * @module server/models/onboarding/DocumentProfile
 * @description Document Profile model defining required documents per onboarding role and country.
 * Supports multi-country KYC requirements for tenants, vendors, owners, and agents.
 *
 * @features
 * - Role-based document requirements (TENANT, PROPERTY_OWNER, VENDOR, AGENT)
 * - Country-specific KYC profiles (SA, AE, etc.)
 * - Document type code references (links to DocumentType model)
 * - Compliance matrix for onboarding workflows
 * - Configurable document sets per jurisdiction
 *
 * @indexes
 * - { role: 1, country: 1 } - Role-country lookup for onboarding case validation
 *
 * @relationships
 * - OnboardingCase: Cases validate required docs against this profile
 * - DocumentType: Document codes reference DocumentType.code
 *
 * @compliance
 * - ZATCA KYC requirements (SA)
 * - Multi-jurisdictional identity verification standards
 *
 * @audit
 * - No audit trail (reference data, admin-managed)
 */
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
