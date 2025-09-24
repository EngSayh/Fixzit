import { Schema, model, models, InferSchemaType } from 'mongoose';

const AtsSettingsSchema = new Schema({
  orgId: { type: String, index: true, unique: true },
  scoringWeights: {
    skills: { type: Number, default: 0.6 },
    experience: { type: Number, default: 0.4 }
  },
  screeningRules: {
    minYears: { type: Number, default: 0 },
    requiredSkills: [String]
  }
}, { timestamps: true });

export type AtsSettingsDoc = InferSchemaType<typeof AtsSettingsSchema>;

AtsSettingsSchema.statics.findOrCreateForOrg = async function(orgId: string) {
  let doc = await this.findOne({ orgId });
  if (!doc) {
    doc = await this.create({ orgId });
  }
  return doc;
};

AtsSettingsSchema.methods.shouldAutoReject = function(input: { experience: number; skills: string[] }) {
  const minYears = this.screeningRules?.minYears ?? 0;
  const required = this.screeningRules?.requiredSkills ?? [];
  const lackRequired = required.length > 0 && !required.every((r: string) => input.skills.includes(r));
  const reject = input.experience < minYears || lackRequired;
  return { reject, reason: reject ? 'Does not meet minimum requirements' : undefined };
};

export const AtsSettings = (models.AtsSettings || model('AtsSettings', AtsSettingsSchema)) as any;

