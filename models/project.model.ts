import { Schema, model, models, Types, HydratedDocument } from "mongoose";
import { MModel } from "@/src/types/mongoose-compat";

// ---------- Enums ----------
const ProjectStatus = [
  "PLANNING",
  "APPROVED",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
  "CLOSED",
] as const;
type TProjectStatus = (typeof ProjectStatus)[number];

const ProjectType = [
  "NEW_CONSTRUCTION",
  "RENOVATION",
  "MAINTENANCE",
  "FIT_OUT",
  "DEMOLITION",
] as const;
type TProjectType = (typeof ProjectType)[number];

const MilestoneStatus = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "DELAYED",
] as const;
type TMilestoneStatus = (typeof MilestoneStatus)[number];

const RFQStatus = ["OPEN", "CLOSED", "AWARDED", "CANCELLED"] as const;
type TRFQStatus = (typeof RFQStatus)[number];

const BidStatus = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "ACCEPTED",
  "REJECTED",
] as const;
type TBidStatus = (typeof BidStatus)[number];

// ---------- Types ----------
export interface IProject {
  tenantId: string; // multi-tenancy key

  code: string;
  name: string;
  description?: string;
  type: TProjectType;
  status: TProjectStatus;

  propertyId?: Types.ObjectId; // Property ref
  location?: {
    point?: { type: "Point"; coordinates: [number, number] }; // [lng, lat]
    address?: string;
    city?: string;
  };

  timeline?: {
    startDate?: Date;
    endDate?: Date;
    duration?: number; // days; computed if absent
    milestones?: Array<{
      _id?: Types.ObjectId;
      name?: string;
      description?: string;
      dueDate?: Date;
      completionDate?: Date;
      status?: TMilestoneStatus;
      progress?: number; // 0..100
      dependencies?: string[];
      deliverables?: string[];
    }>;
  };

  budget?: {
    total?: number;
    allocated?: number;
    spent?: number;
    remaining?: number; // computed
    currency?: string;
    breakdown?: Array<{
      category?: string;
      budgeted?: number;
      spent?: number;
      remaining?: number; // computed
    }>;
  };

  wbs?: Array<{
    level?: number;
    code?: string;
    name?: string;
    description?: string;
    type?: "WORK_PACKAGE" | "DELIVERABLE" | "MILESTONE";
    status?: string;
    progress?: number; // 0..100
    startDate?: Date;
    endDate?: Date;
    duration?: number;
    cost?: number;
    resources?: Array<{
      type?: string; // INTERNAL, CONTRACTOR, CONSULTANT
      name?: string;
      role?: string;
      cost?: number;
      allocation?: number; // %
    }>;
  }>;

  team?: Array<{
    userId: Types.ObjectId; // User ref
    role?: string;
    responsibilities?: string[];
    startDate?: Date;
    endDate?: Date;
    allocation?: number; // %
  }>;

  contractors?: Array<{
    vendorId: Types.ObjectId; // Vendor ref
    company?: string;
    scope?: string;
    contractValue?: number;
    startDate?: Date;
    endDate?: Date;
    performance?: { rating?: number; issues?: number; delays?: number };
  }>;

  quality?: {
    standards?: string[];
    inspections?: Array<{
      type?: string;
      scheduled?: Date;
      completed?: Date;
      inspector?: string;
      result?: string; // PASS/FAIL/CONDITIONAL
      findings?: string[];
      actions?: string[];
    }>;
    defects?: Array<{
      description?: string;
      severity?: string; // MINOR/MAJOR/CRITICAL
      reported?: Date;
      resolved?: Date;
      cost?: number;
    }>;
  };

  safety?: {
    incidents?: Array<{
      type?: string; // ACCIDENT/NEAR_MISS/HAZARD
      description?: string;
      severity?: string;
      reported?: Date;
      investigation?: string;
      correctiveActions?: string[];
    }>;
    permits?: Array<{
      type?: string;
      number?: string;
      issued?: Date;
      expires?: Date;
      status?: string;
    }>;
  };

