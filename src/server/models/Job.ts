import { Schema, model, models, InferSchemaType } from "mongoose";
import { isMockDB } from "@/src/lib/mongo";
import { MockModel } from "@/src/lib/mockDb";

const JobSchema = new Schema({
  orgId: { type: String, index: true, required: true },
  title: { type: String, required: true },
  slug: { type: String, unique: true, index: true },
  description: String,
  department: String,
  location: {
    city: String,
    country: String
  },
  jobType: String,
  skills: { type: [String], default: [] },
  screeningRules: {
    minYears: Number
  },
  status: { type: String, default: 'draft', index: true },
  applicationCount: { type: Number, default: 0 },
  postedBy: String,
  publishedAt: Date
}, { timestamps: true });

JobSchema.index({ orgId: 1, status: 1, publishedAt: -1 });
JobSchema.index({ title: "text", description: "text", department: "text", jobType: "text" });

export type JobDoc = InferSchemaType<typeof JobSchema>;

class JobMock extends MockModel {
  constructor() { super('jobs'); }
  async findByIdAndUpdate(id: string, update: any) {
    // Delegate to base implementation
    // @ts-ignore
    return super.findByIdAndUpdate(id, update, { new: true });
  }
}

export const Job = isMockDB
  ? (new JobMock() as any)
  : (models.Job || model("Job", JobSchema));

