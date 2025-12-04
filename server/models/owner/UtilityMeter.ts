import { Schema, model, models, InferSchemaType, Types } from "mongoose";
import { getModel, MModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../../plugins/tenantIsolation";
import { auditPlugin } from "../../plugins/auditPlugin";

const UtilityType = [
  "ELECTRICITY",
  "WATER",
  "GAS",
  "DISTRICT_COOLING",
  "INTERNET",
  "SEWAGE",
] as const;
const MeterStatus = [
  "ACTIVE",
  "INACTIVE",
  "MAINTENANCE",
  "DISCONNECTED",
  "FAULTY",
] as const;
const MeterOwnership = ["OWNER", "UTILITY_COMPANY", "SHARED"] as const;

const UtilityMeterSchema = new Schema(
  {
    // Multi-tenancy - added by plugin
    // orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },

    // Meter Identification
    meterNumber: { type: String, required: true },
    accountNumber: String, // Utility company account number

    // Utility Type
    utilityType: {
      type: String,
      enum: UtilityType,
      required: true,
      index: true,
    },
    subType: String, // E.g., "Single Phase", "Three Phase" for electricity

    // Location
    propertyId: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      index: true,
    },
    unitNumber: String, // Specific unit, or null if building-level meter
    location: {
      building: String,
      floor: String,
      room: String,
      exactLocation: String, // E.g., "Outside main entrance", "Basement room 3"
    },

    // Meter Details
    details: {
      manufacturer: String,
      model: String,
      serialNumber: String,
      installationDate: Date,
      capacity: Number, // Maximum capacity (e.g., kW for electricity)
      unit: String, // kWh, m³, etc.
      accuracy: String, // Meter accuracy class
      digitalMeter: { type: Boolean, default: false },
      smartMeter: { type: Boolean, default: false },
      iotConnected: { type: Boolean, default: false },
    },

    // Utility Provider
    provider: {
      name: { type: String, required: true }, // SEC, SWCC, NGC, etc.
      accountHolder: String, // Name on account
      accountNumber: String,
      contactNumber: String,
      emergencyNumber: String,
      website: String,
    },

    // Billing Information
    billing: {
      billingCycle: String, // Monthly, Bi-monthly, etc.
      lastBillingDate: Date,
      nextBillingDate: Date,
      averageMonthlyConsumption: Number,
      averageMonthlyCost: Number,
      tariff: {
        type: String, // Residential, Commercial, etc.
        ratePerUnit: Number,
        currency: { type: String, default: "SAR" },
      },
    },

    // Reading Information
    lastReading: {
      value: Number,
      date: Date,
      readBy: String, // "UTILITY_COMPANY", "OWNER", "TENANT", "AUTOMATED"
      verified: { type: Boolean, default: false },
      notes: String,
    },

    // IoT Integration (for smart meters)
    iot: {
      enabled: { type: Boolean, default: false },
      deviceId: String,
      apiEndpoint: String,
      lastSyncDate: Date,
      syncFrequency: String, // "REAL_TIME", "HOURLY", "DAILY"
      credentials: {
        encrypted: { type: Boolean, default: true },
        data: String, // Encrypted API keys/tokens
      },
    },

    // OCR Configuration (for bill scanning)
    ocr: {
      enabled: { type: Boolean, default: false },
      provider: String, // "AWS_TEXTRACT", "GOOGLE_VISION", "AZURE_OCR"
      lastProcessedDate: Date,
      successRate: Number, // Percentage
      autoVerify: { type: Boolean, default: false },
    },

    // Ownership and Responsibility
    ownership: { type: String, enum: MeterOwnership, default: "OWNER" },
    responsibleParty: {
      type: {
        type: String,
        enum: ["OWNER", "TENANT", "AGENT", "PROPERTY_MANAGEMENT"],
      },
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      name: String,
      startDate: Date,
      endDate: Date,
    },

    // Maintenance History
    maintenance: {
      lastServiceDate: Date,
      nextServiceDate: Date,
      serviceProvider: String,
      serviceContract: String,
      warrantyExpiry: Date,
      calibrationDate: Date,
      nextCalibrationDate: Date,
    },

    // Alerts and Notifications
    alerts: {
      highConsumptionThreshold: Number,
      highConsumptionAlert: { type: Boolean, default: false },
      anomalyDetection: { type: Boolean, default: false },
      lastAlertDate: Date,
      alertRecipients: [{ type: Schema.Types.ObjectId, ref: "User" }],
    },

    // Status
    status: { type: String, enum: MeterStatus, default: "ACTIVE", index: true },
    statusHistory: [
      {
        status: { type: String, enum: MeterStatus },
        changedAt: { type: Date, default: Date.now },
        reason: String,
        changedBy: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],

    // Documents
    documents: [
      {
        type: String, // INSTALLATION_CERT, CALIBRATION_CERT, etc.
        name: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

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
UtilityMeterSchema.plugin(tenantIsolationPlugin);
UtilityMeterSchema.plugin(auditPlugin);

// Indexes
UtilityMeterSchema.index(
  { orgId: 1, meterNumber: 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } } },
);
UtilityMeterSchema.index({ orgId: 1, propertyId: 1, utilityType: 1 });
UtilityMeterSchema.index({ orgId: 1, utilityType: 1, status: 1 });
UtilityMeterSchema.index({ orgId: 1, accountNumber: 1 });
UtilityMeterSchema.index({ orgId: 1, "billing.nextBillingDate": 1 });

// Virtual for days until next billing
UtilityMeterSchema.virtual("daysUntilNextBilling").get(function () {
  if (!this.billing?.nextBillingDate) return null;
  const now = new Date();
  const diff = this.billing.nextBillingDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Method to record new reading
UtilityMeterSchema.methods.recordReading = function (
  value: number,
  readBy: string,
  notes?: string,
) {
  this.lastReading = {
    value,
    date: new Date(),
    readBy,
    verified: readBy === "UTILITY_COMPANY",
    notes,
  };
  return this.save();
};

// Export type and model
export type UtilityMeter = InferSchemaType<typeof UtilityMeterSchema>;
export const UtilityMeterModel = getModel<UtilityMeter>(
  "UtilityMeter",
  UtilityMeterSchema,
);
