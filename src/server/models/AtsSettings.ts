import { Schema, model, models, InferSchemaType } from 'mongoose';
import { MockModel } from '@/src/lib/mockDb';
import { isMockDB } from '@/src/lib/mongo';

const AtsSettingsSchema = new Schema({
  orgId: { type: String, index: true, required: true },
  scoringWeights: {
    skills: { type: Number, default: 0.6 },
    experience: { type: Number, default: 0.4 }
  },
  knockout: {
    minExperienceYears: { type: Number, default: 0 },
    requiredSkills: { type: [String], default: [] }
  }
}, { timestamps: true });

export type AtsSettingsDoc = InferSchemaType<typeof AtsSettingsSchema>;

const Real = models.AtsSettings || model('AtsSettings', AtsSettingsSchema);

export const AtsSettings: any = isMockDB ? new MockModel('atssettings') : Real;

AtsSettings.findOrCreateForOrg = async (orgId: string) => {
  if (isMockDB) {
    let found = await (AtsSettings as any).findOne({ orgId });
    if (!found) {
      found = await (AtsSettings as any).create({ orgId });
    }
    return found;
  }
  let item = await Real.findOne({ orgId });
  if (!item) item = await Real.create({ orgId });
  return item;
}

AtsSettings.prototype.shouldAutoReject = function (params: { experience: number; skills: string[] }) {
  const minY = this.knockout?.minExperienceYears ?? 0;
  const reqSkills: string[] = this.knockout?.requiredSkills ?? [];
  const lacksSkill = reqSkills.length > 0 && !reqSkills.every(s => params.skills?.includes(s));
  const reject = params.experience < minY || lacksSkill;
  return { reject, reason: reject ? 'Does not meet minimum requirements' : undefined };
}

