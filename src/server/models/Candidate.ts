import { Schema, model, models, InferSchemaType } from 'mongoose';
import { MockModel } from '@/src/lib/mockDb';
import { isMockDB } from '@/src/lib/mongo';

const CandidateSchema = new Schema({
  orgId: { type: String, index: true, required: true },
  firstName: String,
  lastName: String,
  email: { type: String, index: true },
  phone: String,
  location: String,
  linkedin: String,
  skills: { type: [String], default: [] },
  experience: { type: Number, default: 0 },
  resumeUrl: String,
  resumeText: String,
  source: String,
  consents: Schema.Types.Mixed,
}, { timestamps: true });

export type CandidateDoc = InferSchemaType<typeof CandidateSchema>;

const RealCandidate = models.Candidate || model('Candidate', CandidateSchema);

export const Candidate: any = isMockDB
  ? new MockModel('candidates')
  : RealCandidate;

Candidate.findByEmail = async (orgId: string, email: string) => {
  if (isMockDB) {
    const all = await (Candidate as any).find({ orgId, email });
    return Array.isArray(all) ? all[0] : all;
  }
  return RealCandidate.findOne({ orgId, email });
}

