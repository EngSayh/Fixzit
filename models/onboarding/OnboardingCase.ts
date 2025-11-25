import { Schema, Types, type HydratedDocument } from 'mongoose';
import { getModel } from '@/src/types/mongoose-compat';

export const ONBOARDING_ROLES = ['CUSTOMER', 'PROPERTY_OWNER', 'TENANT', 'VENDOR', 'AGENT'] as const;
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
  org_id?: Types.ObjectId;
  role: OnboardingRole;
  status: OnboardingStatus;
  current_step: number;
  tutorial_completed: boolean;
  sla_deadline?: Date;
  subject_user_id?: Types.ObjectId;
  subject_org_id?: Types.ObjectId;
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
    org_id: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    role: { type: String, enum: ONBOARDING_ROLES, required: true },
    status: { type: String, enum: ONBOARDING_STATUSES, default: 'DRAFT', index: true },
    current_step: { type: Number, min: 1, max: 4, default: 1 },
    tutorial_completed: { type: Boolean, default: false },
    sla_deadline: { type: Date },
    subject_user_id: { type: Schema.Types.ObjectId, ref: 'User' },
    subject_org_id: { type: Schema.Types.ObjectId, ref: 'Organization' },
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

OnboardingCaseSchema.index({ org_id: 1, status: 1, role: 1 });
OnboardingCaseSchema.index({ subject_user_id: 1, tutorial_completed: 1 });
OnboardingCaseSchema.index({ createdAt: 1, status: 1 });

export type OnboardingCaseDocument = HydratedDocument<IOnboardingCase>;
export const OnboardingCase = getModel<IOnboardingCase>('OnboardingCase', OnboardingCaseSchema);
export default OnboardingCase;
