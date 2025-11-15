import { Schema, model, models, InferSchemaType } from "mongoose";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

const PropertyType = ["RESIDENTIAL", "COMMERCIAL", "INDUSTRIAL", "MIXED_USE", "LAND"] as const;
const PropertyStatus = ["ACTIVE", "UNDER_MAINTENANCE", "VACANT", "OCCUPIED", "SOLD", "RENTED"] as const;

const PropertySchema = new Schema({
  // Multi-tenancy - will be added by plugin
  // orgId: { type: String, required: true, index: true },

  // Basic Information
  // ⚡ FIXED: Remove unique: true - will be enforced via compound index with orgId
  code: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },

  // Classification
  type: { type: String, enum: PropertyType, required: true },
  subtype: { type: String }, // Apartment, Villa, Office, Retail, etc.

  // Location
  address: {
    street: String,
    city: String,
    region: String,
    postalCode: String,
    country: { type: String, default: "SA" },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    nationalAddress: String, // SPL National Address
    district: String
  },

  // Property Details
  details: {
    totalArea: Number, // sqm
    builtArea: Number, // sqm
    bedrooms: Number,
    bathrooms: Number,
    floors: Number,
    parkingSpaces: Number,
    yearBuilt: Number,
    completionDate: Date,
    occupancyRate: { type: Number, min: 0, max: 100 }
  },

  // Financial Information
  financial: {
    purchasePrice: Number,
    currentValue: Number,
    monthlyRent: Number,
    annualYield: Number,
    mortgage: {
      amount: Number,
      monthlyPayment: Number,
      interestRate: Number,
      remaining: Number
    }
  },

  // Ownership
  ownership: {
    type: { type: String, enum: ["OWNED", "LEASED", "MANAGED"] },
    owner: {
      name: String,
      contact: String,
      id: String // National ID or Company Registration
    },
    lease: {
      startDate: Date,
      endDate: Date,
      monthlyRent: Number,
      landlord: String
    }
  },

  // Owner Portal Integration
  ownerPortal: {
    ownerId: { type: Schema.Types.ObjectId, ref: "Owner" },
    ownerNickname: String, // Friendly name given by owner
    
    // Real Estate Agent Assignment
    agentId: { type: Schema.Types.ObjectId, ref: "User" },
    agentContractId: { type: Schema.Types.ObjectId, ref: "AgentContract" },
    agentAssignedDate: Date,
    
    // Advertisement
    currentAdvertisementId: { type: Schema.Types.ObjectId, ref: "Advertisement" },
    advertisementNumber: String, // Government-issued number
    advertisementExpiry: Date,
    
    // Subscription & Access
    subscriptionTier: { type: String, enum: ["BASIC", "PRO", "ENTERPRISE"] },
    enabledFeatures: [String], // UTILITIES_TRACKING, ROI_ANALYTICS, etc.
    
    // Portal Preferences
    preferences: {
      autoApproveMaintenanceUnder: Number,
      requireOwnerApprovalForContracts: { type: Boolean, default: true },
      weeklyReportEnabled: { type: Boolean, default: true },
      monthlyStatementEnabled: { type: Boolean, default: true }
    }
  },

  // Units/Spaces
  units: [{
    unitNumber: String,
    type: String, // Apartment, Office, Retail, etc.
    area: Number,
    bedrooms: Number,
    bathrooms: Number,
    status: { type: String, enum: PropertyStatus },
    tenant: {
      name: String,
      contact: String,
      leaseStart: Date,
      leaseEnd: Date,
      monthlyRent: Number
    },
    amenities: [String]
  }],

  // Assets
  assets: [{
    assetId: String, // Reference to Asset model
    location: String, // Building/Floor/Room
    installedDate: Date,
    status: String
  }],

  // Maintenance
  maintenance: {
    lastInspection: Date,
    nextInspection: Date,
    issues: [{
      type: String,
      severity: String,
      reported: Date,
      resolved: Boolean,
      workOrderId: String
    }]
  },

  // Compliance
  compliance: {
    buildingPermit: String,
    occupancyCertificate: String,
    fireSafety: {
      certificate: String,
      expiry: Date,
      lastInspection: Date
    },
    insurance: {
      provider: String,
      policyNumber: String,
      expiry: Date,
      coverage: Number
    }
  },

  // Features & Amenities
  features: {
    amenities: [String], // Pool, Gym, Parking, Security, etc.
    utilities: {
      electricity: String,
      water: String,
      gas: String,
      internet: String
    },
    accessibility: {
      elevator: Boolean,
      ramp: Boolean,
      parking: Boolean
    }
  },

  // Market Information
  market: {
    listingPrice: Number,
    marketValue: Number,
    priceHistory: [{
      date: Date,
      price: Number,
      event: String // Listed, Sold, Appraised
    }],
    comparableProperties: [String] // Property codes
  },

  // Documents
  documents: [{
    type: String, // Title Deed, Lease, Permit, etc.
    number: String,
    issued: Date,
    expires: Date,
    url: String,
    status: String // VALID, EXPIRED, PENDING
  }],

  // Metadata
  tags: [String],
  customFields: Schema.Types.Mixed
  // createdBy, updatedBy, createdAt, updatedAt will be added by auditPlugin
}, {
  timestamps: true
});

// Apply plugins BEFORE indexes for proper tenant isolation and audit tracking
PropertySchema.plugin(tenantIsolationPlugin);
PropertySchema.plugin(auditPlugin);

// Indexes for performance (orgId from plugin)
PropertySchema.index({ orgId: 1, type: 1 });
PropertySchema.index({ orgId: 1, 'address.city': 1 });
PropertySchema.index({ orgId: 1, 'units.status': 1 });
PropertySchema.index({ 'address.coordinates': '2dsphere' });
// Compound tenant-scoped unique index for code
PropertySchema.index({ orgId: 1, code: 1 }, { unique: true });

export type PropertyDoc = InferSchemaType<typeof PropertySchema>;

export const Property: Model<PropertyDoc> = getModel<PropertyDoc>('Property', PropertySchema);
