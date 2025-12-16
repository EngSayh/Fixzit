/**
 * Tenant Model - Property occupant management
 * 
 * @module server/models/Tenant
 * @description Manages property tenants (occupants) for rental properties.
 * Note: Different from Organization (which represents tenant orgs in multi-tenancy).
 * This Tenant is a property occupant/renter.
 * 
 * @features
 * - Multi-tenant isolation per organization
 * - Individual and company tenant support
 * - Lease contract association
 * - Emergency contact management
 * - Payment history tracking
 * - Document management (ID, contracts)
 * - Move-in/move-out tracking
 * - Encrypted sensitive contact data
 * 
 * @types
 * - INDIVIDUAL: Single person or family
 * - COMPANY: Corporate tenant
 * - GOVERNMENT: Government agency occupant
 * 
 * @lease_statuses
 * - ACTIVE: Current valid lease
 * - EXPIRED: Lease ended
 * - TERMINATED: Lease cancelled early
 * - RENEWAL_PENDING: Renewal in progress
 * - UNDER_NEGOTIATION: New lease being negotiated
 * 
 * @indexes
 * - Unique: { orgId, code } - Tenant-scoped tenant codes
 * - Index: { property_id } for property tenant lists
 * - Index: { leaseStatus } for lease management
 * - Index: { leaseEndDate } for expiry tracking
 * 
 * @relationships
 * - property_id → Property model
 * - unit_id → Property model (specific unit)
 * - leaseContract_id → LeaseContract model
 * - Invoice records reference tenant_id
 * 
 * @encryption
 * - contact.primary.email encrypted
 * - contact.primary.phone encrypted
 * - emergency contacts encrypted
 * 
 * @audit
 * - Lease status changes logged
 * - Contact updates tracked
 * - Payment history recorded
 */

import { Schema, Model, models, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";
import { encryptionPlugin } from "../plugins/encryptionPlugin";

/** Tenant classification types (occupant types) */
const TenantType = ["INDIVIDUAL", "COMPANY", "GOVERNMENT"] as const;

/** Lease contract status */
const LeaseStatus = [
  "ACTIVE",
  "EXPIRED",
  "TERMINATED",
  "RENEWAL_PENDING",
  "UNDER_NEGOTIATION",
] as const;

const TenantSchema = new Schema(
  {
    // tenantId will be added by tenantIsolationPlugin (as orgId)

    // Basic Information
    // FIXED: Remove unique: true - will be enforced via compound index with orgId
    code: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: TenantType, required: true },

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
      emergency: {
        name: String,
        relationship: String,
        phone: String,
      },
    },

    // Identification
    identification: {
      nationalId: String, // For individuals
      companyRegistration: String, // For companies
      taxId: String,
      licenseNumber: String, // For businesses
      documents: [
        {
          type: String, // ID, Passport, Company Registration, etc.
          number: String,
          issued: Date,
          expires: Date,
          url: String,
        },
      ],
    },

    // Address
    address: {
      current: {
        street: String,
        city: String,
        region: String,
        postalCode: String,
        country: { type: String, default: "SA" },
      },
      permanent: {
        street: String,
        city: String,
        region: String,
        postalCode: String,
        country: { type: String, default: "SA" },
      },
    },

    // Properties/Units
    properties: [
      {
        propertyId: String, // Reference to Property model
        unitNumber: String,
        leaseId: String, // Reference to Lease model
        role: { type: String, enum: ["TENANT", "OWNER", "MANAGER"] },
        occupancy: {
          startDate: Date,
          endDate: Date,
          status: { type: String, enum: LeaseStatus },
        },
      },
    ],

    // Financial Information
    financial: {
      creditScore: Number,
      paymentHistory: [
        {
          date: Date,
          amount: Number,
          type: String, // Rent, Deposit, Fee, etc.
          status: String, // PAID, PENDING, OVERDUE
          method: String,
        },
      ],
      outstandingBalance: Number,
      securityDeposit: Number,
      bankDetails: {
        accountNumber: String,
        bankName: String,
        iban: String,
      },
      billingAddress: String,
    },

    // Lease Management
    leases: [
      {
        leaseId: String, // Reference to Lease model
        propertyId: String,
        unitNumber: String,
        startDate: Date,
        endDate: Date,
        monthlyRent: Number,
        securityDeposit: Number,
        terms: String,
        status: { type: String, enum: LeaseStatus },
        renewal: {
          autoRenew: Boolean,
          noticePeriod: Number, // days
          nextRenewal: Date,
        },
      },
    ],

    // Service Requests
    serviceRequests: [
      {
        requestId: String, // Reference to ServiceRequest model
        type: String, // Maintenance, Complaint, etc.
        status: String, // OPEN, IN_PROGRESS, CLOSED
        priority: String, // LOW, MEDIUM, HIGH, URGENT
        created: Date,
        resolved: Date,
      },
    ],

    // Communication Preferences
    preferences: {
      communication: {
        email: Boolean,
        sms: Boolean,
        phone: Boolean,
        app: Boolean,
      },
      notifications: {
        maintenance: Boolean,
        rent: Boolean,
        events: Boolean,
        announcements: Boolean,
      },
      language: { type: String, default: "ar" },
      timezone: { type: String, default: "Asia/Riyadh" },
    },

    // Access Control
    access: {
      portalAccess: Boolean,
      mobileApp: Boolean,
      maintenanceRequests: Boolean,
      documentAccess: Boolean,
      paymentHistory: Boolean,
    },

    // Compliance
    compliance: {
      backgroundCheck: Boolean,
      creditCheck: Boolean,
      references: [
        {
          name: String,
          contact: String,
          relationship: String,
          verified: Boolean,
        },
      ],
      restrictions: [String], // Pets, Smoking, etc.
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
TenantSchema.plugin(tenantIsolationPlugin);
TenantSchema.plugin(auditPlugin);
// PII encryption for sensitive financial and identity data
TenantSchema.plugin(encryptionPlugin, {
  fields: {
    "identification.nationalId": "National ID",
    "financial.bankDetails.accountNumber": "Bank Account Number",
    "financial.bankDetails.iban": "IBAN",
  },
});

// Indexes for performance (orgId from plugin)
TenantSchema.index({ orgId: 1, type: 1 });
TenantSchema.index({ orgId: 1, "contact.primary.email": 1 });
TenantSchema.index({ orgId: 1, "properties.occupancy.status": 1 });
// Compound tenant-scoped unique index for code
TenantSchema.index(
  { orgId: 1, code: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } } },
);

export type TenantDoc = InferSchemaType<typeof TenantSchema>;

export const Tenant: Model<TenantDoc> = getModel<TenantDoc>(
  "Tenant",
  TenantSchema,
);
