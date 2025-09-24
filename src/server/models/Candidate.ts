import { Schema, model, models, Types, InferSchemaType } from 'mongoose';

const CandidateSchema = new Schema({
  orgId: { type: String, index: true, required: true },
  firstName: String,
  lastName: String,
  email: { type: String, index: true },
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

CandidateSchema.index({ orgId: 1, email: 1 }, { unique: false });

CandidateSchema.statics.findByEmail = function(orgId: string, email: string) {
  return this.findOne({ orgId, email });
};

export type CandidateDoc = InferSchemaType<typeof CandidateSchema>;

export const Candidate = (models.Candidate || model('Candidate', CandidateSchema)) as any;

