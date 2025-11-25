import { Schema, InferSchemaType, Types } from "mongoose";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";
import { getModel } from "@/src/types/mongoose-compat";

const RFQStatus = [
  "DRAFT",
  "PUBLISHED",
  "BIDDING",
  "CLOSED",
  "AWARDED",
  "CANCELLED",
] as const;

const RFQSchema = new Schema(
  {
    // Basic Information
    code: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },

    // Classification
    category: { type: String, required: true }, // Construction, Maintenance, etc.
    subcategory: String,
    type: {
      type: String,
      enum: ["GOODS", "SERVICES", "WORKS"],
      default: "WORKS",
    },

    // Location & Scope
    location: {
      city: String,
      region: String,
      address: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
      radius: Number, // km - for city-bounded offers
      nationalAddress: String, // SPL National Address
    },

    // Project Context
    projectId: String, // Reference to Project model
    workPackage: String, // WBS reference
    specifications: [
      {
        item: String,
        description: String,
        quantity: Number,
        unit: String,
        specifications: Schema.Types.Mixed,
      },
    ],

    // Timeline
    timeline: {
      publishDate: Date,
      bidDeadline: Date,
      awardDate: Date,
      startDate: Date,
      completionDate: Date,
    },

    // Budget
    budget: {
      estimated: Number,
      currency: { type: String, default: "SAR" },
      range: {
        min: Number,
        max: Number,
      },
      breakdown: [
        {
          category: String,
          amount: Number,
          description: String,
        },
      ],
    },

    // Requirements
    requirements: {
      qualifications: [String], // Required certifications
      experience: String, // Years of experience required
      insurance: {
        required: Boolean,
        minimum: Number,
      },
      licenses: [String], // Required licenses
      references: Number, // Number of references required
      preBidMeeting: {
        required: Boolean,
        date: Date,
        location: String,
      },
    },

    // Bidding Rules
    bidding: {
      anonymous: { type: Boolean, default: true }, // Keep bidders anonymous until award
      maxBids: Number, // Maximum number of bids to collect
      targetBids: Number, // Target number of bids (e.g., 3)
      bidLeveling: { type: Boolean, default: true }, // Standardize bids for comparison
      alternates: Boolean, // Allow alternative proposals
      validity: Number, // Bid validity period in days
    },

    // Bids - CRITICAL FIX: References instead of embedded documents
    bids: [
      {
        type: Schema.Types.ObjectId,
        ref: "ProjectBid",
      },
    ],

    // Award
    award: {
      awardedTo: String, // vendorId
      awardedAmount: Number,
      awardedDate: Date,
      contractId: String,
      escrowFunded: Boolean,
      milestones: [
        {
          description: String,
          amount: Number,
          dueDate: Date,
          completed: Boolean,
          completedDate: Date,
        },
      ],
    },

    // Communication
    clarifications: [
      {
        question: String,
        askedBy: String, // vendorId
        askedAt: Date,
        answer: String,
        answeredBy: String,
        answeredAt: Date,
      },
    ],

    // Attachments
    attachments: [
      {
        type: String, // SPECIFICATIONS, DRAWINGS, CONTRACT, etc.
        name: String,
        url: String,
        uploaded: Date,
        uploadedBy: String,
      },
    ],

    // Compliance
    compliance: {
      cityBounded: Boolean, // Enforce city radius
      insuranceRequired: Boolean,
      licenseRequired: Boolean,
      backgroundCheck: Boolean,
    },

    // Status
    status: { type: String, enum: RFQStatus, default: "DRAFT" },

    // Metadata
    tags: [String],
    customFields: Schema.Types.Mixed,
  },
  {
    timestamps: true,
  },
);

// Apply plugins BEFORE indexes
RFQSchema.plugin(tenantIsolationPlugin);
RFQSchema.plugin(auditPlugin);

// Tenant-scoped indexes (orgId from plugin)
RFQSchema.index({ orgId: 1, code: 1 }, { unique: true }); // FIXED: tenant-scoped code
RFQSchema.index({ orgId: 1, status: 1 });
RFQSchema.index({ orgId: 1, category: 1 });
RFQSchema.index({ orgId: 1, "timeline.bidDeadline": 1 });
RFQSchema.index({ orgId: 1, "location.city": 1 });

export type RFQDoc = InferSchemaType<typeof RFQSchema>;

export const RFQ = getModel<RFQDoc>("RFQ", RFQSchema);
