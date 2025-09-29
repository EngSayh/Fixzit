import { Schema, model, models, InferSchemaType, Model, Document } from 'mongoose';

const JobStatuses = ['draft', 'pending', 'published', 'closed', 'archived'] as const;
const JobVisibilities = ['internal', 'public'] as const;
const JobTypes = ['full-time', 'part-time', 'contract', 'temporary', 'internship', 'remote', 'hybrid'] as const;
const WorkModes = ['onsite', 'remote', 'hybrid'] as const;

type JobStatus = typeof JobStatuses[number];

const JobSchema = new Schema({
  orgId: { type: String, required: true },
  slug: { type: String, required: true },
  title: { type: String, required: true },
  department: { type: String },
  jobType: { type: String, enum: JobTypes, default: 'full-time' },
  status: { type: String, enum: JobStatuses, default: 'draft', index: true },
  visibility: { type: String, enum: JobVisibilities, default: 'internal', index: true },
  location: {
    city: { type: String },
    country: { type: String },
    mode: { type: String, enum: WorkModes, default: 'onsite' }
  },
  salaryRange: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' }
  },
  description: { type: String },
  requirements: { type: [String], default: [] },
  responsibilities: { type: [String], default: [] },
  benefits: { type: [String], default: [] },
  skills: { type: [String], default: [] },
  tags: { type: [String], default: [] },
  screeningRules: {
    minYears: { type: Number, default: 0 },
    requiredSkills: { type: [String], default: [] }
  },
  metadata: { type: Schema.Types.Mixed, default: {} },
  postedBy: { type: String },
  publishedAt: { type: Date },
  applicationCount: { type: Number, default: 0 }
}, { timestamps: true });

JobSchema.index({ slug: 1 }, { unique: true });
JobSchema.index({ title: 'text', description: 'text', requirements: 'text', skills: 'text', tags: 'text' });

export type JobDoc = (InferSchemaType<typeof JobSchema> & Document) & { publish(): Promise<JobDoc>; };

JobSchema.methods.publish = async function() {
  if (this.status !== 'published') {
    this.status = 'published';
    this.visibility = this.visibility || 'public';
    this.publishedAt = new Date();
    await this.save();
  }
  return this;
};

export interface JobModel extends Model<JobDoc> {}

// Add pre-save middleware to set defaults
JobSchema.pre('save', function() {
  if (this.isNew) {
    this.status = this.status || 'draft';
    this.visibility = this.visibility || 'internal';
    this.applicationCount = this.applicationCount || 0;
    this.screeningRules = this.screeningRules || { minYears: 0, requiredSkills: [] };
  }
});

export const Job: JobModel = models.Job || model<JobDoc>('Job', JobSchema);

export type { JobStatus };
