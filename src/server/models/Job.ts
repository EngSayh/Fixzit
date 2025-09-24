import { Schema, model, models, InferSchemaType } from 'mongoose';
import { MockModel } from '@/src/lib/mockDb';
import { isMockDB } from '@/src/lib/mongo';

const JobSchema = new Schema({
  orgId: { type: String, index: true, required: true },
  title: { type: String, required: true },
  slug: { type: String, required: true, index: true },
  description: String,
  department: String,
  location: {
    city: String,
    country: String
  },
  jobType: { type: String, enum: ['full-time','part-time','contract','internship','temporary'], default: 'full-time' },
  skills: { type: [String], default: [] },
  screeningRules: {
    minYears: { type: Number, default: 0 }
  },
  applicationCount: { type: Number, default: 0 },
  status: { type: String, enum: ['draft','published','closed'], default: 'draft', index: true },
  postedBy: String,
  publishedAt: Date,
}, { timestamps: true });

JobSchema.index({ title: 'text', description: 'text', skills: 'text' });

export type JobDoc = InferSchemaType<typeof JobSchema>;

export const Job = isMockDB
  ? new MockModel('jobs') as any
  : (models.Job || model('Job', JobSchema));

