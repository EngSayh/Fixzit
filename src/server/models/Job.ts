<<<<<<< HEAD
import { Schema, model, models, InferSchemaType, Types } from "mongoose";
import { MockModel } from "@/src/lib/mockDb";
import { isMockDB } from "@/src/lib/mongo";

const LocationSchema = new Schema({
  city: String,
  country: String,
  mode: { type: String, enum: ["onsite","hybrid","remote"], default: "onsite" }
}, { _id: false });

const SalaryRangeSchema = new Schema({
  min: { type: Number, default: 0 },
  max: { type: Number, default: 0 },
  currency: { type: String, default: "SAR" }
}, { _id: false });

const JobSchema = new Schema({
  orgId: { type: String, required: true, index: true },
  title: { type: String, required: true, index: true },
  department: { type: String, index: true },
  jobType: { type: String, enum: ["full-time","part-time","contract","internship"], default: "full-time" },
  location: { type: LocationSchema, default: () => ({}) },
  salaryRange: { type: SalaryRangeSchema, default: () => ({}) },
  description: { type: String, default: "" },
  requirements: { type: [String], default: [] },
  benefits: { type: [String], default: [] },
  skills: { type: [String], default: [], index: true },
  tags: { type: [String], default: [] },
  status: { type: String, enum: ["draft","pending","published","closed"], default: "draft", index: true },
  visibility: { type: String, enum: ["public","internal"], default: "public", index: true },
  slug: { type: String, required: true, index: true },
  postedBy: { type: String },
  applicationCount: { type: Number, default: 0 },
  publishedAt: { type: Date },
}, { timestamps: true });

JobSchema.index({ orgId: 1, slug: 1 }, { unique: true });
JobSchema.index({ title: "text", department: "text", description: "text", skills: "text" });

JobSchema.methods.publish = async function publish(this: any) {
  if (this.status !== "published") {
    this.status = "published";
=======
import { Schema, model, models, InferSchemaType, Model, Document } from 'mongoose';
import { MockModel } from '@/src/lib/mockDb';
import { isMockDB } from '@/src/lib/mongo';

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
>>>>>>> origin/main
    this.publishedAt = new Date();
    await this.save();
  }
  return this;
};

<<<<<<< HEAD
export type JobDoc = InferSchemaType<typeof JobSchema> & { publish: () => Promise<any> };

export const Job = isMockDB
  ? new MockModel('jobs') as any
  : (models.Job || model("Job", JobSchema));

=======
export interface JobModel extends Model<JobDoc> {}

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
>>>>>>> origin/main
