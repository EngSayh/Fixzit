import { Schema, model, models, InferSchemaType, Model } from 'mongoose';
import { getModel, MModel } from '@/src/types/mongoose-compat';
import { tenantIsolationPlugin } from '../plugins/tenantIsolation';
import { auditPlugin } from '../plugins/auditPlugin';

// Asset types for equipment registry
const AssetType = ["HVAC", "ELECTRICAL", "PLUMBING", "SECURITY", "ELEVATOR", "GENERATOR", "FIRE_SYSTEM", "IT_EQUIPMENT", "VEHICLE", "OTHER"] as const;

const MaintenanceType = ["PREVENTIVE", "CORRECTIVE", "PREDICTIVE", "INSPECTION"] as const;

const AssetSchema = new Schema({
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
      lng: Number
    }
  },

  // Technical Specifications
  specs: {
    capacity: String,
    powerRating: String,
    voltage: String,
    current: String,
    frequency: String,
    dimensions: String,
    weight: String
  },

  // Financial Information
  purchase: {
    date: { type: Date },
    cost: { type: Number },
    supplier: String,
    warranty: {
      period: Number, // months
      expiry: Date,
      terms: String
    }
  },

  // Lifecycle Management
  status: {
    type: String,
    enum: ["ACTIVE", "MAINTENANCE", "OUT_OF_SERVICE", "DECOMMISSIONED"],
    default: "ACTIVE"
  },
  criticality: {
    type: String,
    enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    default: "MEDIUM"
  },

  // Maintenance History
  maintenanceHistory: [{
    type: { type: String, enum: MaintenanceType },
    date: Date,
    description: String,
    technician: String,
    cost: Number,
    workOrderId: String, // Reference to WorkOrder
    nextDue: Date,
    notes: String
  }],

  // Preventive Maintenance
  pmSchedule: {
    frequency: Number, // days between PM
    lastPM: Date,
    nextPM: Date,
    tasks: [String] // PM checklist items
  },

  // Predictive Maintenance
  condition: {
    score: { type: Number, min: 0, max: 100 }, // 0-100 health score
    lastAssessment: Date,
    nextAssessment: Date,
    sensors: [{
      type: String, // Temperature, Vibration, Pressure, etc.
      location: String,
      thresholds: {
        min: Number,
        max: Number,
        critical: Number
      },
      readings: [{
        value: Number,
        timestamp: Date,
        status: String // NORMAL, WARNING, CRITICAL
      }]
    }],
    alerts: [{
      type: String, // PREDICTIVE, THRESHOLD, FAILURE
      message: String,
      timestamp: Date,
      resolved: Boolean
    }]
  },

  // Financial Tracking
  depreciation: {
    method: { type: String, enum: ["STRAIGHT_LINE", "DECLINING_BALANCE"] },
    rate: Number, // Annual depreciation rate
    accumulated: Number,
    bookValue: Number,
    salvageValue: Number
  },

  // Compliance
  compliance: {
    inspections: [{
      type: String, // Annual, Quarterly, etc.
      required: Boolean,
      lastDate: Date,
      nextDue: Date,
      status: String // DUE, OVERDUE, COMPLETED
    }],
    certificates: [{
      type: String, // Safety, Environmental, etc.
      issued: Date,
      expires: Date,
      status: String // VALID, EXPIRED, PENDING
    }]
  },

  // Metadata
  tags: [String],
  customFields: Schema.Types.Mixed
  // createdBy, updatedBy, createdAt, updatedAt will be added by auditPlugin
}, {
  timestamps: true
});

// Apply plugins BEFORE indexes for proper tenant isolation and audit tracking
AssetSchema.plugin(tenantIsolationPlugin);
AssetSchema.plugin(auditPlugin);

// Indexes for performance (orgId added by plugin)
AssetSchema.index({ orgId: 1, type: 1 });
AssetSchema.index({ orgId: 1, status: 1 });
AssetSchema.index({ orgId: 1, 'pmSchedule.nextPM': 1 });
AssetSchema.index({ orgId: 1, 'condition.score': 1 });
// Compound tenant-scoped unique index for code
AssetSchema.index({ orgId: 1, code: 1 }, { unique: true });

export type AssetDoc = InferSchemaType<typeof AssetSchema>;

// Export model with singleton pattern for production, recreation for tests
export const Asset: Model<AssetDoc> = getModel<AssetDoc>("Asset", AssetSchema);
