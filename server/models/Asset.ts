/**
 * Asset Model - Equipment and facility asset tracking
 * 
 * @module server/models/Asset
 * @description Manages physical assets (HVAC, elevators, equipment) across properties.
 * Supports preventive maintenance scheduling, depreciation, warranty tracking.
 * 
 * @features
 * - Multi-tenant isolation per organization
 * - Equipment lifecycle management
 * - Preventive maintenance scheduling
 * - Warranty and service contract tracking
 * - Location tracking (property/unit assignment)
 * - Depreciation calculation
 * - Maintenance history linkage
 * - QR code asset tagging
 * 
 * @types
 * - HVAC: Heating, ventilation, air conditioning systems
 * - ELECTRICAL: Electrical panels, transformers
 * - PLUMBING: Water systems, pumps
 * - SECURITY: Cameras, access control
 * - ELEVATOR: Elevators and lifts
 * - GENERATOR: Backup power generators
 * - FIRE_SYSTEM: Fire alarms, sprinklers
 * - IT_EQUIPMENT: Servers, networking equipment
 * - VEHICLE: Company vehicles
 * - OTHER: Miscellaneous equipment
 * 
 * @maintenance_types
 * - PREVENTIVE: Scheduled routine maintenance
 * - CORRECTIVE: Repair after failure
 * - PREDICTIVE: Condition-based maintenance
 * - INSPECTION: Regular safety inspections
 * 
 * @indexes
 * - Unique: { orgId, code } - Tenant-scoped asset codes
 * - Index: { property_id } for property asset lookups
 * - Index: { type } for equipment category filtering
 * - Index: { nextMaintenanceDate } for PM scheduling
 * 
 * @relationships
 * - property_id → Property model
 * - unit_id → Property model (specific unit)
 * - WorkOrder records reference asset_id
 * - MaintenanceSchedule references asset_id
 * 
 * @audit
 * - Maintenance history tracked
 * - Status changes logged
 * - Location transfers recorded
 */

import { Schema, model, models, InferSchemaType, Model } from "mongoose";
import { getModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

/** Asset types for equipment registry */
const AssetType = [
  "HVAC",
  "ELECTRICAL",
  "PLUMBING",
  "SECURITY",
  "ELEVATOR",
  "GENERATOR",
  "FIRE_SYSTEM",
  "IT_EQUIPMENT",
  "VEHICLE",
  "OTHER",
] as const;

/** Maintenance strategy types */
const MaintenanceType = [
  "PREVENTIVE",
  "CORRECTIVE",
  "PREDICTIVE",
  "INSPECTION",
] as const;

const AssetSchema = new Schema(
  {
    // tenantId will be added by tenantIsolationPlugin

    // Basic Information
    // ⚡ FIXED: Remove unique: true - will be enforced via compound index with tenantId
    code: { type: String, required: true }, // Asset ID
    name: { type: String, required: true },
    description: { type: String },

    // Classification
    type: { type: String, enum: AssetType, required: true },
    category: { type: String, required: true }, // Subcategory
    manufacturer: { type: String },
    model: { type: String },
    serialNumber: { type: String },

    // Location
    propertyId: { type: String, required: true }, // Reference to Property model
    location: {
      building: String,
      floor: String,
      room: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },

    // Technical Specifications
    specs: {
      capacity: String,
      powerRating: String,
      voltage: String,
      current: String,
      frequency: String,
      dimensions: String,
      weight: String,
    },

    // Financial Information
    purchase: {
      date: { type: Date },
      cost: { type: Number },
      supplier: String,
      warranty: {
        period: Number, // months
        expiry: Date,
        terms: String,
      },
    },

    // Lifecycle Management
    status: {
      type: String,
      enum: ["ACTIVE", "MAINTENANCE", "OUT_OF_SERVICE", "DECOMMISSIONED"],
      default: "ACTIVE",
    },
    criticality: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
    },

    // Maintenance History
    maintenanceHistory: [
      {
        type: { type: String, enum: MaintenanceType },
        date: Date,
        description: String,
        technician: String,
        cost: Number,
        workOrderId: String, // Reference to WorkOrder
        nextDue: Date,
        notes: String,
      },
    ],

    // Preventive Maintenance
    pmSchedule: {
      frequency: Number, // days between PM
      lastPM: Date,
      nextPM: Date,
      tasks: [String], // PM checklist items
    },

    // Predictive Maintenance
    condition: {
      score: { type: Number, min: 0, max: 100 }, // 0-100 health score
      lastAssessment: Date,
      nextAssessment: Date,
      sensors: [
        {
          type: String, // Temperature, Vibration, Pressure, etc.
          location: String,
          thresholds: {
            min: Number,
            max: Number,
            critical: Number,
          },
          readings: [
            {
              value: Number,
              timestamp: Date,
              status: String, // NORMAL, WARNING, CRITICAL
            },
          ],
        },
      ],
      alerts: [
        {
          type: String, // PREDICTIVE, THRESHOLD, FAILURE
          message: String,
          timestamp: Date,
          resolved: Boolean,
        },
      ],
    },

    // Financial Tracking
    depreciation: {
      method: { type: String, enum: ["STRAIGHT_LINE", "DECLINING_BALANCE"] },
      rate: Number, // Annual depreciation rate
      accumulated: Number,
      bookValue: Number,
      salvageValue: Number,
    },

    // Compliance
    compliance: {
      inspections: [
        {
          type: String, // Annual, Quarterly, etc.
          required: Boolean,
          lastDate: Date,
          nextDue: Date,
          status: String, // DUE, OVERDUE, COMPLETED
        },
      ],
      certificates: [
        {
          type: String, // Safety, Environmental, etc.
          issued: Date,
          expires: Date,
          status: String, // VALID, EXPIRED, PENDING
        },
      ],
    },

    // Metadata
    tags: [String],
    customFields: Schema.Types.Mixed,
    // createdBy, updatedBy, createdAt, updatedAt will be added by auditPlugin
  },
  {
    timestamps: true,
    // Indexes are managed centrally in lib/db/collections.ts
    autoIndex: false,
  },
);

// Apply plugins BEFORE indexes for proper tenant isolation and audit tracking
AssetSchema.plugin(tenantIsolationPlugin);
AssetSchema.plugin(auditPlugin);

// Schema-level indexes to mirror centralized createIndexes() definitions
AssetSchema.index({ orgId: 1, type: 1 }, { name: "assets_orgId_type" });
AssetSchema.index({ orgId: 1, status: 1 }, { name: "assets_orgId_status" });
AssetSchema.index(
  { orgId: 1, "pmSchedule.nextPM": 1 },
  { name: "assets_orgId_nextPM" },
);
AssetSchema.index(
  { orgId: 1, "condition.score": 1 },
  { name: "assets_orgId_conditionScore" },
);
AssetSchema.index(
  { orgId: 1, code: 1 },
  {
    unique: true,
    name: "assets_orgId_code_unique",
    partialFilterExpression: { orgId: { $exists: true }, code: { $exists: true } },
  },
);

export type AssetDoc = InferSchemaType<typeof AssetSchema>;

// Export model with singleton pattern for production, recreation for tests
export const Asset: Model<AssetDoc> = getModel<AssetDoc>("Asset", AssetSchema);
