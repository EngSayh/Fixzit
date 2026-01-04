import { Schema, model, models, InferSchemaType, Types } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../../plugins/tenantIsolation";
import { auditPlugin } from "../../plugins/auditPlugin";

const AdvertisementStatus = [
  "PENDING",
  "APPROVED",
  "ACTIVE",
  "EXPIRED",
  "SUSPENDED",
  "CANCELLED",
  "RENEWED",
] as const;

const AdvertisementSchema = new Schema(
  {
    // Multi-tenancy - added by plugin
    // orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },

    // Advertisement Identification
    advertisementNumber: { type: String, required: true }, // Government-issued number
    internalNumber: String, // Internal tracking number

    // Property Information
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    propertyName: String,
    propertyCode: String,
    unitNumber: String, // If advertising specific unit

    // Owner Information
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "Owner",
      required: true,
      index: true,
    },
    ownerName: String,

    // Government/Authority Details
    authority: {
      name: { type: String, required: true }, // Municipality, Real Estate Authority, etc.
      department: String,
      region: String,
      city: String,
      officeCode: String,
      issuingOfficer: String,
      contactNumber: String,
    },

    // Advertisement Type
    type: {
      purpose: { type: String, enum: ["SALE", "RENT", "BOTH"], required: true },
      propertyType: String, // RESIDENTIAL, COMMERCIAL, MIXED
      advertisementMedium: [String], // ONLINE, NEWSPAPER, BILLBOARD, SIGNAGE, SOCIAL_MEDIA
    },

    // Permit Details
    permit: {
      issueDate: { type: Date, required: true },
      startDate: { type: Date, required: true, index: true },
      endDate: { type: Date, required: true, index: true },
      durationMonths: Number,
      autoRenew: { type: Boolean, default: false },
      renewalNoticeDays: { type: Number, default: 30 },
    },

    // Cost Information
    cost: {
      permitFee: { type: Number, required: true },
      renewalFee: Number,
      lateFee: Number,
      currency: { type: String, default: "SAR" },
      paymentDate: Date,
      paymentMethod: String,
      paymentReference: String,
      receiptNumber: String,
    },

    // Agent Information (if applicable)
    agent: {
      assigned: Boolean,
      agentId: { type: Schema.Types.ObjectId, ref: "User" },
      agentName: String,
      agentLicenseNumber: String,
      agentContractId: { type: Schema.Types.ObjectId, ref: "AgentContract" },
      commission: {
        type: String, // PERCENTAGE, FIXED
        value: Number,
      },
    },

    // Advertisement Content
    content: {
      title: String,
      description: String,
      features: [String],
      price: {
        amount: Number,
        currency: { type: String, default: "SAR" },
        negotiable: Boolean,
        includesVAT: Boolean,
      },
      photos: [
        {
          url: String,
          caption: String,
          uploadedAt: Date,
          isPrimary: Boolean,
        },
      ],
      virtualTourUrl: String,
      floorPlanUrl: String,
    },

    // Compliance Requirements
    compliance: {
      energyEfficiencyCertificate: {
        required: Boolean,
        obtained: Boolean,
        certificateNumber: String,
        rating: String, // A+, A, B, C, etc.
        expiryDate: Date,
        documentUrl: String,
      },
      buildingPermit: {
        number: String,
        verified: Boolean,
        documentUrl: String,
      },
      ownershipProof: {
        verified: Boolean,
        documentUrl: String,
      },
      otherDocuments: [
        {
          type: String,
          name: String,
          url: String,
          verified: Boolean,
          uploadedAt: Date,
        },
      ],
    },

    // Publication Channels
    publications: [
      {
        channel: String, // PROPERTY_FINDER, BAYUT, DUBIZZLE, OLX, etc.
        listingId: String,
        publishedDate: Date,
        unpublishedDate: Date,
        status: String, // ACTIVE, PAUSED, REMOVED
        url: String,
        views: Number,
        inquiries: Number,
        leads: [
          {
            date: Date,
            name: String,
            contact: String,
            status: String, // NEW, CONTACTED, QUALIFIED, CONVERTED, REJECTED
          },
        ],
      },
    ],

    // Performance Metrics
    metrics: {
      totalViews: { type: Number, default: 0 },
      totalInquiries: { type: Number, default: 0 },
      totalLeads: { type: Number, default: 0 },
      totalShowings: { type: Number, default: 0 },
      conversionRate: Number, // Percentage
      averageResponseTime: Number, // Hours
      lastActivityDate: Date,
    },

    // Status
    status: {
      type: String,
      enum: AdvertisementStatus,
      default: "PENDING",
      index: true,
    },
    statusHistory: [
      {
        status: { type: String, enum: AdvertisementStatus },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: Schema.Types.ObjectId, ref: "User" },
        reason: String,
        notes: String,
      },
    ],

    // Renewal Information
    renewal: {
      renewedFrom: { type: Schema.Types.ObjectId, ref: "Advertisement" }, // Previous advertisement
      renewedTo: { type: Schema.Types.ObjectId, ref: "Advertisement" }, // New advertisement
      renewalDate: Date,
      renewalCost: Number,
      autoRenewed: Boolean,
    },

    // Suspension/Cancellation
    suspension: {
      suspendedAt: Date,
      suspendedBy: { type: Schema.Types.ObjectId, ref: "User" },
      suspensionReason: String,
      resumedAt: Date,
      resumedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    cancellation: {
      cancelledAt: Date,
      cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
      cancellationReason: String,
      refundAmount: Number,
      refundProcessed: Boolean,
    },

    // Notifications
    notifications: {
      expiryReminderSent: { type: Boolean, default: false },
      expiryReminderDate: Date,
      renewalNoticeSent: { type: Boolean, default: false },
      renewalNoticeDate: Date,
      reminderDaysBefore: { type: Number, default: 30 },
    },

    // Integration with Finance
    finance: {
      expenseRecorded: { type: Boolean, default: false },
      journalEntryId: { type: Schema.Types.ObjectId, ref: "Journal" },
      invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
      postedDate: Date,
    },

    // Documents
    documents: [
      {
        type: String, // PERMIT, RECEIPT, CERTIFICATE, APPROVAL, RENEWAL
        name: String,
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
        verified: Boolean,
        expiresAt: Date,
      },
    ],

    // Metadata
    notes: String,
    tags: [String],
    customFields: Schema.Types.Mixed,

    // createdBy, updatedBy, createdAt, updatedAt added by auditPlugin
  },
  {
    timestamps: true,
  },
);

