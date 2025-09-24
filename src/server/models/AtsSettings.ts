import { Schema, model, models, InferSchemaType } from "mongoose";
import { MockModel } from "@/src/lib/mockDb";
import { isMockDB } from "@/src/lib/mongo";

const AtsSettingsSchema = new Schema({
  orgId: { type: String, required: true, unique: true, index: true },
  scoringWeights: {
    skills: { type: Number, default: 0.6 },
    years: { type: Number, default: 0.2 },
    answers: { type: Number, default: 0.2 }
  },
  knockoutRules: {
    minYears: { type: Number, default: 0 },
    requiredSkills: { type: [String], default: [] },
    autoRejectIfMissingSkills: { type: Boolean, default: false }
  }
}, { timestamps: true });

// Helpers for code paths using static methods
(AtsSettingsSchema.statics as any).findOrCreateForOrg = async function(orgId: string) {
  let doc = await this.findOne({ orgId });
  if (!doc) doc = await this.create({ orgId });
  return doc;
};

(AtsSettingsSchema.methods as any).shouldAutoReject = function({ experience, skills }: { experience: number, skills: string[] }) {
  const rules = this.knockoutRules || {};
  const lacksYears = rules.minYears ? (experience || 0) < rules.minYears : false;
  const required = Array.isArray(rules.requiredSkills) ? rules.requiredSkills : [];
  const have = new Set((skills || []).map((s: string) => s.toLowerCase()));
  const lacksSkills = required.length > 0 && !required.every((r: string) => have.has(r.toLowerCase()));
  const reject = (rules.autoRejectIfMissingSkills && lacksSkills) || lacksYears;
  const reason = reject ? (lacksYears ? 'Insufficient experience' : 'Missing required skills') : undefined;
  return { reject, reason };
};

export type AtsSettingsDoc = InferSchemaType<typeof AtsSettingsSchema>;

export const AtsSettings = isMockDB
  ? new MockModel('ats_settings') as any
  : (models.AtsSettings || model("AtsSettings", AtsSettingsSchema));

