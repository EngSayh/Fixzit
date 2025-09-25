import { Schema, model, models, InferSchemaType, Model, Document } from 'mongoose';
import { MockModel } from '@/src/lib/mockDb';

const JobStatuses = ['draft', 'pending', 'published', 'closed', 'archived'] as const;
const JobVisibilities = ['internal', 'public'] as const;
const JobTypes = ['full-time', 'part-time', 'contract', 'temporary', 'internship', 'remote', 'hybrid'] as const;
const WorkModes = ['onsite', 'remote', 'hybrid'] as const;

type JobStatus = typeof JobStatuses[number];

const JobSchema = new Schema({
  orgId: { type: String, required: true, index: true },
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

JobSchema.index({ orgId: 1, slug: 1 }, { unique: true });
JobSchema.index({ title: 'text', description: 'text', requirements: 'text', skills: 'text', tags: 'text' });

export type JobDoc = (InferSchemaType<typeof JobSchema> & Document) & { publish(): Promise<JobDoc>; };

JobSchema.methods.publish = async function(this: JobDoc) {
  if (this.status !== 'published') {
    this.status = 'published';
    this.visibility = this.visibility || 'public';
    this.publishedAt = new Date();
    await this.save();
  }
  return this;
};

export interface JobModel extends Model<JobDoc> {}

const isMockDB = String(process.env.USE_MOCK_DB || '').toLowerCase() === 'true';

class JobMockModel extends MockModel {
  constructor() {
    super('jobs');
  }

  private attach(doc: any) {
    if (!doc) return doc;
    (doc as any).publish = async () => {
      (doc as any).status = 'published';
      (doc as any).visibility = (doc as any).visibility || 'public';
      (doc as any).publishedAt = new Date();
      await this.findByIdAndUpdate((doc as any)._id, { $set: { status: (doc as any).status, visibility: (doc as any).visibility, publishedAt: (doc as any).publishedAt } });
      return doc;
    };
    return doc;
  }

  override async create(doc: any) {
    const created = await super.create({
      status: doc?.status || 'draft',
      visibility: doc?.visibility || 'internal',
      applicationCount: 0,
      screeningRules: { minYears: 0, requiredSkills: [] },
      ...doc
    });
    return this.attach(created);
  }

  override async findById(id: string) {
    const doc = await super.findById(id);
    return this.attach(doc);
  }

  override async findOne(query: any) {
    const doc = await super.findOne(query);
    return this.attach(doc);
  }
}

export const Job: JobModel = isMockDB
  ? new JobMockModel() as unknown as JobModel
  : (models.Job || model<JobDoc>('Job', JobSchema));

export type { JobStatus };
