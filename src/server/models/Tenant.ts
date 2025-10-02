import { Schema, model, models, InferSchemaType } from "mongoose";

const TenantType = ["INDIVIDUAL", "COMPANY", "GOVERNMENT"] as const;
const LeaseStatus = ["ACTIVE", "EXPIRED", "TERMINATED", "RENEWAL_PENDING", "UNDER_NEGOTIATION"] as const;

const TenantSchema = new Schema({
  tenantId: { type: String, required: true, index: true },

  // Basic Information
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, enum: TenantType, required: true, index: true },

  // Contact Information
  contact: {
    primary: {
      name: String,
      title: String,
      email: String,
      phone: String,
      mobile: String
    },
    secondary: {
      name: String,
      email: String,
      phone: String
    },
    emergency: {
      name: String,
      relationship: String,
      phone: String
    }
  },

  // Identification
  identification: {
    nationalId: String, // For individuals
    companyRegistration: String, // For companies
    taxId: String,
    licenseNumber: String, // For businesses
    documents: [{
      type: String, // ID, Passport, Company Registration, etc.
      number: String,
      issued: Date,
      expires: Date,
      url: String
    }]
  },

  // Address
  address: {
    current: {
      street: String,
      city: String,
      region: String,
      postalCode: String,
      country: { type: String, default: "SA" }
    },
    permanent: {
      street: String,
      city: String,
      region: String,
      postalCode: String,
      country: { type: String, default: "SA" }
    }
  },

  // Properties/Units
  properties: [{
    propertyId: String, // Reference to Property model
    unitNumber: String,
    leaseId: String, // Reference to Lease model
    role: { type: String, enum: ["TENANT", "OWNER", "MANAGER"] },
    occupancy: {
      startDate: Date,
      endDate: Date,
      status: { type: String, enum: LeaseStatus }
    }
  }],

  // Financial Information
  financial: {
    creditScore: Number,
    paymentHistory: [{
      date: Date,
      amount: Number,
      type: String, // Rent, Deposit, Fee, etc.
      status: String, // PAID, PENDING, OVERDUE
      method: String
    }],
    outstandingBalance: Number,
    securityDeposit: Number,
    bankDetails: {
      accountNumber: String,
      bankName: String,
      iban: String
    },
    billingAddress: String
  },

  // Lease Management
  leases: [{
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
      nextRenewal: Date
    }
  }],

  // Service Requests
  serviceRequests: [{
    requestId: String, // Reference to ServiceRequest model
    type: String, // Maintenance, Complaint, etc.
    status: String, // OPEN, IN_PROGRESS, CLOSED
    priority: String, // LOW, MEDIUM, HIGH, URGENT
    created: Date,
    resolved: Date
  }],

  // Communication Preferences
  preferences: {
    communication: {
      email: Boolean,
      sms: Boolean,
      phone: Boolean,
      app: Boolean
    },
    notifications: {
      maintenance: Boolean,
      rent: Boolean,
      events: Boolean,
      announcements: Boolean
    },
    language: { type: String, default: "ar" },
    timezone: { type: String, default: "Asia/Riyadh" }
  },

  // Access Control
  access: {
    portalAccess: Boolean,
    mobileApp: Boolean,
    maintenanceRequests: Boolean,
    documentAccess: Boolean,
    paymentHistory: Boolean
  },

  // Compliance
  compliance: {
    backgroundCheck: Boolean,
    creditCheck: Boolean,
    references: [{
      name: String,
      contact: String,
      relationship: String,
      verified: Boolean
    }],
    restrictions: [String] // Pets, Smoking, etc.
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
TenantSchema.index({ tenantId: 1, type: 1 });
TenantSchema.index({ tenantId: 1, 'contact.primary.email': 1 });
TenantSchema.index({ tenantId: 1, 'properties.occupancy.status': 1 });

export type TenantDoc = InferSchemaType<typeof TenantSchema>;

// Check if we're using mock database
export const Tenant = models.Tenant || model("Tenant", TenantSchema);

