import { Schema, model, models, InferSchemaType, Model, Document } from 'mongoose';
import { tenantIsolationPlugin } from '../plugins/tenantIsolation';
import { auditPlugin } from '../plugins/auditPlugin';

interface AutoRejectOptions {
  experience?: number;
  skills?: string[];
}

interface AutoRejectDecision {
  reject: boolean;
  reason?: string;
}

const AtsSettingsSchema = new Schema({
  scoringWeights: {
    skills: { type: Number, default: 0.6 },
    experience: { type: Number, default: 0.3 },
    culture: { type: Number, default: 0.05 },
    education: { type: Number, default: 0.05 }
  },
  knockoutRules: {
    minYears: { type: Number, default: 0 },
    requiredSkills: { type: [String], default: [] },
    autoRejectMissingExperience: { type: Boolean, default: false },
    autoRejectMissingSkills: { type: Boolean, default: true }
  },
  alerts: { type: [String], default: [] }
}, { timestamps: true });

// Apply plugins BEFORE indexes for proper tenant isolation
AtsSettingsSchema.plugin(tenantIsolationPlugin);
AtsSettingsSchema.plugin(auditPlugin);

// Tenant-scoped indexes
AtsSettingsSchema.index({ orgId: 1 }, { unique: true });

/* eslint-disable no-unused-vars */
export type AtsSettingsDoc = (InferSchemaType<typeof AtsSettingsSchema> & Document) & {
  shouldAutoReject(input: AutoRejectOptions): AutoRejectDecision;
};

export interface AtsSettingsModel extends Model<AtsSettingsDoc> {
  findOrCreateForOrg(orgId: string): Promise<AtsSettingsDoc>;
}
/* eslint-enable no-unused-vars */

AtsSettingsSchema.methods.shouldAutoReject = function(this: AtsSettingsDoc, input: AutoRejectOptions): AutoRejectDecision {
  const rules = (this.knockoutRules || {}) as {
    minYears?: number;
    requiredSkills?: string[];
    autoRejectMissingExperience?: boolean;
    autoRejectMissingSkills?: boolean;
  };
  const experience = input.experience ?? 0;
  const skills = (input.skills || []).map(skill => skill.toLowerCase());

  if (rules.minYears && experience < rules.minYears) {
    return { reject: true, reason: `Requires minimum ${rules.minYears} years of experience` };
  }

  if (rules.autoRejectMissingExperience && experience === 0) {
    return { reject: true, reason: 'Experience information missing' };
  }

  const requiredSkills = (rules.requiredSkills || []).map(skill => skill.toLowerCase());
  if (rules.autoRejectMissingSkills && requiredSkills.length > 0) {
    const missing = requiredSkills.filter(skill => !skills.includes(skill));
    if (missing.length > 0) {
      return { reject: true, reason: `Missing required skills: ${missing.join(', ')}` };
    }
  }

  return { reject: false };
};

AtsSettingsSchema.statics.findOrCreateForOrg = async function(orgId: string) {
  if (!orgId) {
    throw new Error('Valid orgId is required for AtsSettings.findOrCreateForOrg');
  }
  let doc = await this.findOne({ orgId });
  if (!doc) {
    doc = await this.create({ orgId });
  }
  return doc;
};

// Export model - MongoDB only
const existingAtsSettings = (typeof models !== 'undefined' ? models.AtsSettings : undefined) as AtsSettingsModel | undefined;
export const AtsSettings: AtsSettingsModel = existingAtsSettings || model<AtsSettingsDoc, AtsSettingsModel>('AtsSettings', AtsSettingsSchema);

export type { AutoRejectOptions, AutoRejectDecision };
