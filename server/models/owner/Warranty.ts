import { Schema, model, models, InferSchemaType, Types } from "mongoose";
import { getModel, MModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../../plugins/tenantIsolation";
import { auditPlugin } from "../../plugins/auditPlugin";

const WarrantyStatus = [
  "ACTIVE",
  "EXPIRED",
  "CLAIMED",
  "VOID",
  "TRANSFERRED",
] as const;
const ClaimStatus = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

const WarrantySchema = new Schema(
  {
    // Multi-tenancy - added by plugin
    // orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },

    // Warranty Number (auto-generated)
    warrantyNumber: { type: String, required: true },

    // Item/Service Details
    item: {
      name: { type: String, required: true },
      category: String, // APPLIANCE, ELECTRICAL, PLUMBING, STRUCTURAL, HVAC, etc.
      description: String,
      brand: String,
      model: String,
      serialNumber: String,
      purchaseDate: Date,
      purchasePrice: Number,
      invoiceNumber: String,
      invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
    },

    // Location
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    unitNumber: String,
    specificLocation: String, // E.g., "Master Bedroom", "Kitchen"

    // Service Provider Details
    provider: {
      type: {
        type: String,
        enum: ["MANUFACTURER", "RETAILER", "INSTALLER", "EXTENDED_WARRANTY"],
        required: true,
      },
      vendorId: { type: Schema.Types.ObjectId, ref: "Vendor" },
      name: { type: String, required: true },
      contact: {
        phone: String,
        email: String,
        address: String,
        website: String,
        supportNumber: String,
      },
      licenseNumber: String,
      contractNumber: String,
    },

    // Warranty Terms
    terms: {
      startDate: { type: Date, required: true, index: true },
      endDate: { type: Date, required: true, index: true },
      durationMonths: Number,
      durationYears: Number,
      type: {
        type: String,
        enum: ["PARTS_ONLY", "LABOR_ONLY", "PARTS_AND_LABOR", "COMPREHENSIVE"],
      },
      coverage: {
        fullReplacement: Boolean,
        repair: Boolean,
        onSitService: Boolean,
        pickupService: Boolean,
        loanerProvided: Boolean,
        emergencyService: Boolean,
        emergencyResponse: String, // e.g., "24 hours", "Same day"
      },
      limitations: [String], // What's NOT covered
      conditions: [String], // Conditions to maintain warranty
      transferable: Boolean,
      renewable: Boolean,
    },

    // Cost Information
    cost: {
      free: Boolean, // Manufacturer warranty
      paid: Boolean, // Extended warranty
      amount: Number,
      currency: { type: String, default: "SAR" },
      paymentDate: Date,
      renewalCost: Number,
    },

    // Ownership
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "Owner",
      required: true,
      index: true,
    },
    ownerName: String,

    // Documents
    documents: [
      {
        type: String, // WARRANTY_CERTIFICATE, PURCHASE_INVOICE, INSTALLATION_CERT, CLAIM_FORM
        name: String,
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
        expiresAt: Date,
      },
    ],

    // Maintenance Requirements (to keep warranty valid)
    maintenanceRequirements: [
      {
        description: String,
        frequency: String, // MONTHLY, QUARTERLY, ANNUALLY
        dueDate: Date,
        completed: Boolean,
        completedDate: Date,
        serviceProvider: String,
        notes: String,
      },
    ],

    // Warranty Claims
    claims: [
      {
        claimNumber: String,
        claimDate: { type: Date, default: Date.now },
        issueDescription: String,
        reportedBy: { type: Schema.Types.ObjectId, ref: "User" },

        // Service Request
        serviceDate: Date,
        serviceProvider: String,
        technicianName: String,

        // Diagnosis
        diagnosis: String,
        partsRequired: [
          {
            partName: String,
            partNumber: String,
            quantity: Number,
            cost: Number,
          },
        ],
        laborCost: Number,

        // Work Order Integration
        workOrderId: { type: Schema.Types.ObjectId, ref: "WorkOrder" },
        workOrderNumber: String,

        // Resolution
        status: {
          type: String,
          enum: ClaimStatus,
          default: "PENDING",
          index: true,
        },
        resolution: String,
        completedDate: Date,
        coveredAmount: Number, // Amount covered by warranty
        ownerPaidAmount: Number, // Amount owner had to pay

        // Documents
        documents: [
          {
            type: String,
            url: String,
            uploadedAt: Date,
          },
        ],

        notes: String,
      },
    ],

    // Notifications
    notifications: {
      expiryReminderSent: { type: Boolean, default: false },
      expiryReminderDate: Date,
      maintenanceReminderSent: { type: Boolean, default: false },
      maintenanceReminderDate: Date,
      reminderDaysBefore: { type: Number, default: 30 }, // Notify X days before expiry
    },

    // Status
    status: {
      type: String,
      enum: WarrantyStatus,
      default: "ACTIVE",
      index: true,
    },
    statusHistory: [
      {
        status: { type: String, enum: WarrantyStatus },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: Schema.Types.ObjectId, ref: "User" },
        reason: String,
      },
    ],

    // Void/Cancel Information
    voidInfo: {
      voidDate: Date,
      voidReason: String,
      voidedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },

    // Transfer Information (if transferable)
    transfer: {
      transferredTo: String, // New owner name
      transferDate: Date,
      transferFee: Number,
      transferApproved: Boolean,
      transferDocuments: [
        {
          type: String,
          url: String,
          uploadedAt: Date,
        },
      ],
    },

    // Analytics
    analytics: {
      totalClaims: { type: Number, default: 0 },
      totalClaimsCost: { type: Number, default: 0 },
      totalCoveredAmount: { type: Number, default: 0 },
      averageResponseTime: Number, // Days
      satisfactionRating: Number, // 1-5
    },

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
WarrantySchema.plugin(tenantIsolationPlugin);
WarrantySchema.plugin(auditPlugin);

// Indexes
WarrantySchema.index({ orgId: 1, warrantyNumber: 1 }, { unique: true });
WarrantySchema.index({ orgId: 1, propertyId: 1, status: 1 });
WarrantySchema.index({ orgId: 1, ownerId: 1, status: 1 });
WarrantySchema.index({ orgId: 1, "terms.endDate": 1 }); // For expiry notifications
WarrantySchema.index({ orgId: 1, "provider.vendorId": 1 });
WarrantySchema.index({ orgId: 1, "claims.status": 1 });

// Pre-save hook for calculations and status updates
WarrantySchema.pre("save", async function (next) {
  const now = new Date();

  // Calculate duration
  if (
    this.isModified("terms") &&
    this.terms?.startDate &&
    this.terms?.endDate
  ) {
    const start = new Date(this.terms.startDate);
    const end = new Date(this.terms.endDate);
    const diffMonths =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());
    this.terms.durationMonths = diffMonths;
    this.terms.durationYears = Math.floor(diffMonths / 12);
  }

  // Auto-expire warranties
  if (
    this.status === "ACTIVE" &&
    this.terms?.endDate &&
    now > this.terms.endDate
  ) {
    this.status = "EXPIRED";
    this.statusHistory.push({
      status: "EXPIRED",
      changedAt: now,
      reason: "Warranty period ended",
      changedBy: undefined,
    });
  }

  // Update analytics when claims change
  if (this.isModified("claims") && this.analytics) {
    const completedClaims = this.claims.filter((c) => c.status === "COMPLETED");
    this.analytics.totalClaims = completedClaims.length;
    this.analytics.totalCoveredAmount = completedClaims.reduce(
      (sum, c) => sum + (c.coveredAmount || 0),
      0,
    );
    this.analytics.totalClaimsCost = completedClaims.reduce(
      (sum, c) => sum + (c.coveredAmount || 0) + (c.ownerPaidAmount || 0),
      0,
    );
  }

  next();
});

