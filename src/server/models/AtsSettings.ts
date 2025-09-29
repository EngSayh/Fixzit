import { Schema, model, models, InferSchemaType, Model, Document } from 'mongoose';

interface AutoRejectOptions {
  experience?: number;
  skills?: string[];
}

interface AutoRejectDecision {
  reject: boolean;
  reason?: string;
}

const AtsSettingsSchema = new Schema({
  orgId: { type: String, required: true, unique: true },
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

export type AtsSettingsDoc = (InferSchemaType<typeof AtsSettingsSchema> & Document) & {
  shouldAutoReject(input: AutoRejectOptions): AutoRejectDecision;
};

export interface AtsSettingsModel extends Model<AtsSettingsDoc> {
  findOrCreateForOrg(orgId: string): Promise<AtsSettingsDoc>;
}

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
  const targetOrg = orgId || process.env.NEXT_PUBLIC_ORG_ID || 'fixzit-platform';
  let doc = await this.findOne({ orgId: targetOrg });
  if (!doc) {
    doc = await this.create({ orgId: targetOrg });
  }
  return doc;
};

// Add pre-save middleware to set defaults
AtsSettingsSchema.pre('save', function() {
  if (this.isNew) {
    this.scoringWeights = this.scoringWeights || { skills: 0.6, experience: 0.3, culture: 0.05, education: 0.05 };
    this.knockoutRules = this.knockoutRules || { minYears: 0, requiredSkills: [], autoRejectMissingExperience: false, autoRejectMissingSkills: true };
  }
});

// Add instance methods
AtsSettingsSchema.methods.shouldAutoReject = function(input: AutoRejectOptions): AutoRejectDecision {
  return { reject: false };
};

// Add static methods
AtsSettingsSchema.statics.findOrCreateForOrg = async function(orgId: string) {
  const existing = await this.findOne({ orgId });
  if (existing) return existing;

  return this.create({ orgId });
};

const existingAtsSettings = models.AtsSettings as AtsSettingsModel | undefined;
export const AtsSettings: AtsSettingsModel = existingAtsSettings || model<AtsSettingsDoc, AtsSettingsModel>('AtsSettings', AtsSettingsSchema);

const existingAtsSettings = models.AtsSettings as AtsSettingsModel | undefined;
export const AtsSettings: AtsSettingsModel = isMockDB
  ? (new AtsSettingsMockModel() as unknown as AtsSettingsModel)
  : (existingAtsSettings || model<AtsSettingsDoc, AtsSettingsModel>('AtsSettings', AtsSettingsSchema));

export type { AutoRejectOptions, AutoRejectDecision };
