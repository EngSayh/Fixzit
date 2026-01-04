/**
 * Job Model - ATS job posting and recruitment
 * 
 * @module server/models/Job
 * @description Manages job postings for Fixzit Applicant Tracking System (ATS).
 * Supports job publishing, application tracking, and hiring workflow management.
 * 
 * @features
 * - Multi-tenant isolation per organization
 * - Job posting lifecycle (draft → published → closed → archived)
 * - Internal and public job visibility
 * - Multiple job types (full-time, part-time, contract, internship)
 * - Work mode flexibility (onsite, remote, hybrid)
 * - Requirements and qualifications management
 * - Application tracking integration
 * - Hiring team assignment
 * 
 * @statuses
 * - draft: Job created but not published
 * - pending: Awaiting approval
 * - published: Active and accepting applications
 * - closed: No longer accepting applications
 * - archived: Historical record
 * 
 * @visibilities
 * - internal: Only visible to internal employees
 * - public: Posted on careers page and job boards
 * 
 * @types
 * - full-time: Permanent full-time position
 * - part-time: Permanent part-time position
 * - contract: Fixed-term contract
 * - temporary: Temporary staffing
 * - internship: Internship program
 * - remote: Fully remote position
 * - hybrid: Mix of remote and onsite
 * 
 * @work_modes
 * - onsite: Must work from office/site
 * - remote: Fully remote work allowed
 * - hybrid: Flexible onsite/remote mix
 * 
 * @indexes
 * - Unique: { orgId, slug } - SEO-friendly job URLs
 * - Compound: { status, visibility } for job board filtering
 * - Index: { publishedAt } for date-based sorting
 * - Index: { department } for department filtering
 * 
 * @relationships
 * - Application.jobId → Job._id
 * - hiringManager → User._id
 * - recruiter → User._id
 * 
 * @audit
 * - Job status changes logged
 * - Publication dates tracked
 * - Application counts updated
 */

import {
  Schema,
  model,
  models,
  InferSchemaType,
  Model,
  Document,
} from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

/** Job posting status lifecycle */
const JobStatuses = [
  "draft",
  "pending",
  "published",
  "closed",
  "archived",
] as const;

/** Job visibility settings */
const JobVisibilities = ["internal", "public"] as const;

/** Employment types */
const JobTypes = [
  "full-time",
  "part-time",
  "contract",
  "temporary",
  "internship",
  "remote",
  "hybrid",
] as const;

/** Work location modes */
const WorkModes = ["onsite", "remote", "hybrid"] as const;

type JobStatus = (typeof JobStatuses)[number];

const JobSchema = new Schema(
  {
    slug: { type: String, required: true },
    title: { type: String, required: true },
    department: { type: String },
    jobType: { type: String, enum: JobTypes, default: "full-time" },
    status: { type: String, enum: JobStatuses, default: "draft" },
    visibility: { type: String, enum: JobVisibilities, default: "internal" },
    location: {
      city: { type: String },
      country: { type: String },
      mode: { type: String, enum: WorkModes, default: "onsite" },
    },
    salaryRange: {
      min: { type: Number, default: 0 },
      max: { type: Number, default: 0 },
      currency: { type: String, default: "SAR" },
    },
    description: { type: String },
    requirements: { type: [String], default: [] },
    responsibilities: { type: [String], default: [] },
    benefits: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    screeningRules: {
      minYears: { type: Number, default: 0 },
      requiredSkills: { type: [String], default: [] },
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    postedBy: { type: String },
    publishedAt: { type: Date },
    applicationCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// Apply plugins BEFORE indexes for proper tenant isolation
JobSchema.plugin(tenantIsolationPlugin);
JobSchema.plugin(auditPlugin);

// Tenant-scoped indexes (orgId prepended for proper isolation)
JobSchema.index(
  { orgId: 1, slug: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } } },
);
JobSchema.index({
  orgId: 1,
  title: "text",
  description: "text",
  requirements: "text",
  skills: "text",
  tags: "text",
});
JobSchema.index({ orgId: 1, status: 1 });
JobSchema.index({ orgId: 1, jobType: 1, status: 1 });

export type JobDoc = (InferSchemaType<typeof JobSchema> &
  Document & {
    orgId: string;
    createdBy?: Schema.Types.ObjectId;
    updatedBy?: Schema.Types.ObjectId;
    version?: number;
    changeHistory?: unknown[];
  }) & { publish(): Promise<JobDoc> };

JobSchema.methods.publish = async function () {
  if (this.status !== "published") {
    this.status = "published";
    this.visibility = this.visibility || "public";
    this.publishedAt = new Date();
    await this.save();
  }
  return this;
};

export type JobModel = Model<JobDoc>;

// Add pre-save middleware to set defaults
JobSchema.pre("save", function () {
  if (this.isNew) {
    this.status = this.status || "draft";
    this.visibility = this.visibility || "internal";
    this.applicationCount = this.applicationCount || 0;
    this.screeningRules = this.screeningRules || {
      minYears: 0,
      requiredSkills: [],
    };
  }
});

export const Job: JobModel = getModel<JobDoc>("Job", JobSchema);

export type { JobStatus };
