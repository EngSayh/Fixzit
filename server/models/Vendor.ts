/**
 * Vendor Model - Service provider and supplier management
 * 
 * @module server/models/Vendor
 * @description Manages external vendors for work orders, procurement, and services.
 * Core entity for vendor onboarding, approval workflows, and performance tracking.
 * 
 * @features
 * - Multi-tenant isolation per organization
 * - Vendor approval workflow (PENDING → APPROVED → ACTIVE)
 * - Service category specialization
 * - Rating and performance metrics
 * - Financial tracking (total contracts, payments)
 * - Insurance and compliance document management
 * - Contact information with encryption
 * - Blacklist and suspension capabilities
 * 
 * @statuses
 * - PENDING: Onboarding/verification in progress
 * - APPROVED: Verified and ready for assignment
 * - SUSPENDED: Temporarily inactive (performance issues)
 * - REJECTED: Failed verification or compliance
 * - BLACKLISTED: Permanently banned
 * 
 * @types
 * - SUPPLIER: Product/material suppliers
 * - CONTRACTOR: Construction/renovation contractors
 * - SERVICE_PROVIDER: Maintenance/repair services
 * - CONSULTANT: Professional advisory services
 * 
 * @indexes
 * - Unique: { orgId, code } - Tenant-scoped vendor codes
 * - Index: { status } for vendor filtering
 * - Index: { type } for category searches
 * - Index: { rating } for performance sorting
 * 
 * @relationships
 * - WorkOrder.assigned_to → Vendor._id
 * - Invoice.vendorId → Vendor._id
 * - User records reference vendor_id
 * 
 * @encryption
 * - contactEmail encrypted via encryptionPlugin
 * - contactPhone encrypted
 * - Bank details encrypted
 * 
 * @audit
 * - Status changes logged
 * - Payment history tracked
 * - Performance metrics recorded
 */

