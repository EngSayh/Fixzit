import { Schema, Types, InferSchemaType, type Model } from 'mongoose';
import { typedModel } from '@/src/lib/mongoose-typed';

const ApplicationSchema = new Schema({
  orgId: { type: String, index: true, required: true },
  jobId: { type: Types.ObjectId, ref: 'Job', index: true },
  candidateId: { type: Types.ObjectId, ref: 'Candidate', index: true },
  stage: { type: String, enum: ['applied','screening','interview','offer','hired','rejected'], default: 'applied' },
  score: Number,
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

ApplicationSchema.index({ orgId: 1, jobId: 1, candidateId: 1 }, { unique: true });

export type ApplicationDoc = InferSchemaType<typeof ApplicationSchema>;
export type ApplicationModel = Model<ApplicationDoc>;

export const Application = typedModel<ApplicationDoc>('Application', ApplicationSchema) as ApplicationModel;

