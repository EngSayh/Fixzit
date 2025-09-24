import { Schema, model, models, InferSchemaType } from 'mongoose';
import { MockModel } from '@/src/lib/mockDb';
import { isMockDB } from '@/src/lib/mongo';

const ApplicationSchema = new Schema({
  orgId: { type: String, index: true, required: true },
  jobId: { type: String, index: true, required: true },
  candidateId: { type: String, index: true, required: true },
  stage: { type: String, enum: ['applied','review','interview','offer','hired','rejected'], default: 'applied', index: true },
  score: { type: Number, default: 0 },
  source: String,
  candidateSnapshot: Schema.Types.Mixed,
  coverLetter: String,
  history: [{
    action: String,
    by: String,
    at: Date,
    details: String
  }]
}, { timestamps: true });

ApplicationSchema.index({ orgId: 1, jobId: 1, candidateId: 1 }, { unique: false });

export type ApplicationDoc = InferSchemaType<typeof ApplicationSchema>;

export const Application = isMockDB
  ? new MockModel('applications') as any
  : (models.Application || model('Application', ApplicationSchema));

