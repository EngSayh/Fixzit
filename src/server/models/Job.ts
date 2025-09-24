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
    this.publishedAt = new Date();
    await this.save();
  }
  return this;
};

export type JobDoc = InferSchemaType<typeof JobSchema> & { publish: () => Promise<any> };

export const Job = isMockDB
  ? new MockModel('jobs') as any
  : (models.Job || model("Job", JobSchema));

