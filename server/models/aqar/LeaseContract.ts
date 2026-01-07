/**
 * LeaseContract Model - Ejar-integrated lease contract management
 * 
 * @module server/models/aqar/LeaseContract
 * @description Lease contract wizard and management for Ejar integration.
 * Supports residential and commercial contracts with multi-step wizard.
 * 
 * @features
 * - Multi-tenant isolation per organization
 * - Multi-step wizard state management
 * - Document upload tracking
 * - Ejar reference integration
 * - Payment status tracking
 * - Contract lifecycle management
 * 
 * @indexes
 * - { org_id, status } - Contract list queries
 * - { org_id, property_id } - Property contract lookup
 * - { ejar_reference } - Government reference lookup
 */

import { Schema, model, models, Types, Document } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";
import { auditPlugin } from "@/server/plugins/auditPlugin";

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const ContractType = {
  RESIDENTIAL: "residential",
  COMMERCIAL: "commercial",
} as const;

export const LessorType = {
  OWNER: "owner",
  AGENT: "agent",
} as const;

export const ContractStatus = {
  DRAFT: "draft",
  PENDING_DOCUMENTS: "pending_documents",
  PENDING_INFO: "pending_info",
  PENDING_PAYMENT: "pending_payment",
  PENDING_REVIEW: "pending_review",
  PENDING_LICENSE: "pending_license",
  LICENSED: "licensed",
  EXPIRED: "expired",
  TERMINATED: "terminated",
  REJECTED: "rejected",
} as const;

export const PaymentFrequency = {
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  SEMI_ANNUAL: "semi_annual",
  ANNUAL: "annual",
} as const;

export type ContractTypeValue = (typeof ContractType)[keyof typeof ContractType];
export type LessorTypeValue = (typeof LessorType)[keyof typeof LessorType];
export type ContractStatusValue = (typeof ContractStatus)[keyof typeof ContractStatus];
export type PaymentFrequencyValue = (typeof PaymentFrequency)[keyof typeof PaymentFrequency];

// ============================================================================
// SUB-SCHEMAS
// ============================================================================

const OwnershipDocumentSchema = new Schema(
  {
    deed_url: String,
    deed_number: String,
    power_of_attorney_url: String,
    commercial_registration_url: String,
    commercial_registration_number: String,
    verified: { type: Boolean, default: false },
    verified_at: Date,
  },
  { _id: false }
);

const ContractPartySchema = new Schema(
  {
    name: { type: String, required: true },
    name_ar: String,
    national_id: { type: String, required: true },
    phone: { type: String, required: true },
    email: String,
    address: String,
    nationality: String,
    iqama_number: String, // For non-Saudi residents
  },
  { _id: false }
);

const PropertyDetailsSchema = new Schema(
  {
    type: { type: String, required: true },
    type_ar: String,
    address: { type: String, required: true },
    address_ar: String,
    city: { type: String, required: true },
    district: String,
    neighborhood: String,
    area_sqm: { type: Number, required: true },
    rooms: Number,
    bathrooms: Number,
    floor_number: Number,
    building_number: String,
    unit_number: String,
    postal_code: String,
    additional_info: String,
  },
  { _id: false }
);

const RentalInfoSchema = new Schema(
  {
    annual_rent: { type: Number, required: true },
    payment_frequency: {
      type: String,
      enum: Object.values(PaymentFrequency),
      default: PaymentFrequency.ANNUAL,
    },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    deposit: Number,
    utilities_included: { type: Boolean, default: false },
    electricity_account: String,
    water_account: String,
    maintenance_included: { type: Boolean, default: false },
    maintenance_details: String,
    special_conditions: String,
  },
  { _id: false }
);

// ============================================================================
// INTERFACES
// ============================================================================

export interface ILeaseContract extends Document {
  org_id: Types.ObjectId;
  created_by: Types.ObjectId;
  
  // Contract Type
  contract_type: ContractTypeValue;
  ejar_reference?: string;
  
  // Ownership
  lessor_type: LessorTypeValue;
  ownership_document: {
    deed_url?: string;
    deed_number?: string;
    power_of_attorney_url?: string;
    commercial_registration_url?: string;
    commercial_registration_number?: string;
    verified?: boolean;
    verified_at?: Date;
  };
  
  // Parties
  lessor: {
    name: string;
    name_ar?: string;
    national_id: string;
    phone: string;
    email?: string;
    address?: string;
    nationality?: string;
    iqama_number?: string;
  };
  lessee: {
    name: string;
    name_ar?: string;
    national_id: string;
    phone: string;
    email?: string;
    address?: string;
    nationality?: string;
    iqama_number?: string;
  };
  
  // Property
  property_id?: Types.ObjectId;
  property_details: {
    type: string;
    type_ar?: string;
    address: string;
    address_ar?: string;
    city: string;
    district?: string;
    neighborhood?: string;
    area_sqm: number;
    rooms?: number;
    bathrooms?: number;
    floor_number?: number;
    building_number?: string;
    unit_number?: string;
    postal_code?: string;
    additional_info?: string;
  };
  
