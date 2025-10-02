import { Schema, model, models, InferSchemaType } from "mongoose";

// Asset types for equipment registry
const AssetType = ["HVAC", "ELECTRICAL", "PLUMBING", "SECURITY", "ELEVATOR", "GENERATOR", "FIRE_SYSTEM", "IT_EQUIPMENT", "VEHICLE", "OTHER"] as const;

const MaintenanceType = ["PREVENTIVE", "CORRECTIVE", "PREDICTIVE", "INSPECTION"] as const;

const AssetSchema = new Schema({
  tenantId: { type: String, required: true, index: true },

  // Basic Information
  code: { type: String, required: true, unique: true }, // Asset ID
  name: { type: String, required: true },
  description: { type: String },

  // Classification
  type: { type: String, enum: AssetType, required: true, index: true },
  category: { type: String, required: true }, // Subcategory
  manufacturer: { type: String },
  model: { type: String },
  serialNumber: { type: String },

  // Location
  propertyId: { type: String, required: true, index: true }, // Reference to Property model
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
    default: "ACTIVE",
    index: true
  },
  criticality: {
    type: String,
    enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    default: "MEDIUM",
    index: true
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
  customFields: Schema.Types.Mixed,

  createdBy: { type: String, required: true },
  updatedBy: String
}, {
  timestamps: true
});

// Indexes for performance
AssetSchema.index({ tenantId: 1, type: 1 });
AssetSchema.index({ tenantId: 1, status: 1 });
AssetSchema.index({ tenantId: 1, 'pmSchedule.nextPM': 1 });
AssetSchema.index({ tenantId: 1, 'condition.score': 1 });

export type AssetDoc = InferSchemaType<typeof AssetSchema>;

export const Asset = models.Asset || model("Asset", AssetSchema);

