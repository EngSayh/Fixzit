import { Schema, InferSchemaType, type Model } from 'mongoose';
import { typedModel } from '@/src/lib/mongoose-typed';

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

export interface AtsSettingsStatics {
  findOrCreateForOrg(orgId: string): Promise<AtsSettingsDoc>;
}
export type AtsSettingsDoc = InferSchemaType<typeof AtsSettingsSchema>;
export type AtsSettingsModel = Model<AtsSettingsDoc> & AtsSettingsStatics;

AtsSettingsSchema.statics.findOrCreateForOrg = function(orgId: string) {
  return this.findOneAndUpdate(
    { orgId },
    { $setOnInsert: { orgId } },
    { upsert: true, new: true }
  );
};

AtsSettingsSchema.methods.shouldAutoReject = function(input: { experience: number; skills: string[] }) {
  const minYears = this.screeningRules?.minYears ?? 0;
  const required = this.screeningRules?.requiredSkills ?? [];
  const lackRequired = required.length > 0 && !required.every((r: string) => input.skills.includes(r));
  const reject = input.experience < minYears || lackRequired;
  return { reject, reason: reject ? 'Does not meet minimum requirements' : undefined };
};

export const AtsSettings = typedModel<AtsSettingsDoc>('AtsSettings', AtsSettingsSchema) as AtsSettingsModel;

