import { Schema, Model, models, InferSchemaType } from "mongoose";
import { getModel } from "@/src/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

const _ProjectStatus = [
  "PLANNING",
  "APPROVED",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
  "CLOSED",
] as const;
const ProjectType = [
  "NEW_CONSTRUCTION",
  "RENOVATION",
  "MAINTENANCE",
  "FIT_OUT",
  "DEMOLITION",
] as const;

const ProjectSchema = new Schema(
  {
    // tenantId will be added by tenantIsolationPlugin (as orgId)

    // Basic Information
    // FIXED: Remove unique: true - will be enforced via compound index with orgId
    code: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    type: { type: String, enum: ProjectType, required: true },

    // Location
    propertyId: String, // Reference to Property model
    location: {
      address: String,
      city: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },

    // Timeline
    timeline: {
      startDate: Date,
      endDate: Date,
      duration: Number, // days
      milestones: [
        {
          name: String,
          description: String,
          dueDate: Date,
          completionDate: Date,
          status: {
            type: String,
            enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "DELAYED"],
          },
          progress: { type: Number, min: 0, max: 100 },
          dependencies: [String], // milestone IDs
          deliverables: [String],
        },
      ],
    },

    // Budget & Financial
    budget: {
      total: Number,
      allocated: Number,
      spent: Number,
      remaining: Number,
      currency: { type: String, default: "SAR" },
      breakdown: [
        {
          category: String, // Labor, Materials, Equipment, etc.
          budgeted: Number,
          spent: Number,
          remaining: Number,
        },
      ],
    },

    // Work Breakdown Structure (WBS)
    wbs: [
      {
        level: Number, // hierarchy level
        code: String, // WBS code (1.1, 1.2, etc.)
        name: String,
        description: String,
        type: {
          type: String,
          enum: ["WORK_PACKAGE", "DELIVERABLE", "MILESTONE"],
        },
        status: String,
        progress: { type: Number, min: 0, max: 100 },
        startDate: Date,
        endDate: Date,
        duration: Number,
        cost: Number,
        resources: [
          {
            type: String, // INTERNAL, CONTRACTOR, CONSULTANT
            name: String,
            role: String,
            cost: Number,
            allocation: Number, // percentage
          },
        ],
      },
    ],

    // Resources
    team: [
      {
        userId: String,
        role: String,
        responsibilities: [String],
        startDate: Date,
        endDate: Date,
        allocation: Number, // percentage
      },
    ],
    contractors: [
      {
        vendorId: String,
        company: String,
        scope: String,
        contractValue: Number,
        startDate: Date,
        endDate: Date,
        performance: {
          rating: Number,
          issues: Number,
          delays: Number,
        },
      },
    ],

    // Quality & Safety
    quality: {
      standards: [String],
      inspections: [
        {
          type: String,
          scheduled: Date,
          completed: Date,
          inspector: String,
          result: String, // PASS, FAIL, CONDITIONAL
          findings: [String],
          actions: [String],
        },
      ],
      defects: [
        {
          description: String,
          severity: String, // MINOR, MAJOR, CRITICAL
          reported: Date,
          resolved: Date,
          cost: Number,
        },
      ],
    },
    safety: {
      incidents: [
        {
          type: String, // ACCIDENT, NEAR_MISS, HAZARD
          description: String,
          severity: String,
          reported: Date,
          investigation: String,
          correctiveActions: [String],
        },
      ],
      permits: [
        {
          type: String, // WORK_PERMIT, HOT_WORK, etc.
          number: String,
          issued: Date,
          expires: Date,
          status: String,
        },
      ],
    },

    // Procurement
    rfqs: [
      {
        rfqId: String,
        package: String,
        description: String,
        budget: Number,
        bids: [
          {
            vendorId: String,
            company: String,
            amount: Number,
            currency: String,
            validity: Date,
            status: {
              type: String,
              enum: ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED"],
            },
            technicalScore: Number,
            commercialScore: Number,
          },
        ],
        awardedTo: String, // vendorId
        awardedAmount: Number,
        status: {
          type: String,
          enum: ["OPEN", "CLOSED", "AWARDED", "CANCELLED"],
        },
      },
    ],

    // Progress Tracking
    progress: {
      overall: { type: Number, min: 0, max: 100 },
      schedule: { type: Number, min: 0, max: 100 },
      quality: { type: Number, min: 0, max: 100 },
      cost: { type: Number, min: 0, max: 100 },
      lastUpdated: Date,
      criticalPath: [String], // milestone IDs
      delays: [
        {
          description: String,
          impact: Number, // days
          cause: String,
          mitigation: String,
        },
      ],
    },

    // Documents
    documents: [
      {
        type: String, // CONTRACT, DRAWING, PERMIT, REPORT, etc.
        name: String,
        version: String,
        uploaded: Date,
        uploadedBy: String,
        url: String,
        status: String, // DRAFT, APPROVED, REVISED
      },
    ],

    // Change Management
    changes: [
      {
        changeId: String,
        description: String,
        type: String, // SCOPE, SCHEDULE, COST, QUALITY
        impact: {
          schedule: Number, // days
          cost: Number,
          quality: String,
        },
        status: {
          type: String,
          enum: ["PENDING", "APPROVED", "REJECTED", "IMPLEMENTED"],
        },
        requestedBy: String,
        reviewedBy: String,
        approvedBy: String,
        approvedAt: Date,
      },
    ],

    // Compliance
    compliance: {
      permits: [
        {
          type: String,
          number: String,
          issued: Date,
          expires: Date,
          status: String, // PENDING, APPROVED, EXPIRED
        },
      ],
      regulations: [
        {
          name: String,
          compliance: String, // COMPLIANT, NON_COMPLIANT, UNDER_REVIEW
          lastAudit: Date,
          nextAudit: Date,
        },
      ],
    },

    // Metadata
    tags: [String],
    customFields: Schema.Types.Mixed,
    // createdBy, updatedBy, createdAt, updatedAt will be added by auditPlugin
  },
  {
    timestamps: true,
  },
);

// Apply plugins BEFORE indexes
ProjectSchema.plugin(tenantIsolationPlugin);
ProjectSchema.plugin(auditPlugin);

// Indexes for performance (orgId from plugin)
ProjectSchema.index({ orgId: 1, status: 1 });
ProjectSchema.index({ orgId: 1, type: 1 });
ProjectSchema.index({ orgId: 1, "timeline.startDate": 1 });
ProjectSchema.index({ orgId: 1, "progress.overall": -1 });
// Compound tenant-scoped unique index for code
ProjectSchema.index({ orgId: 1, code: 1 }, { unique: true });

export type ProjectDoc = InferSchemaType<typeof ProjectSchema>;

export const Project: Model<ProjectDoc> = getModel<ProjectDoc>(
  "Project",
  ProjectSchema,
);
