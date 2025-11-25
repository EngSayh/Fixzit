import {
  Schema,
  model,
  models,
  InferSchemaType,
  Model,
  Document,
} from "mongoose";
import { tenantIsolationPlugin } from "../../plugins/tenantIsolation";
import { auditPlugin } from "../../plugins/auditPlugin";

const InterviewStages = [
  "screening",
  "technical",
  "hr",
  "final",
  "panel",
] as const;
const InterviewStatuses = [
  "scheduled",
  "completed",
  "cancelled",
  "rescheduled",
  "no-show",
] as const;

type InterviewStage = (typeof InterviewStages)[number];
type InterviewStatus = (typeof InterviewStatuses)[number];

const InterviewSchema = new Schema(
  {
    applicationId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Application",
    },
    jobId: { type: Schema.Types.ObjectId, required: true, ref: "Job" },
    candidateId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Candidate",
    },
    interviewers: { type: [String], default: [] },
    stage: { type: String, enum: InterviewStages, default: "screening" },
    status: { type: String, enum: InterviewStatuses, default: "scheduled" },
    scheduledAt: { type: Date, required: true },
    duration: { type: Number, default: 60 }, // minutes
    location: { type: String },
    meetingUrl: { type: String },
    notes: { type: String },
    feedback: {
      technical: { type: Number, min: 1, max: 5 },
      communication: { type: Number, min: 1, max: 5 },
      cultural: { type: Number, min: 1, max: 5 },
      overall: { type: Number, min: 1, max: 5 },
      comments: { type: String },
      recommendation: {
        type: String,
        enum: ["strong-yes", "yes", "maybe", "no", "strong-no"],
      },
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

// Apply plugins BEFORE indexes for proper tenant isolation
InterviewSchema.plugin(tenantIsolationPlugin);
InterviewSchema.plugin(auditPlugin);

// Tenant-scoped indexes for data isolation and performance
InterviewSchema.index({ orgId: 1, applicationId: 1 });
InterviewSchema.index({ orgId: 1, jobId: 1, scheduledAt: -1 });
InterviewSchema.index({ orgId: 1, candidateId: 1 });
InterviewSchema.index({ orgId: 1, scheduledAt: 1, status: 1 });

export type InterviewDoc = InferSchemaType<typeof InterviewSchema> &
  Document & {
    orgId: string;
    createdBy?: Schema.Types.ObjectId;
    updatedBy?: Schema.Types.ObjectId;
    version?: number;
    changeHistory?: unknown[];
  };

export type InterviewModel = Model<InterviewDoc>;

// Pre-save middleware to set defaults
InterviewSchema.pre("save", function () {
  if (this.isNew) {
    this.stage = this.stage || "screening";
    this.status = this.status || "scheduled";
    this.duration = this.duration || 60;
  }
});

const existingInterviewModel = (
  typeof models !== "undefined" ? models.Interview : undefined
) as InterviewModel | undefined;
export const Interview: InterviewModel =
  existingInterviewModel ||
  model<InterviewDoc, InterviewModel>("Interview", InterviewSchema);

export type { InterviewStage, InterviewStatus };
