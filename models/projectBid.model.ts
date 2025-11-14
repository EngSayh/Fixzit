import { Schema, model, models, Types, HydratedDocument, Model } from 'mongoose';
import { tenantIsolationPlugin } from '../server/plugins/tenantIsolation';
import { auditPlugin } from '../server/plugins/auditPlugin';

const BidStatus = [
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
  'EXPIRED',
] as const;
type TBidStatus = (typeof BidStatus)[number];

type WeightInput = { technical: number; financial: number; experience: number };

export interface IProjectBid {
  // tenant via plugin (orgId)
  projectId: Types.ObjectId;
  contractorId?: Types.ObjectId; // Contractor model
  vendorId?: Types.ObjectId; // Vendor model

  bidder?: {
    name?: string;
    companyName?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    licenseNumber?: string;
  };

  bidAmount: number;
  currency: string;

  breakdown?: Array<{
    category?: string;
    description?: string;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number; // computed if missing: quantity * unitPrice
  }>;

  timeline?: {
    proposedStartDate?: Date;
    proposedEndDate?: Date;
    duration?: number; // days (computed if missing)
    milestones?: Array<{
      name?: string;
      description?: string;
      duration?: number; // days
      deliverables?: string[];
    }>;
  };

  technical?: {
    approach?: string;
    methodology?: string;
    resources?: Array<{
      type?: 'LABOR' | 'EQUIPMENT' | 'MATERIAL';
      description?: string;
      quantity?: number;
      availability?: string;
    }>;
    qualityAssurance?: string;
    riskMitigation?: string;
  };

  team?: Array<{
    name?: string;
    role?: string;
    qualifications?: string[];
    experience?: string;
    availability?: string;
  }>;

  credentials?: {
    similarProjects?: Array<{
      name?: string;
      client?: string;
      value?: number;
      completionDate?: Date;
      description?: string;
      referenceContact?: string;
    }>;
    certifications?: Array<{
      name?: string;
      issuer?: string;
      number?: string;
      expiryDate?: Date;
      documentUrl?: string;
    }>;
    licenses?: Array<{
      type?: string;
      number?: string;
      expiryDate?: Date;
      documentUrl?: string;
    }>;
    insurance?: {
      provider?: string;
      policyNumber?: string;
      coverage?: number;
      expiryDate?: Date;
      documentUrl?: string;
    };
  };

  documents?: Array<{
    type?: string;
    name?: string;
    url?: string;
    size?: number;
    uploadedAt?: Date;
    uploadedBy?: Types.ObjectId;
  }>;

  paymentTerms?: {
    advancePayment?: number; // %
    milestonePayments?: Array<{ milestone?: string; percentage?: number; amount?: number }>;
    retentionPercentage?: number; // %
    retentionPeriod?: number; // days
    paymentSchedule?: string;
  };

  terms?: {
    warrantyPeriod?: number; // days
    maintenancePeriod?: number; // days
    penaltyClause?: string;
    variations?: string;
    termination?: string;
    disputeResolution?: string;
  };

  evaluation?: {
    score?: number;
    technicalScore?: number;
    financialScore?: number;
    experienceScore?: number;
    evaluatedBy?: Types.ObjectId[];
    evaluatedAt?: Date;
    comments?: Array<{ evaluator?: string; comment?: string; score?: number; date?: Date }>;
    strengths?: string[];
    weaknesses?: string[];
    recommendation?: 'ACCEPT' | 'REJECT' | 'REQUEST_CLARIFICATION';
  };

  clarifications?: Array<{
    question?: string;
    askedBy?: string;
    askedAt?: Date;
    answer?: string;
    answeredAt?: Date;
  }>;

  negotiations?: Array<{
    date?: Date;
    initiatedBy?: string;
    topic?: string;
    originalValue?: number;
    proposedValue?: number;
    agreedValue?: number;
    status?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    notes?: string;
  }>;

  status: TBidStatus;
  submittedAt?: Date;
  expiresAt?: Date;

  award?: {
    awardedAt?: Date;
    awardedBy?: Types.ObjectId | string;
    contractNumber?: string;
    contractSignedDate?: Date;
    contractUrl?: string;
    finalAmount?: number;
    notes?: string;
  };

  rejection?: {
    rejectedAt?: Date;
    rejectedBy?: Types.ObjectId | string;
    reason?: string;
    feedback?: string;
  };

  withdrawal?: {
    withdrawnAt?: Date;
    reason?: string;
  };

  notes?: string;
  tags?: string[];
  isConfidential: boolean;

  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: Types.ObjectId | string;
  updatedBy?: Types.ObjectId | string;
}