  // Rental Terms
  rental_info: {
    annual_rent: number;
    payment_frequency: PaymentFrequencyValue;
    start_date: Date;
    end_date: Date;
    deposit?: number;
    utilities_included: boolean;
    electricity_account?: string;
    water_account?: string;
    maintenance_included: boolean;
    maintenance_details?: string;
    special_conditions?: string;
  };
  
  // Wizard State
  current_step: number;
  completed_steps: number[];
  
  // Status & Payment
  status: ContractStatusValue;
  service_fee: number;
  payment_status: "pending" | "paid" | "refunded";
  payment_reference?: string;
  
  // Timestamps
  created_at: Date;
  updated_at: Date;
  submitted_at?: Date;
  licensed_at?: Date;
  expires_at?: Date;
  
  // Rejection/Termination
  rejection_reason?: string;
  termination_reason?: string;
  terminated_at?: Date;
  
  // Audit
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
}

// ============================================================================
// SCHEMA
// ============================================================================

const LeaseContractSchema = new Schema<ILeaseContract>(
  {
    org_id: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    
    // Contract Type
    contract_type: {
      type: String,
      required: true,
      enum: Object.values(ContractType),
    },
    ejar_reference: {
      type: String,
      sparse: true,
    },
    
    // Ownership
    lessor_type: {
      type: String,
      required: true,
      enum: Object.values(LessorType),
    },
    ownership_document: {
      type: OwnershipDocumentSchema,
      default: {},
    },
    
    // Parties
    lessor: {
      type: ContractPartySchema,
    },
    lessee: {
      type: ContractPartySchema,
    },
    
    // Property
    property_id: {
      type: Schema.Types.ObjectId,
      ref: "PropertyListing",
    },
    property_details: {
      type: PropertyDetailsSchema,
    },
    
    // Rental Terms
    rental_info: {
      type: RentalInfoSchema,
    },
    
    // Wizard State
    current_step: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },
    completed_steps: {
      type: [Number],
      default: [],
    },
    
    // Status & Payment
    status: {
      type: String,
      required: true,
      enum: Object.values(ContractStatus),
      default: ContractStatus.DRAFT,
    },
    service_fee: {
      type: Number,
      required: true,
      default: 249, // SAR
    },
    payment_status: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending",
    },
    payment_reference: String,
    
    // Timestamps
    submitted_at: Date,
    licensed_at: Date,
    expires_at: Date,
    
    // Rejection/Termination
    rejection_reason: String,
    termination_reason: String,
    terminated_at: Date,
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    collection: "lease_contracts",
  }
);

// ============================================================================
// INDEXES
// ============================================================================

LeaseContractSchema.index({ org_id: 1, status: 1 });
LeaseContractSchema.index({ org_id: 1, property_id: 1 });
LeaseContractSchema.index({ ejar_reference: 1 }, { sparse: true });
LeaseContractSchema.index({ org_id: 1, created_at: -1 });
LeaseContractSchema.index({ org_id: 1, created_by: 1, status: 1 });

// ============================================================================
// PLUGINS
// ============================================================================

LeaseContractSchema.plugin(tenantIsolationPlugin);
LeaseContractSchema.plugin(auditPlugin);

// ============================================================================
// VIRTUALS
// ============================================================================

/**
 * Contract duration in months
 */
LeaseContractSchema.virtual("durationMonths").get(function () {
  if (!this.rental_info?.start_date || !this.rental_info?.end_date) return 0;
  const start = new Date(this.rental_info.start_date);
  const end = new Date(this.rental_info.end_date);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
});

/**
 * Monthly rent calculation
 */
LeaseContractSchema.virtual("monthlyRent").get(function () {
  if (!this.rental_info?.annual_rent) return 0;
  return Math.round(this.rental_info.annual_rent / 12);
});

/**
 * Is contract active (licensed and not expired/terminated)
 */
LeaseContractSchema.virtual("isActive").get(function () {
  if (this.status !== ContractStatus.LICENSED) return false;
  if (this.expires_at && new Date() > this.expires_at) return false;
  return true;
});

// ============================================================================
// STATICS
// ============================================================================

/**
 * Get pricing for contract type
 */
LeaseContractSchema.statics.getPricing = function (type: ContractTypeValue): number {
  const pricing: Record<ContractTypeValue, number> = {
    residential: 249,
    commercial: 449,
  };
  return pricing[type] || 249;
};

/**
 * Get step count for contract type
 */
LeaseContractSchema.statics.getStepCount = function (type: ContractTypeValue): number {
  const steps: Record<ContractTypeValue, number> = {
    residential: 5,
    commercial: 4,
  };
  return steps[type] || 5;
};

// ============================================================================
// MODEL EXPORT
// ============================================================================

export const LeaseContract = getModel<ILeaseContract>("LeaseContract", LeaseContractSchema);
export default LeaseContract;
