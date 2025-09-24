import { Schema, model, models, InferSchemaType, Model, Document } from 'mongoose';
import { MockModel } from '@/src/lib/mockDb';

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
  const rules = (this.knockoutRules ?? {}) as {
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

const isMockDB = String(process.env.USE_MOCK_DB || '').toLowerCase() === 'true';

class AtsSettingsMockModel extends MockModel {
  constructor() {
    super('atssettings');
  }

  private attach(doc: any) {
    if (!doc) return doc;
    doc.shouldAutoReject = (input: AutoRejectOptions): AutoRejectDecision => {
      const rules = (doc.knockoutRules ?? {}) as {
        minYears?: number;
        requiredSkills?: string[];
        autoRejectMissingExperience?: boolean;
        autoRejectMissingSkills?: boolean;
      };
      const experience = input.experience ?? 0;
      const skills = (input.skills || []).map((skill: string) => skill.toLowerCase());
      if (rules.minYears && experience < rules.minYears) {
        return { reject: true, reason: `Requires minimum ${rules.minYears} years of experience` };
      }
      if (rules.autoRejectMissingExperience && experience === 0) {
        return { reject: true, reason: 'Experience information missing' };
      }
      const requiredSkills = (rules.requiredSkills || []).map((skill: string) => skill.toLowerCase());
      if (rules.autoRejectMissingSkills && requiredSkills.length > 0) {
        const missing = requiredSkills.filter((skill: string) => !skills.includes(skill));
        if (missing.length > 0) {
          return { reject: true, reason: `Missing required skills: ${missing.join(', ')}` };
        }
      }
      return { reject: false };
    };
    return doc;
  }

  async findOrCreateForOrg(orgId: string) {
    const targetOrg = orgId || process.env.NEXT_PUBLIC_ORG_ID || 'fixzit-platform';
    const existing = await super.findOne({ orgId: targetOrg });
    if (existing) return this.attach(existing);
    const created = await this.create({ orgId: targetOrg });
    return this.attach(created);
  }

  override async create(doc: any) {
    const created = await super.create({
      scoringWeights: { skills: 0.6, experience: 0.3, culture: 0.05, education: 0.05 },
      knockoutRules: { minYears: 0, requiredSkills: [], autoRejectMissingExperience: false, autoRejectMissingSkills: true },
      ...doc
    });
    return this.attach(created);
  }

  override async findOne(query: any) {
    const doc = await super.findOne(query);
    return this.attach(doc);
  }
}

export const AtsSettings: AtsSettingsModel = isMockDB
  ? new AtsSettingsMockModel() as unknown as AtsSettingsModel
  : ((models.AtsSettings as AtsSettingsModel) || model<AtsSettingsDoc, AtsSettingsModel>('AtsSettings', AtsSettingsSchema));

export type { AutoRejectOptions, AutoRejectDecision };