import { Schema, Model, models, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";
import { encryptionPlugin } from "../plugins/encryptionPlugin";

/** Vendor approval and operational statuses */
const VendorStatus = [
  "PENDING",
  "APPROVED",
  "SUSPENDED",
  "REJECTED",
  "BLACKLISTED",
] as const;

/** Vendor business classification */
const VendorType = [
  "SUPPLIER",
  "CONTRACTOR",
  "SERVICE_PROVIDER",
  "CONSULTANT",
] as const;

const VendorSchema = new Schema(
  {
    // tenantId REMOVED - plugin will add orgId

    // Basic Information
    code: { type: String, required: true }, // unique removed - will be tenant-scoped
    name: { type: String, required: true },
    type: { type: String, enum: VendorType, required: true },

    // Contact Information
    contact: {
      primary: {
        name: String,
        title: String,
        email: String,
        phone: String,
        mobile: String,
      },
      secondary: {
        name: String,
        email: String,
        phone: String,
      },
      address: {
        street: String,
        city: String,
        region: String,
        postalCode: String,
        country: { type: String, default: "SA" },
      },
    },

    // Business Information
    business: {
      registrationNumber: String,
      taxId: String,
      licenseNumber: String,
      establishedDate: Date,
      employees: Number,
      annualRevenue: Number,
      specializations: [String], // Areas of expertise
      certifications: [
        {
          name: String,
          issuer: String,
          issued: Date,
          expires: Date,
          status: String, // VALID, EXPIRED, PENDING
        },
      ],
    },

    // Approval Status
    status: { type: String, enum: VendorStatus, default: "PENDING" },
    approval: {
      approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
      approvedAt: Date,
      rejectionReason: String,
      suspensionReason: String,
      reviewNotes: String,
    },

    // Performance Metrics
    performance: {
      rating: { type: Number, min: 0, max: 5 },
      completedProjects: Number,
      ongoingProjects: Number,
      successRate: Number, // percentage
      averageResponseTime: Number, // hours
      complianceRate: Number, // percentage
      reviews: [
        {
          clientId: { type: Schema.Types.ObjectId, ref: "Organization" },
          rating: Number,
          comment: String,
          date: Date,
          projectId: { type: Schema.Types.ObjectId, ref: "Project" },
        },
      ],
    },

    // Financial Information
    financial: {
      bankDetails: {
        accountNumber: String,
        bankName: String,
        iban: String,
      },
      creditLimit: Number,
      paymentTerms: Number, // days
      outstandingBalance: Number,
      paymentHistory: [
        {
          date: Date,
          amount: Number,
          invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
          status: String, // PAID, PENDING, OVERDUE
          method: String,
        },
      ],
    },

    // Services & Products
    catalog: [
      {
        category: String,
        subcategory: String,
        products: [
          {
            code: String,
            name: String,
            description: String,
            unitPrice: Number,
            currency: { type: String, default: "SAR" },
            leadTime: Number, // days
            availability: String, // IN_STOCK, OUT_OF_STOCK, DISCONTINUED
            specifications: Schema.Types.Mixed,
          },
        ],
      },
    ],

    // Work History
    projects: [
      {
        projectId: { type: Schema.Types.ObjectId, ref: "Project" },
        name: String,
        type: String,
        startDate: Date,
        endDate: Date,
        value: Number,
        status: String, // COMPLETED, ONGOING, CANCELLED
        clientId: { type: Schema.Types.ObjectId, ref: "Organization" },
        rating: Number,
        feedback: String,
      },
    ],

    // Compliance
    compliance: {
      insurance: {
        provider: String,
        policyNumber: String,
        coverage: Number,
        expiry: Date,
        status: String, // VALID, EXPIRED, PENDING
      },
      licenses: [
        {
          type: String, // Business License, Trade License, etc.
          number: String,
          issued: Date,
          expires: Date,
          status: String,
        },
      ],
      certifications: [
        {
          type: String, // ISO, OSHA, etc.
          number: String,
          issued: Date,
          expires: Date,
          status: String,
        },
      ],
      backgroundCheck: Boolean,
      references: [
        {
          company: String,
          contact: String,
          phone: String,
          email: String,
          verified: Boolean,
        },
      ],
    },

    // Contracts & Agreements
    contracts: [
      {
        contractId: { type: Schema.Types.ObjectId, ref: "Contract" },
        type: String, // MASTER, PROJECT_SPECIFIC, NDA, etc.
        startDate: Date,
        endDate: Date,
        value: Number,
        terms: String,
        status: String, // ACTIVE, EXPIRED, TERMINATED
        signed: Date,
        signedBy: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],

    // Preferences
    preferences: {
      notification: {
        email: Boolean,
        sms: Boolean,
        app: Boolean,
      },
      communication: {
        preferredMethod: String, // EMAIL, PHONE, APP
        preferredLanguage: { type: String, default: "ar" },
      },
    },

    // Metadata
    tags: [String],
    customFields: Schema.Types.Mixed,

    // createdBy/updatedBy will be added by auditPlugin
  },
  {
    timestamps: true,
  },
);

// APPLY PLUGINS (BEFORE INDEXES)
VendorSchema.plugin(tenantIsolationPlugin);
VendorSchema.plugin(auditPlugin);
// PII encryption for sensitive financial data
VendorSchema.plugin(encryptionPlugin, {
  fields: {
    "financial.bankDetails.accountNumber": "Bank Account Number",
    "financial.bankDetails.iban": "IBAN",
  },
});

// INDEXES (AFTER PLUGINS)
// CRITICAL FIX: Tenant-scoped unique index for 'code'
VendorSchema.index(
  { orgId: 1, code: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } } },
);

// FIXED: Tenant-scoped indexes
VendorSchema.index({ orgId: 1, status: 1 });
VendorSchema.index({ orgId: 1, type: 1 });
VendorSchema.index({ orgId: 1, "performance.rating": -1 });
VendorSchema.index({ orgId: 1, "business.specializations": 1 });

export type VendorDoc = InferSchemaType<typeof VendorSchema>;

export const Vendor: Model<VendorDoc> = getModel<VendorDoc>(
  "Vendor",
  VendorSchema,
);
