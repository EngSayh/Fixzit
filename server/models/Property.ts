/**
 * Property Model - Core real estate asset management
 * 
 * @module server/models/Property
 * @description Represents physical properties managed across FM and Aqar modules.
 * Supports multi-tenancy, geolocation, ownership tracking, and work order linkage.
 * 
 * TODO-002 RESOLVED: FM Properties schema aligned per STRICT v4.1 Recovery Plan
 * - Added flat API fields (area, floors, lease_status) alongside nested structure
 * - mapProperty in route uses these flat fields for API responses
 * - Nested structure preserved for backward compatibility with detailed views
 * 
 * @features
 * - Multi-tenant isolation (property_owner_id per property)
 * - Geolocation with lat/lng coordinates
 * - SPL National Address support (Saudi postal system)
 * - Ownership and occupancy tracking
 * - Financial metrics (value, rental income)
 * - Unit hierarchy (properties can contain units)
 * - Work order association for maintenance
 * 
 * @types
 * - RESIDENTIAL: Houses, apartments, villas
 * - COMMERCIAL: Offices, retail spaces
 * - INDUSTRIAL: Warehouses, factories
 * - MIXED_USE: Combined residential/commercial
 * - LAND: Undeveloped plots
 * 
 * @statuses
 * - ACTIVE: Operational and available
 * - UNDER_MAINTENANCE: Temporarily unavailable
 * - VACANT: No current occupants
 * - OCCUPIED: Currently inhabited/used
 * - SOLD: Ownership transferred
 * - RENTED: Leased to tenant
 * 
 * @indexes
 * - Unique: { orgId, code }
 * - Compound: { type, status } for filtering
 * - Geospatial: { address.coordinates } for location queries
 * - Index: { property_owner_id } for ownership lookups
 * 
 * @relationships
 * - property_owner_id → Owner model
 * - units → Array of sub-properties
 * - Work orders reference property_id
 */

import { Schema, Model, InferSchemaType } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

/** Property classification types */
const PropertyType = [
  "RESIDENTIAL",
  "COMMERCIAL",
  "INDUSTRIAL",
  "MIXED_USE",
  "LAND",
] as const;

/** Property operational statuses */
const PropertyStatus = [
  "ACTIVE",
  "UNDER_MAINTENANCE",
  "VACANT",
  "OCCUPIED",
  "SOLD",
  "RENTED",
] as const;

/**
 * Property schema definition
 * 
 * @property {string} code - Unique property code (e.g., PROP-001)
 * @property {string} name - Display name/title
 * @property {string} [description] - Detailed property description
 * @property {PropertyType} type - Property classification
 * @property {string} [subtype] - Specific category (e.g., Villa, Office)
 * @property {object} address - Location details with coordinates
 * @property {number} address.coordinates.lat - Latitude (required)
 * @property {number} address.coordinates.lng - Longitude (required)
 * @property {string} [address.nationalAddress] - SPL postal code
 * @property {number} [totalArea] - Total square meters
 * @property {number} [builtUpArea] - Built area square meters
 * @property {ObjectId} property_owner_id - Owner reference
 * @property {PropertyStatus} status - Current operational status
 * @property {number} [estimatedValue] - Market value estimate
 * @property {number} [rentalIncome] - Monthly rental income
 */
const PropertySchema = new Schema(
  {
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

    // ────────────────────────────────────────────────────────────────────────
    // FLAT API FIELDS (TODO-002 Resolution)
    // These top-level fields provide flat API access expected by FM routes.
    // They coexist with the nested 'details' and 'ownership' structures.
    // ────────────────────────────────────────────────────────────────────────
    area: { type: Number }, // Total area in sqm (mirrors details.totalArea)
    floors: { type: Number }, // Number of floors (mirrors details.floors)
    lease_status: { 
      type: String, 
      enum: ["ACTIVE", "EXPIRED", "PENDING", "TERMINATED", "NONE"],
      default: "NONE"
    }, // Lease status for FM dashboards

    // Location
    address: {
      street: String,
      city: String,
      region: String,
      postalCode: String,
      country: { type: String, default: "SA" },
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
      nationalAddress: String, // SPL National Address
      district: String,
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
      occupancyRate: { type: Number, min: 0, max: 100 },
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
        remaining: Number,
      },
    },

    // Ownership
    ownership: {
      type: { type: String, enum: ["OWNED", "LEASED", "MANAGED"] },
      owner: {
        name: String,
        contact: String,
        id: String, // National ID or Company Registration
      },
      lease: {
        startDate: Date,
        endDate: Date,
        monthlyRent: Number,
        landlord: String,
      },
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
      currentAdvertisementId: {
        type: Schema.Types.ObjectId,
        ref: "Advertisement",
      },
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
        monthlyStatementEnabled: { type: Boolean, default: true },
      },
    },

    // Units/Spaces
    units: [
      {
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
          monthlyRent: Number,
        },
        amenities: [String],
      },
    ],

    // Assets
    assets: [
      {
        assetId: String, // Reference to Asset model
        location: String, // Building/Floor/Room
        installedDate: Date,
        status: String,
      },
    ],

    // Maintenance
    maintenance: {
      lastInspection: Date,
      nextInspection: Date,
      issues: [
        {
          type: String,
          severity: String,
          reported: Date,
          resolved: Boolean,
          workOrderId: String,
        },
      ],
    },

    // Compliance
    compliance: {
      buildingPermit: String,
      occupancyCertificate: String,
      fireSafety: {
        certificate: String,
        expiry: Date,
        lastInspection: Date,
      },
      insurance: {
        provider: String,
        policyNumber: String,
        expiry: Date,
        coverage: Number,
      },
    },

    // Features & Amenities
    features: {
      amenities: [String], // Pool, Gym, Parking, Security, etc.
      utilities: {
        electricity: String,
        water: String,
        gas: String,
        internet: String,
      },
      accessibility: {
        elevator: Boolean,
        ramp: Boolean,
        parking: Boolean,
      },
    },

    // Market Information
    market: {
      listingPrice: Number,
      marketValue: Number,
      priceHistory: [
        {
          date: Date,
          price: Number,
          event: String, // Listed, Sold, Appraised
        },
      ],
      comparableProperties: [String], // Property codes
    },

    // Documents
    documents: [
      {
        type: String, // Title Deed, Lease, Permit, etc.
        number: String,
        issued: Date,
        expires: Date,
        url: String,
        status: String, // VALID, EXPIRED, PENDING
      },
    ],

    // Metadata
    tags: [String],
    customFields: Schema.Types.Mixed,
    // createdBy, updatedBy, createdAt, updatedAt will be added by auditPlugin
  },
  {
    timestamps: true,
    // Indexes are managed centrally in lib/db/collections.ts to prevent
    // IndexOptionsConflict; disable automatic schema index creation.
    autoIndex: false,
  },
);

// Apply plugins BEFORE indexes for proper tenant isolation and audit tracking
PropertySchema.plugin(tenantIsolationPlugin, { uniqueTenantFields: ["code"] });
PropertySchema.plugin(auditPlugin);

// All Property indexes live in lib/db/collections.ts (createIndexes()) to keep
// a single source of truth. Avoid adding schema-level indexes here.

export type PropertyDoc = InferSchemaType<typeof PropertySchema>;

export const Property: Model<PropertyDoc> = getModel<PropertyDoc>(
  "Property",
  PropertySchema,
);