type ProjectBidDoc = HydratedDocument<IProjectBid>;
/* eslint-disable no-unused-vars */
type IProjectBidModel = Model<IProjectBid> & {
  submit(id: Types.ObjectId, by: Types.ObjectId | string): Promise<ProjectBidDoc | null>;
  withdraw(
    id: Types.ObjectId,
    reason: string,
    by?: Types.ObjectId | string,
  ): Promise<ProjectBidDoc | null>;
  shortlist(id: Types.ObjectId, by: Types.ObjectId | string): Promise<ProjectBidDoc | null>;
  accept(
    id: Types.ObjectId,
    by: Types.ObjectId | string,
    contract?: {
      number?: string;
      url?: string;
      signedAt?: Date;
      finalAmount?: number;
      notes?: string;
    },
  ): Promise<ProjectBidDoc | null>;
  reject(
    id: Types.ObjectId,
    reason: string,
    by?: Types.ObjectId | string,
  ): Promise<ProjectBidDoc | null>;
  top(projectId: Types.ObjectId, limit?: number): Promise<ProjectBidDoc[]>;
};
/* eslint-enable no-unused-vars */

// ---------- Schema ----------
const ProjectBidSchema = new Schema<IProjectBid, IProjectBidModel>(
  {
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    contractorId: { type: Schema.Types.ObjectId, ref: 'Contractor' },
    vendorId: { type: Schema.Types.ObjectId, ref: 'Vendor' },

    bidder: {
      name: { type: String, trim: true },
      companyName: { type: String, trim: true },
      contactPerson: { type: String, trim: true },
      email: { type: String, lowercase: true, trim: true },
      phone: { type: String, trim: true },
      licenseNumber: { type: String, trim: true },
    },

    bidAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'SAR', uppercase: true, trim: true },

    breakdown: [
      {
        category: { type: String, trim: true },
        description: { type: String, trim: true },
        quantity: { type: Number, min: 0 },
        unitPrice: { type: Number, min: 0 },
        totalPrice: { type: Number, min: 0 },
      },
    ],

    timeline: {
      proposedStartDate: Date,
      proposedEndDate: Date,
      duration: { type: Number, min: 0 },
      milestones: [
        {
          name: { type: String, trim: true },
          description: { type: String, trim: true },
          duration: { type: Number, min: 0 },
          deliverables: [String],
        },
      ],
    },

    technical: {
      approach: { type: String, trim: true },
      methodology: { type: String, trim: true },
      resources: [
        {
          type: { type: String, enum: ['LABOR', 'EQUIPMENT', 'MATERIAL'] },
          description: { type: String, trim: true },
          quantity: { type: Number, min: 0 },
          availability: { type: String, trim: true },
        },
      ],
      qualityAssurance: { type: String, trim: true },
      riskMitigation: { type: String, trim: true },
    },

    team: [
      {
        name: { type: String, trim: true },
        role: { type: String, trim: true },
        qualifications: [String],
        experience: { type: String, trim: true },
        availability: { type: String, trim: true },
      },
    ],

    credentials: {
      similarProjects: [
        {
          name: { type: String, trim: true },
          client: { type: String, trim: true },
          value: { type: Number, min: 0 },
          completionDate: Date,
          description: { type: String, trim: true },
          referenceContact: { type: String, trim: true },
        },
      ],
      certifications: [
        {
          name: { type: String, trim: true },
          issuer: { type: String, trim: true },
          number: { type: String, trim: true },
          expiryDate: Date,
          documentUrl: { type: String, trim: true },
        },
      ],
      licenses: [
        {
          type: { type: String, trim: true },
          number: { type: String, trim: true },
          expiryDate: Date,
          documentUrl: { type: String, trim: true },
        },
      ],
      insurance: {
        provider: { type: String, trim: true },
        policyNumber: { type: String, trim: true },
        coverage: { type: Number, min: 0 },
        expiryDate: Date,
        documentUrl: { type: String, trim: true },
      },
    },

    documents: [
      {
        type: { type: String, trim: true },
        name: { type: String, trim: true },
        url: { type: String, trim: true },
        size: { type: Number, min: 0 },
        uploadedAt: Date,
        uploadedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      },
    ],

    paymentTerms: {
      advancePayment: { type: Number, default: 0, min: 0, max: 100 },
      milestonePayments: [
        {
          milestone: String,
          percentage: { type: Number, min: 0, max: 100 },
          amount: { type: Number, min: 0 },
        },
      ],
      retentionPercentage: { type: Number, default: 5, min: 0, max: 100 },
      retentionPeriod: { type: Number, default: 365, min: 0 },
      paymentSchedule: { type: String, trim: true },
    },

    terms: {
      warrantyPeriod: { type: Number, min: 0 },
      maintenancePeriod: { type: Number, min: 0 },
      penaltyClause: { type: String, trim: true },
      variations: { type: String, trim: true },
      termination: { type: String, trim: true },
      disputeResolution: { type: String, trim: true },
    },

    evaluation: {
      score: { type: Number, min: 0, max: 100 },
      technicalScore: { type: Number, min: 0, max: 100 },
      financialScore: { type: Number, min: 0, max: 100 },
      experienceScore: { type: Number, min: 0, max: 100 },
      evaluatedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      evaluatedAt: Date,
      comments: [
        {
          evaluator: String,
          comment: String,
          score: { type: Number, min: 0, max: 100 },
          date: Date,
        },
      ],
      strengths: [String],
      weaknesses: [String],
      recommendation: { type: String, enum: ['ACCEPT', 'REJECT', 'REQUEST_CLARIFICATION'] },
    },

    clarifications: [
      {
        question: String,
        askedBy: String,
        askedAt: Date,
        answer: String,
        answeredAt: Date,
      },
    ],

    negotiations: [
      {
        date: Date,
        initiatedBy: String,
        topic: String,
        originalValue: { type: Number, min: 0 },
        proposedValue: { type: Number, min: 0 },
        agreedValue: { type: Number, min: 0 },
        status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED'] },
        notes: String,
      },
    ],

    status: { type: String, enum: BidStatus, default: 'DRAFT', index: true },
    submittedAt: Date,
    expiresAt: Date,

    award: {
      awardedAt: Date,
      awardedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      contractNumber: { type: String, trim: true },
      contractSignedDate: Date,
      contractUrl: { type: String, trim: true },
      finalAmount: { type: Number, min: 0 },
      notes: { type: String, trim: true },
    },

    rejection: {
      rejectedAt: Date,
      rejectedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      reason: { type: String, trim: true },
      feedback: { type: String, trim: true },
    },

    withdrawal: {
      withdrawnAt: Date,
      reason: { type: String, trim: true },
    },

    notes: { type: String, trim: true },
    tags: [String],
    isConfidential: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } },
);

