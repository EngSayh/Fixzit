import { Schema, model, models, Types, InferSchemaType } from 'mongoose';

const JobSchema = new Schema({
  orgId: { type: String, index: true, required: true },
  title: { type: String, required: true },
  department: String,
  jobType: { type: String, enum: ['full-time','part-time','contract','internship','temporary'], default: 'full-time' },
  location: {
    city: String,
    country: String,
    mode: { type: String, enum: ['onsite','remote','hybrid'], default: 'onsite' }
  },
  salaryRange: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' }
  },
  description: String,
  requirements: [String],
  benefits: [String],
  skills: [String],
  tags: [String],
  status: { type: String, enum: ['draft','pending','published','archived'], default: 'draft', index: true },
  visibility: { type: String, enum: ['private','public'], default: 'private' },
  slug: { type: String, index: true },
  postedBy: String,
  publishedAt: Date,
  applicationCount: { type: Number, default: 0 },
}, { timestamps: true });

JobSchema.index({ title: 'text', description: 'text', requirements: 'text', skills: 'text' });
JobSchema.index({ orgId: 1, slug: 1 }, { unique: true });

JobSchema.methods.publish = async function() {
  if (this.status !== 'published') {
    this.status = 'published';
    this.publishedAt = new Date();
    await this.save();
  }
  return this;
};

export type JobDoc = InferSchemaType<typeof JobSchema> & { publish: () => Promise<JobDoc> };

export const Job = (models.Job || (require('mongoose') as any).model('Job', JobSchema, 'jobs')) as any;

