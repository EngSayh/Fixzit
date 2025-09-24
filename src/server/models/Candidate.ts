import { Schema, model, models, InferSchemaType } from "mongoose";
import { MockModel } from "@/src/lib/mockDb";
import { isMockDB } from "@/src/lib/mongo";

const CandidateSchema = new Schema({
  orgId: { type: String, required: true, index: true },
  firstName: String,
  lastName: String,
  email: { type: String, required: true, index: true },
  phone: String,
  location: String,
  linkedin: String,
  resumeUrl: String,
  resumeText: String,
  skills: { type: [String], default: [] },
  experience: { type: Number, default: 0 },
  source: { type: String, default: 'careers' },
  consents: { privacy: Boolean, contact: Boolean, dataRetention: Boolean },
}, { timestamps: true });

CandidateSchema.statics.findByEmail = function(orgId: string, email: string) {
  return this.findOne({ orgId, email });
};

export type CandidateDoc = InferSchemaType<typeof CandidateSchema>;

export const Candidate = isMockDB
  ? new MockModel('candidates') as any
  : (models.Candidate || model("Candidate", CandidateSchema));

