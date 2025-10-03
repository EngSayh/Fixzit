import { Schema, model, models, InferSchemaType } from "mongoose";

const RFQStatus = ["DRAFT", "PUBLISHED", "BIDDING", "CLOSED", "AWARDED", "CANCELLED"] as const;
const BidStatus = ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED", "REJECTED", "WITHDRAWN"] as const;

const RFQSchema = new Schema({
  tenantId: { type: String, required: true, index: true },

  // Basic Information
  code: { type: String, required: true }, // Uniqueness enforced by compound index with tenantId
  title: { type: String, required: true },
  description: { type: String, required: true },

  // Classification
  category: { type: String, required: true, index: true }, // Construction, Maintenance, etc.
  subcategory: String,
  type: { type: String, enum: ["GOODS", "SERVICES", "WORKS"], default: "WORKS" },

  // Location & Scope
  location: {
    city: String,
    region: String,
    address: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    radius: Number, // km - for city-bounded offers
    nationalAddress: String // SPL National Address
  },

  // Project Context
  projectId: String, // Reference to Project model
  workPackage: String, // WBS reference
  specifications: [{
    item: String,
    description: String,
    quantity: Number,
    unit: String,
    specifications: Schema.Types.Mixed
  }],

  // Timeline
  timeline: {
    publishDate: Date,
    bidDeadline: Date,
    awardDate: Date,
    startDate: Date,
    completionDate: Date
  },

  // Budget
  budget: {
    estimated: Number,
    currency: { type: String, default: "SAR" },
    range: {
      min: Number,
      max: Number
    },
    breakdown: [{
      category: String,
      amount: Number,
      description: String
    }]
  },

  // Requirements
  requirements: {
    qualifications: [String], // Required certifications
    experience: String, // Years of experience required
    insurance: {
      required: Boolean,
      minimum: Number
    },
    licenses: [String], // Required licenses
    references: Number, // Number of references required
    preBidMeeting: {
      required: Boolean,
      date: Date,
      location: String
    }
  },

  // Bidding Rules
  bidding: {
    anonymous: { type: Boolean, default: true }, // Keep bidders anonymous until award
    maxBids: Number, // Maximum number of bids to collect
    targetBids: Number, // Target number of bids (e.g., 3)
    bidLeveling: { type: Boolean, default: true }, // Standardize bids for comparison
    alternates: Boolean, // Allow alternative proposals
    validity: Number // Bid validity period in days
  },

  // Bids
  bids: [{
    bidId: { type: String }, // Uniqueness enforced by compound index (tenantId, bidId)
    vendorId: String,
    vendorName: String,
    submitted: Date,
    status: { type: String, enum: BidStatus, default: "SUBMITTED" },
    amount: Number,
    currency: { type: String, default: "SAR" },
    validity: Date,
    deliveryTime: Number, // days
    paymentTerms: String,
    technicalProposal: String,
    commercialProposal: String,
    alternates: [{
      description: String,
      priceAdjustment: Number
    }],
    exceptions: [String],
    clarifications: [{
      question: String,
      answer: String,
      date: Date
    }],
    evaluation: {
      technicalScore: Number,
      commercialScore: Number,
      totalScore: Number,
      notes: String,
      evaluatedBy: String,
      evaluatedAt: Date
    }
  }],

  // Award
  award: {
    awardedTo: String, // vendorId
    awardedAmount: Number,
    awardedDate: Date,
    contractId: String,
    escrowFunded: Boolean,
    milestones: [{
      description: String,
      amount: Number,
      dueDate: Date,
      completed: Boolean,
      completedDate: Date
    }]
  },

  // Communication
  clarifications: [{
    question: String,
    askedBy: String, // vendorId
    askedAt: Date,
    answer: String,
    answeredBy: String,
    answeredAt: Date
  }],

  // Attachments
  attachments: [{
    type: String, // SPECIFICATIONS, DRAWINGS, CONTRACT, etc.
    name: String,
    url: String,
    uploaded: Date,
    uploadedBy: String
  }],

  // Compliance
  compliance: {
    cityBounded: Boolean, // Enforce city radius
    insuranceRequired: Boolean,
    licenseRequired: Boolean,
    backgroundCheck: Boolean
  },

  // Status & Workflow
  status: { type: String, enum: RFQStatus, default: "DRAFT", index: true },
  workflow: {
    createdBy: String,
    approvedBy: String,
    approvedAt: Date,
    publishedBy: String,
    publishedAt: Date,
    closedBy: String,
    closedAt: Date
  },

  // Metadata
  tags: [String],
  customFields: Schema.Types.Mixed,

  createdBy: { type: String, required: true },
  updatedBy: String
}, {
  timestamps: true
});

// Indexes for performance
RFQSchema.index({ tenantId: 1, code: 1 }, { unique: true }); // Ensure unique code per tenant
RFQSchema.index({ tenantId: 1, status: 1 });
RFQSchema.index({ tenantId: 1, category: 1 });
RFQSchema.index({ tenantId: 1, 'timeline.bidDeadline': 1 });
RFQSchema.index({ tenantId: 1, 'location.city': 1 });
RFQSchema.index({ tenantId: 1, 'bids.status': 1 });

export type RFQDoc = InferSchemaType<typeof RFQSchema>;

// Check if we're using mock database
export const RFQ = models.RFQ || model("RFQ", RFQSchema);