// ---------- Plugins (ensure orgId exists for tenant indices) ----------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
ProjectBidSchema.plugin(tenantIsolationPlugin);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
ProjectBidSchema.plugin(auditPlugin);

// ---------- Validation: require either contractorId or vendorId ----------
// eslint-disable-next-line no-unused-vars
ProjectBidSchema.path('contractorId').validate(function (this: ProjectBidDoc) {
  return !!(this.contractorId || this.vendorId);
}, 'Either contractorId or vendorId is required');

// eslint-disable-next-line no-unused-vars
ProjectBidSchema.path('vendorId').validate(function (this: ProjectBidDoc) {
  return !!(this.contractorId || this.vendorId);
}, 'Either contractorId or vendorId is required');

// ---------- Indexes (tenant-aware) ----------
ProjectBidSchema.index({ orgId: 1, projectId: 1, contractorId: 1 }, { unique: true, sparse: true });
ProjectBidSchema.index({ orgId: 1, projectId: 1, vendorId: 1 }, { unique: true, sparse: true });
ProjectBidSchema.index({ orgId: 1, projectId: 1, status: 1, submittedAt: -1 });
ProjectBidSchema.index({ orgId: 1, status: 1, 'evaluation.score': -1 });
ProjectBidSchema.index({ orgId: 1, bidAmount: 1 });
ProjectBidSchema.index({ 'bidder.companyName': 'text', 'bidder.name': 'text' });

// ---------- Virtuals ----------
// eslint-disable-next-line no-unused-vars
ProjectBidSchema.virtual('ranking').get(function (this: ProjectBidDoc) {
  return this.evaluation?.score ?? null;
});
// eslint-disable-next-line no-unused-vars
ProjectBidSchema.virtual('isExpired').get(function (this: ProjectBidDoc) {
  return this.expiresAt ? new Date() > this.expiresAt : false;
});

// ---------- Instance methods ----------
ProjectBidSchema.methods.calculateScore = function (this: ProjectBidDoc, weights: WeightInput) {
  const { technicalScore = 0, financialScore = 0, experienceScore = 0 } = this.evaluation || {};
  const { technical, financial, experience } = weights || ({} as WeightInput);
  if (![technical, financial, experience].every(n => Number.isFinite(n))) {
    throw new TypeError('All weights must be finite numbers');
  }
  const sum = technical + financial + experience;
  if (Math.abs(sum - 100) > 0.01) throw new Error('Weights must sum to 100');
  return (
    (technicalScore * technical + financialScore * financial + experienceScore * experience) / 100
  );
};