// Apply plugins
AdvertisementSchema.plugin(tenantIsolationPlugin);
AdvertisementSchema.plugin(auditPlugin);

// Indexes
AdvertisementSchema.index(
  { orgId: 1, advertisementNumber: 1 },
  { unique: true },
);
AdvertisementSchema.index(
  { orgId: 1, internalNumber: 1 },
  { unique: true, sparse: true },
);
AdvertisementSchema.index({ orgId: 1, propertyId: 1, status: 1 });
AdvertisementSchema.index({ orgId: 1, ownerId: 1, status: 1 });
AdvertisementSchema.index({ orgId: 1, "permit.endDate": 1 }); // For expiry notifications
AdvertisementSchema.index({ orgId: 1, "agent.agentId": 1 });

// Pre-save hook for calculations and status updates
AdvertisementSchema.pre("save", async function (next) {
  const now = new Date();

  // Calculate permit duration
  if (
    this.isModified("permit") &&
    this.permit?.startDate &&
    this.permit?.endDate
  ) {
    const start = new Date(this.permit.startDate);
    const end = new Date(this.permit.endDate);
    const diffMonths =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());
    this.permit.durationMonths = diffMonths;
  }

  // Auto-expire advertisements
  if (
    (this.status === "ACTIVE" || this.status === "APPROVED") &&
    this.permit?.endDate &&
    now > this.permit.endDate
  ) {
    this.status = "EXPIRED";
    this.statusHistory.push({
      status: "EXPIRED",
      changedAt: now,
      reason: "Advertisement permit expired",
      changedBy: undefined,
      notes: "Auto-expired by system",
    });
  }

  // Calculate metrics
  if (this.isModified("publications") && this.metrics) {
    this.metrics.totalViews = this.publications.reduce(
      (sum, p) => sum + (p.views || 0),
      0,
    );
    this.metrics.totalInquiries = this.publications.reduce(
      (sum, p) => sum + (p.inquiries || 0),
      0,
    );
    this.metrics.totalLeads = this.publications.reduce(
      (sum, p) => sum + (p.leads?.length || 0),
      0,
    );

    if (this.metrics.totalInquiries > 0) {
      this.metrics.conversionRate =
        (this.metrics.totalLeads / this.metrics.totalInquiries) * 100;
    }
  }

  next();
});

// Virtual for days until expiry
AdvertisementSchema.virtual("daysUntilExpiry").get(function () {
  if (!this.permit?.endDate || this.status === "EXPIRED") return null;
  const now = new Date();
  const diff = this.permit.endDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual for is active
AdvertisementSchema.virtual("isActive").get(function () {
  if (this.status !== "ACTIVE") return false;
  if (!this.permit?.startDate || !this.permit?.endDate) return false;
  const now = new Date();
  return now >= this.permit.startDate && now <= this.permit.endDate;
});

// Export type and model
export type Advertisement = InferSchemaType<typeof AdvertisementSchema>;
export const AdvertisementModel = getModel<Advertisement>(
  "Advertisement",
  AdvertisementSchema,
);
