import { Schema, Types, type HydratedDocument } from 'mongoose';
import { getModel } from '@/types/mongoose-compat';
import { tenantIsolationPlugin } from '../../plugins/tenantIsolation';
import { encryptionPlugin } from '../../plugins/encryptionPlugin';

// STRICT v4: Migrated CUSTOMER → TENANT (both are property roles)
export const ONBOARDING_ROLES = ['TENANT', 'PROPERTY_OWNER', 'OWNER', 'VENDOR', 'AGENT'] as const;
export type OnboardingRole = (typeof ONBOARDING_ROLES)[number];

export const ONBOARDING_STATUSES = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'DOCS_PENDING',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
] as const;
export type OnboardingStatus = (typeof ONBOARDING_STATUSES)[number];

export interface IOnboardingCase {
  orgId?: Types.ObjectId; // AUDIT-2025-11-29: Changed from org_id to orgId
  role: OnboardingRole;
  status: OnboardingStatus;
  current_step: number;
  tutorial_completed: boolean;
  country?: string;
  sla_deadline?: Date;
  subject_user_id?: Types.ObjectId;
  subjectOrgId?: Types.ObjectId; // AUDIT-2025-11-29: Changed from subject_org_id
  basic_info: {
    name: string;
    email: string;
    phone?: string;
    type?: string;
    property_id?: Types.ObjectId;
    unit_id?: Types.ObjectId;
  };
  payload?: Record<string, unknown>;
  documents: Types.ObjectId[];
  created_by_id: Types.ObjectId;
  verified_by_id?: Types.ObjectId;
  source_channel: 'web' | 'mobile' | 'internal_admin';
  createdAt: Date;
  updatedAt: Date;
}

const OnboardingCaseSchema = new Schema<IOnboardingCase>(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization' }, // AUDIT-2025-11-29: Changed from org_id
    role: { type: String, enum: ONBOARDING_ROLES, required: true },
    status: { type: String, enum: ONBOARDING_STATUSES, default: 'DRAFT', index: true },
    current_step: { type: Number, min: 1, max: 4, default: 1 },
    tutorial_completed: { type: Boolean, default: false },
    country: { type: String, default: 'SA' },
    sla_deadline: { type: Date },
    subject_user_id: { type: Schema.Types.ObjectId, ref: 'User' },
    subjectOrgId: { type: Schema.Types.ObjectId, ref: 'Organization' }, // AUDIT-2025-11-29: Changed from subject_org_id
    basic_info: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: String,
      type: String,
      property_id: { type: Schema.Types.ObjectId, ref: 'Property' },
      unit_id: { type: Schema.Types.ObjectId, ref: 'Unit' },
    },
    payload: {
      type: Schema.Types.Mixed,
      default: {},
      validate: {
        validator(this: IOnboardingCase, v: Record<string, unknown>) {
          if (this.role === 'VENDOR') {
            return Array.isArray((v as { categories?: unknown }).categories) &&
              (v as { categories?: unknown[] }).categories!.length > 0;
          }
          return true;
        },
        message: 'Vendor payload must include at least one service category',
      },
    },
    documents: [{ type: Schema.Types.ObjectId, ref: 'VerificationDocument' }],
    created_by_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    verified_by_id: { type: Schema.Types.ObjectId, ref: 'User' },
    source_channel: { type: String, enum: ['web', 'mobile', 'internal_admin'], default: 'web' },
  },
  { timestamps: true, collection: 'onboarding_cases' },
);

OnboardingCaseSchema.index({ orgId: 1, status: 1, role: 1 }); // AUDIT-2025-11-29: Changed from org_id
OnboardingCaseSchema.index({ subject_user_id: 1, tutorial_completed: 1 });
OnboardingCaseSchema.index({ createdAt: 1, status: 1 });

/**
 * Multi-tenancy Plugin - Auto-filters queries by orgId
 * SECURITY: Ensures onboarding cases are isolated per organization
 */
OnboardingCaseSchema.plugin(tenantIsolationPlugin);

/**
 * PII Encryption (GDPR Article 32 - Security of Processing)
 * Encrypts sensitive contact information in basic_info
 */
OnboardingCaseSchema.plugin(encryptionPlugin, {
  fields: {
    'basic_info.email': 'Applicant Email',
    'basic_info.phone': 'Applicant Phone',
  },
});

export type OnboardingCaseDocument = HydratedDocument<IOnboardingCase>;
export const OnboardingCase = getModel<IOnboardingCase>('OnboardingCase', OnboardingCaseSchema);
export default OnboardingCase;
