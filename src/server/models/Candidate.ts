import { Schema, model, models, InferSchemaType } from "mongoose";
import { isMockDB } from "@/src/lib/mongo";
import { MockModel } from "@/src/lib/mockDb";

const CandidateSchema: any = new Schema({
  orgId: { type: String, index: true, required: true },
  firstName: String,
  lastName: String,
  email: { type: String, index: true },
  phone: String,
  location: String,
  linkedin: String,
  skills: { type: [String], default: [] },
  experience: Number,
  resumeUrl: String,
  resumeText: String,
  source: String,
  consents: Schema.Types.Mixed
}, { timestamps: true });

CandidateSchema.index({ orgId: 1, email: 1 });
CandidateSchema.statics.findByEmail = function (orgId: string, email: string) {
  return this.findOne({ orgId, email });
};

export type CandidateDoc = InferSchemaType<typeof CandidateSchema>;

class CandidateMock extends MockModel {
  constructor() { super('candidates'); }
  async findByEmail(orgId: string, email: string) {
    const all = await this.find({ orgId, email });
    // @ts-ignore
    const arr = await all.lean?.() || [];
    return arr[0] || null;
  }
}

export const Candidate: any = isMockDB
  ? new CandidateMock()
  : (models.Candidate || model("Candidate", CandidateSchema));

