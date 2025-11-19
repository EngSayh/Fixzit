import { Schema, model, models, InferSchemaType, Model, Document } from 'mongoose';
import { getModel, MModel } from '@/src/types/mongoose-compat';
import { tenantIsolationPlugin } from '../plugins/tenantIsolation';
import { auditPlugin } from '../plugins/auditPlugin';

const JobStatuses = ['draft', 'pending', 'published', 'closed', 'archived'] as const;
const JobVisibilities = ['internal', 'public'] as const;
const JobTypes = ['full-time', 'part-time', 'contract', 'temporary', 'internship', 'remote', 'hybrid'] as const;
const WorkModes = ['onsite', 'remote', 'hybrid'] as const;

type JobStatus = typeof JobStatuses[number];

const JobSchema = new Schema({
  slug: { type: String, required: true },
  title: { type: String, required: true },
  department: { type: String },
  jobType: { type: String, enum: JobTypes, default: 'full-time' },
  status: { type: String, enum: JobStatuses, default: 'draft' },
  visibility: { type: String, enum: JobVisibilities, default: 'internal' },
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

// Apply plugins BEFORE indexes for proper tenant isolation
JobSchema.plugin(tenantIsolationPlugin);
JobSchema.plugin(auditPlugin);

// Tenant-scoped indexes (orgId prepended for proper isolation)
JobSchema.index({ orgId: 1, slug: 1 }, { unique: true });
JobSchema.index({ orgId: 1, title: 'text', description: 'text', requirements: 'text', skills: 'text', tags: 'text' });
JobSchema.index({ orgId: 1, status: 1 });
JobSchema.index({ orgId: 1, jobType: 1, status: 1 });

export type JobDoc = (InferSchemaType<typeof JobSchema> & Document & {
  orgId: string;
  createdBy?: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
  version?: number;
  changeHistory?: unknown[];
}) & { publish(): Promise<JobDoc>; };

JobSchema.methods.publish = async function() {
  if (this.status !== 'published') {
    this.status = 'published';
    this.visibility = this.visibility || 'public';
    this.publishedAt = new Date();
    await this.save();
  }
  return this;
};

export type JobModel = Model<JobDoc>;

// Add pre-save middleware to set defaults
JobSchema.pre('save', function() {
  if (this.isNew) {
    this.status = this.status || 'draft';
    this.visibility = this.visibility || 'internal';
    this.applicationCount = this.applicationCount || 0;
    this.screeningRules = this.screeningRules || { minYears: 0, requiredSkills: [] };
  }
});

export const Job: JobModel = getModel<JobDoc>('Job', JobSchema);

export type { JobStatus };