// ---------- Pre-save hooks ----------
ProjectBidSchema.pre('save', function (next) {
  // normalize email/currency
  if (this.bidder?.email) this.bidder.email = this.bidder.email.trim().toLowerCase();
  if (this.currency) this.currency = this.currency.trim().toUpperCase();

  // compute breakdown totals & bidAmount if not provided
  if (Array.isArray(this.breakdown) && this.breakdown.length) {
    let sum = 0;
    this.breakdown.forEach(b => {
      const qty = Math.max(0, b.quantity ?? 0);
      const up = Math.max(0, b.unitPrice ?? 0);
      const tot = b.totalPrice ?? qty * up;
      b.totalPrice = Math.max(0, tot);
      sum += b.totalPrice;
    });
    if (typeof this.bidAmount !== 'number' || Number.isNaN(this.bidAmount)) {
      this.bidAmount = sum;
    }
  }

  // compute timeline.duration if dates present
  if (this.timeline?.proposedStartDate && this.timeline?.proposedEndDate) {
    const days = Math.max(
      0,
      Math.ceil(
        (new Date(this.timeline.proposedEndDate).getTime() -
          new Date(this.timeline.proposedStartDate).getTime()) /
          (24 * 60 * 60 * 1000),
      ),
    );
    this.timeline.duration = this.timeline.duration ?? days;
  }

  // auto-expire
  if (this.status !== 'EXPIRED' && this.expiresAt && new Date() > this.expiresAt) {
    this.status = 'EXPIRED';
  }

  next();
});

// ---------- Status transitions (statics) ----------
ProjectBidSchema.statics.submit = function (id, by) {
  return this.findOneAndUpdate(
    { _id: id, status: 'DRAFT' },
    { $set: { status: 'SUBMITTED', submittedAt: new Date(), updatedBy: by } },
    { new: true },
  );
};

ProjectBidSchema.statics.withdraw = function (id, reason, by) {
  return this.findOneAndUpdate(
    { _id: id, status: { $in: ['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED'] } },
    {
      $set: {
        status: 'WITHDRAWN',
        'withdrawal.withdrawnAt': new Date(),
        'withdrawal.reason': reason,
        updatedBy: by,
      },
    },
    { new: true },
  );
};

ProjectBidSchema.statics.shortlist = function (id, by) {
  return this.findOneAndUpdate(
    { _id: id, status: 'UNDER_REVIEW' },
    { $set: { status: 'SHORTLISTED', updatedBy: by } },
    { new: true },
  );
};

ProjectBidSchema.statics.accept = function (id, by, contract) {
  return this.findOneAndUpdate(
    { _id: id, status: { $in: ['SHORTLISTED', 'UNDER_REVIEW'] } },
    {
      $set: {
        status: 'ACCEPTED',
        award: {
          awardedAt: new Date(),
          awardedBy: by,
          contractNumber: contract?.number,
          contractUrl: contract?.url,
          contractSignedDate: contract?.signedAt,
          finalAmount: contract?.finalAmount,
          notes: contract?.notes,
        },
        updatedBy: by,
      },
    },
    { new: true },
  );
};

ProjectBidSchema.statics.reject = function (id, reason, by) {
  return this.findOneAndUpdate(
    { _id: id, status: { $in: ['UNDER_REVIEW', 'SHORTLISTED', 'SUBMITTED'] } },
    {
      $set: {
        status: 'REJECTED',
        'rejection.rejectedAt': new Date(),
        'rejection.reason': reason,
        'rejection.rejectedBy': by,
        updatedBy: by,
      },
    },
    { new: true },
  );
};

// Top N bids by score desc, then amount asc
ProjectBidSchema.statics.top = function (projectId: Types.ObjectId, limit = 5) {
  return this.find({
    projectId,
    status: { $in: ['UNDER_REVIEW', 'SHORTLISTED', 'ACCEPTED'] },
  })
    .sort({ 'evaluation.score': -1, bidAmount: 1 })
    .limit(limit);
};

// ---------- Export ----------
export const ProjectBidModel =
  models.ProjectBid ||
  (model<IProjectBid, IProjectBidModel>('ProjectBid', ProjectBidSchema) as IProjectBidModel);
export type { ProjectBidDoc };