// Virtual for days until expiry
WarrantySchema.virtual("daysUntilExpiry").get(function () {
  if (!this.terms?.endDate || this.status !== "ACTIVE") return null;
  const now = new Date();
  const diff = this.terms.endDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual for warranty value assessment
WarrantySchema.virtual("hasValue").get(function () {
  if (this.status !== "ACTIVE") return false;
  const daysLeft = this.get("daysUntilExpiry");
  return daysLeft !== null && daysLeft > 0;
});

// Method to add claim
WarrantySchema.methods.addClaim = function (claimData: {
  issueDescription: string;
  reportedBy: Types.ObjectId;
  serviceDate?: Date;
  serviceProvider?: string;
  technicianName?: string;
  diagnosis?: string;
  notes?: string;
}) {
  if (!this.claims) this.claims = [];

  // Generate claim number
  const claimNumber = `WC-${this.warrantyNumber}-${(this.claims.length + 1).toString().padStart(3, "0")}`;

  this.claims.push({
    ...claimData,
    claimNumber,
    claimDate: new Date(),
    status: "PENDING",
    partsRequired: [],
    laborCost: undefined,
    workOrderId: undefined,
    workOrderNumber: undefined,
    resolution: undefined,
    completedDate: undefined,
    coveredAmount: undefined,
    ownerPaidAmount: undefined,
    documents: [],
  });

  return this.save();
};

// Export type and model
export type Warranty = InferSchemaType<typeof WarrantySchema>;
export const WarrantyModel = getModel<Warranty>("Warranty", WarrantySchema);
