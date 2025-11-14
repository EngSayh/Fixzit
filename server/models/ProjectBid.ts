import { Schema, model, models, InferSchemaType } from "mongoose";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

const BidStatus = [
  "DRAFT", "SUBMITTED", "UNDER_REVIEW", "SHORTLISTED",
  "ACCEPTED", "REJECTED", "WITHDRAWN", "EXPIRED"
] as const;

const ProjectBidSchema = new Schema({
  // Multi-tenancy - will be added by plugin
  // orgId: { type: String, required: true, index: true },

  // References
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  contractorId: { type: Schema.Types.ObjectId, ref: "Contractor", required: true },
  vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" }, // Alternative if using Vendor model
  
  // Bidder Information
  bidder: {
    name: String,
    companyName: String,
    contactPerson: String,
    email: String,
    phone: String,
    licenseNumber: String
  },

  // Bid Details
  bidAmount: { type: Number, required: true },
  currency: { type: String, default: "SAR" },
  
  // Pricing Breakdown
  breakdown: [{
    category: String, // Labor, Materials, Equipment, etc.
    description: String,
    quantity: Number,
    unitPrice: Number,
    totalPrice: Number
  }],

  // Timeline
  timeline: {
    proposedStartDate: Date,
    proposedEndDate: Date,
    duration: Number, // days
    milestones: [{
      name: String,
      description: String,
      duration: Number, // days
      deliverables: [String]
    }]
  },

  // Technical Proposal
  technical: {
    approach: String,
    methodology: String,
    resources: [{
      type: { type: String, enum: ["LABOR", "EQUIPMENT", "MATERIAL"] },
      description: String,
      quantity: Number,
      availability: String
    }],
    qualityAssurance: String,
    riskMitigation: String
  },

  // Team
  team: [{
    name: String,
    role: String,
    qualifications: [String],
    experience: String,
    availability: String
  }],

  // Experience & Credentials
  credentials: {
    similarProjects: [{
      name: String,
      client: String,
      value: Number,
      completionDate: Date,
      description: String,
      referenceContact: String
    }],
    certifications: [{
      name: String,
      issuer: String,
      number: String,
      expiryDate: Date,
      documentUrl: String
    }],
    licenses: [{
      type: String,
      number: String,
      expiryDate: Date,
      documentUrl: String
    }],
    insurance: {
      provider: String,
      policyNumber: String,
      coverage: Number,
      expiryDate: Date,
      documentUrl: String
    }
  },

  // Documents
  documents: [{
    type: String, // PROPOSAL, DRAWINGS, BOQ, SCHEDULE, etc.
    name: String,
    url: String,
    size: Number,
    uploadedAt: Date
  }],

  // Payment Terms
  paymentTerms: {
    advancePayment: { type: Number, default: 0 }, // percentage
    milestonePayments: [{
      milestone: String,
      percentage: Number,
      amount: Number
    }],
    retentionPercentage: { type: Number, default: 5 },
    retentionPeriod: { type: Number, default: 365 }, // days
    paymentSchedule: String
  },

  // Terms & Conditions
  terms: {
    warrantyPeriod: Number, // days
    maintenancePeriod: Number, // days
    penaltyClause: String,
    variations: String,
    termination: String,
    disputeResolution: String
  },

  // Evaluation
  evaluation: {
    score: Number,
    technicalScore: Number,
    financialScore: Number,
    experienceScore: Number,
    evaluatedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    evaluatedAt: Date,
    comments: [{
      evaluator: String,
      comment: String,
      score: Number,
      date: Date
    }],
    strengths: [String],
    weaknesses: [String],
    recommendation: { type: String, enum: ["ACCEPT", "REJECT", "REQUEST_CLARIFICATION"] }
  },

  // Clarifications
  clarifications: [{
    question: String,
    askedBy: String,
    askedAt: Date,
    answer: String,
    answeredAt: Date
  }],

  // Negotiations
  negotiations: [{
    date: Date,
    initiatedBy: String,
    topic: String,
    originalValue: Number,
    proposedValue: Number,
    agreedValue: Number,
    status: { type: String, enum: ["PENDING", "ACCEPTED", "REJECTED"] },
    notes: String
  }],

  // Status
  status: { type: String, enum: BidStatus, default: "DRAFT" },
  submittedAt: Date,
  expiresAt: Date,
  
  // Award Details (if accepted)
  award: {
    awardedAt: Date,
    awardedBy: String,
    contractNumber: String,
    contractSignedDate: Date,
    contractUrl: String,
    finalAmount: Number,
    notes: String
  },

  // Rejection Details (if rejected)
  rejection: {
    rejectedAt: Date,
    rejectedBy: String,
    reason: String,
    feedback: String
  },

  // Withdrawal Details (if withdrawn)
  withdrawal: {
    withdrawnAt: Date,
    reason: String
  },

  // Metadata
  notes: String,
  tags: [String],
  isConfidential: { type: Boolean, default: false },
  
  // Timestamps managed by plugin
}, {
  timestamps: true
});

// Indexes
ProjectBidSchema.index({ projectId: 1, contractorId: 1 });
ProjectBidSchema.index({ projectId: 1, status: 1 });
ProjectBidSchema.index({ contractorId: 1, status: 1 });
ProjectBidSchema.index({ bidAmount: 1 });
ProjectBidSchema.index({ submittedAt: 1 });

// Plugins
ProjectBidSchema.plugin(tenantIsolationPlugin);
ProjectBidSchema.plugin(auditPlugin);

// Virtual for ranking
ProjectBidSchema.virtual('ranking').get(function() {
  if (!this.evaluation?.score) return null;
  return this.evaluation.score;
});

// Virtual for is expired
ProjectBidSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Method to calculate total score
ProjectBidSchema.methods.calculateScore = function(weights: { technical: number, financial: number, experience: number }) {
  const technical = this.evaluation.technicalScore || 0;
  const financial = this.evaluation.financialScore || 0;
  const experience = this.evaluation.experienceScore || 0;
  
  // Validate weights sum to 100
  const sum = weights.technical + weights.financial + weights.experience;
  if (!Number.isFinite(weights.technical) || !Number.isFinite(weights.financial) || !Number.isFinite(weights.experience)) {
    throw new TypeError('All weights must be finite numbers');
  }
  if (Math.abs(sum - 100) > 0.01) {
    throw new Error('Weights must sum to 100');
  }
  
  return (technical * weights.technical + 
          financial * weights.financial + 
          experience * weights.experience) / 100;
};

// Export type and model
export type ProjectBid = InferSchemaType<typeof ProjectBidSchema>;
export const ProjectBidModel = (typeof models !== 'undefined' && models.ProjectBid) || model("ProjectBid", ProjectBidSchema);