  rfqs?: Array<{
    rfqId?: Types.ObjectId; // optional RFQ ref
    package?: string;
    description?: string;
    budget?: number;
    bids?: Array<{
      vendorId?: Types.ObjectId;
      company?: string;
      amount?: number;
      currency?: string;
      validity?: Date;
      status?: TBidStatus;
      technicalScore?: number;
      commercialScore?: number;
    }>;
    awardedTo?: Types.ObjectId; // vendorId
    awardedAmount?: number;
    status?: TRFQStatus;
  }>;

  progress?: {
    overall?: number; // 0..100
    schedule?: number; // 0..100
    quality?: number; // 0..100
    cost?: number; // 0..100
    lastUpdated?: Date;
    criticalPath?: string[]; // milestone ids
    delays?: Array<{
      description?: string;
      impact?: number;
      cause?: string;
      mitigation?: string;
    }>;
  };

  documents?: Array<{
    type?: string;
    name?: string;
    version?: string;
    uploaded?: Date;
    uploadedBy?: Types.ObjectId; // User ref
    url?: string;
    status?: string; // DRAFT/APPROVED/REVISED
  }>;

  changes?: Array<{
    changeId?: string;
    description?: string;
    type?: string; // SCOPE/SCHEDULE/COST/QUALITY
    impact?: { schedule?: number; cost?: number; quality?: string };
    status?: "PENDING" | "APPROVED" | "REJECTED" | "IMPLEMENTED";
    requestedBy?: Types.ObjectId | string;
    reviewedBy?: Types.ObjectId | string;
    approvedBy?: Types.ObjectId | string;
    approvedAt?: Date;
  }>;

  compliance?: {
    permits?: Array<{
      type?: string;
      number?: string;
      issued?: Date;
      expires?: Date;
      status?: string;
    }>;
    regulations?: Array<{
      name?: string;
      compliance?: string;
      lastAudit?: Date;
      nextAudit?: Date;
    }>;
  };

  tags?: string[];
  customFields?: Record<string, unknown>;

  createdBy: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;
}

type ProjectDoc = HydratedDocument<IProject>;
type ProjectModel = MModel<IProject> & {
  setStatus(
    projectId: Types.ObjectId,
    next: TProjectStatus,
    who: Types.ObjectId | string,
  ): Promise<ProjectDoc | null>;
  recomputeBudget(projectId: Types.ObjectId): Promise<ProjectDoc | null>;
};

