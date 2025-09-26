import { Schema, Types, InferSchemaType, type Model } from 'mongoose';
import { typedModel } from '@/src/lib/mongoose-typed';

const CandidateSchema = new Schema({
  orgId: { type: String, index: true, required: true },
  firstName: String,
  lastName: String,
  email: { type: String, index: true, lowercase: true, trim: true, required: true },
  phone: String,
  location: String,
  linkedin: String,
  skills: [String],
  experience: Number,
  resumeUrl: String,
  resumeText: String,
  source: { type: String, default: 'careers' },
  consents: {
    privacy: Boolean,
    contact: Boolean,
    dataRetention: Boolean
  }
}, { timestamps: true });

CandidateSchema.index({ orgId: 1, email: 1 }, { unique: true });

CandidateSchema.statics.findByEmail = function(orgId: string, email: string) {
  return this.findOne({ orgId, email });
};

export type CandidateDoc = InferSchemaType<typeof CandidateSchema>;
export type CandidateModel = Model<CandidateDoc>;

export const Candidate = typedModel<CandidateDoc>('Candidate', CandidateSchema) as CandidateModel;