// ---------- Schema ----------
const ProjectSchema = new Schema<IProject>(
  {
    tenantId: { type: String, required: true, index: true },

    code: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: String,
    type: { type: String, enum: ProjectType, required: true },
    status: {
      type: String,
      enum: ProjectStatus,
      default: "PLANNING",
      index: true,
    },

    propertyId: { type: Schema.Types.ObjectId, ref: "Property" },

    location: {
      address: String,
      city: String,
      point: {
        type: { type: String, enum: ["Point"], default: "Point" },
        coordinates: {
          type: [Number], // [lng, lat]
          validate: {
            validator: (v: number[]) =>
              !v?.length ||
              (v.length === 2 && v.every((n) => typeof n === "number")),
            message: "location.point.coordinates must be [lng, lat]",
          },
        },
      },
    },

    timeline: {
      startDate: Date,
      endDate: Date,
      duration: { type: Number, min: 0 }, // computed if absent
      milestones: [
        {
          name: String,
          description: String,
          dueDate: Date,
          completionDate: Date,
          status: { type: String, enum: MilestoneStatus, default: "PENDING" },
          progress: { type: Number, min: 0, max: 100 },
          dependencies: [String],
          deliverables: [String],
        },
      ],
    },

    budget: {
      total: { type: Number, min: 0 },
      allocated: { type: Number, min: 0 },
      spent: { type: Number, min: 0 },
      remaining: { type: Number, min: 0 }, // kept in sync in hooks
      currency: { type: String, default: "SAR" },
      breakdown: [
        {
          category: String,
          budgeted: { type: Number, min: 0 },
          spent: { type: Number, min: 0 },
          remaining: { type: Number, min: 0 },
        },
      ],
    },

    wbs: [
      {
        level: Number,
        code: String,
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
            type: String,
            name: String,
            role: String,
            cost: Number,
            allocation: Number,
          },
        ],
      },
    ],

    team: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        role: String,
        responsibilities: [String],
        startDate: Date,
        endDate: Date,
        allocation: Number,
      },
    ],

    contractors: [
      {
        vendorId: {
          type: Schema.Types.ObjectId,
          ref: "Vendor",
          required: true,
        },
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

    quality: {
      standards: [String],
      inspections: [
        {
          type: String,
          scheduled: Date,
          completed: Date,
          inspector: String,
          result: String,
          findings: [String],
          actions: [String],
        },
      ],
      defects: [
        {
          description: String,
          severity: String,
          reported: Date,
          resolved: Date,
          cost: Number,
        },
      ],
    },

    safety: {
      incidents: [
        {
          type: String,
          description: String,
          severity: String,
          reported: Date,
          investigation: String,
          correctiveActions: [String],
        },
      ],
      permits: [
        {
          type: String,
          number: String,
          issued: Date,
          expires: Date,
          status: String,
        },
      ],
    },

    rfqs: [
      {
        rfqId: { type: Schema.Types.ObjectId, ref: "RFQ" },
        package: String,
        description: String,
        budget: Number,
        bids: [
          {
            vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
            company: String,
            amount: Number,
            currency: String,
            validity: Date,
            status: { type: String, enum: BidStatus },
            technicalScore: Number,
            commercialScore: Number,
          },
        ],
        awardedTo: { type: Schema.Types.ObjectId, ref: "Vendor" },
        awardedAmount: Number,
        status: { type: String, enum: RFQStatus },
      },
    ],

    progress: {
      overall: { type: Number, min: 0, max: 100 },
      schedule: { type: Number, min: 0, max: 100 },
      quality: { type: Number, min: 0, max: 100 },
      cost: { type: Number, min: 0, max: 100 },
      lastUpdated: Date,
      criticalPath: [String],
      delays: [
        {
          description: String,
          impact: Number,
          cause: String,
          mitigation: String,
        },
      ],
    },

    documents: [
      {
        type: String,
        name: String,
        version: String,
        uploaded: Date,
        uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
        url: String,
        status: String,
      },
    ],

    changes: [
      {
        changeId: String,
        description: String,
        type: String,
        impact: { schedule: Number, cost: Number, quality: String },
        status: {
          type: String,
          enum: ["PENDING", "APPROVED", "REJECTED", "IMPLEMENTED"],
        },
        requestedBy: { type: Schema.Types.Mixed },
        reviewedBy: { type: Schema.Types.Mixed },
        approvedBy: { type: Schema.Types.Mixed },
        approvedAt: Date,
      },
    ],

    compliance: {
      permits: [
        {
          type: String,
          number: String,
          issued: Date,
          expires: Date,
          status: String,
        },
      ],
      regulations: [
        { name: String, compliance: String, lastAudit: Date, nextAudit: Date },
      ],
    },

    tags: [String],
    customFields: Schema.Types.Mixed,

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ---------- Indexes ----------
ProjectSchema.index({ tenantId: 1, code: 1 }, { unique: true }); // tenant-scoped uniqueness
ProjectSchema.index({ tenantId: 1, status: 1, type: 1 });
ProjectSchema.index({
  tenantId: 1,
  "timeline.startDate": 1,
  "timeline.endDate": 1,
});
ProjectSchema.index({ tenantId: 1, "progress.overall": -1 });
ProjectSchema.index({ name: "text", code: "text", description: "text" });
ProjectSchema.index({ "location.point": "2dsphere" });

// ---------- Hooks ----------
ProjectSchema.pre("save", function (next) {
  // compute duration if not provided and dates exist
  if (this.timeline?.startDate && this.timeline?.endDate) {
    const days = Math.max(
      0,
      Math.ceil(
        (new Date(this.timeline.endDate).getTime() -
          new Date(this.timeline.startDate).getTime()) /
          (24 * 60 * 60 * 1000),
      ),
    );
    this.timeline.duration = this.timeline.duration ?? days;
  }

  // sanitize milestones & clamp progress 0..100
  if (Array.isArray(this.timeline?.milestones)) {
    this.timeline!.milestones!.forEach((m) => {
      if (typeof m.progress === "number") {
        m.progress = Math.min(100, Math.max(0, m.progress));
      }
    });
  }

  // keep budget remaining in sync
  if (this.budget) {
    const total = this.budget.total ?? 0;
    const spent = this.budget.spent ?? 0;
    this.budget.remaining = Math.max(0, total - spent);

    if (Array.isArray(this.budget.breakdown)) {
      this.budget.breakdown.forEach((b) => {
        const bTot = b.budgeted ?? 0;
        const bSpent = b.spent ?? 0;
        b.remaining = Math.max(0, bTot - bSpent);
      });
    }
  }

  next();
});

// ---------- Methods ----------
ProjectSchema.methods.isOverdue = function (this: ProjectDoc): boolean {
  const ms = this.timeline?.milestones || [];
  return ms.some(
    (m) =>
      m.dueDate &&
      !m.completionDate &&
      new Date(m.dueDate).getTime() < Date.now(),
  );
};

// Guarded status transitions
const ALLOWED: Record<TProjectStatus, TProjectStatus[]> = {
  PLANNING: ["APPROVED", "CANCELLED"],
  APPROVED: ["IN_PROGRESS", "ON_HOLD", "CANCELLED"],
  IN_PROGRESS: ["ON_HOLD", "COMPLETED", "CANCELLED"],
  ON_HOLD: ["IN_PROGRESS", "CANCELLED"],
  COMPLETED: ["CLOSED"],
  CANCELLED: [],
  CLOSED: [],
};

// TODO(type-safety): Resolve ProjectModel static method type compatibility
ProjectSchema.statics.setStatus = async function (
  this: ProjectModel,
  projectId: Types.ObjectId,
  next: TProjectStatus,
  who: Types.ObjectId | string,
) {
  const doc = await this.findById(projectId).lean();
  if (!doc) return null;
  const allowed = ALLOWED[doc.status as TProjectStatus] || [];
  if (!allowed.includes(next)) {
    throw new Error(`Illegal status transition: ${doc.status} → ${next}`);
  }
  return this.findByIdAndUpdate(
    projectId,
    { $set: { status: next, updatedBy: who } },
    { new: true },
  );
} as ProjectModel["setStatus"];

// TODO(type-safety): Resolve ProjectModel static method type compatibility
ProjectSchema.statics.recomputeBudget = async function (
  this: ProjectModel,
  projectId: Types.ObjectId,
) {
  const doc = await this.findById(projectId);
  if (!doc) return null;
  const total = doc.budget?.total ?? 0;
  const spent = doc.budget?.spent ?? 0;
  doc.budget = doc.budget || {};
  doc.budget.remaining = Math.max(0, total - spent);
  doc.budget.breakdown?.forEach((b) => {
    const t = b.budgeted ?? 0;
    const s = b.spent ?? 0;
    b.remaining = Math.max(0, t - s);
  });
  await doc.save();
  return doc;
} as ProjectModel["recomputeBudget"];

// ---------- Export ----------
export const Project =
  models.Project ||
  (model<IProject, ProjectModel>("Project", ProjectSchema) as ProjectModel);
export type { ProjectDoc };
