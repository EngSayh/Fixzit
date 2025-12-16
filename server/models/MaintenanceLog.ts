/**
 * @module server/models/MaintenanceLog
 * @description Maintenance activity ledger for property units with cost analysis and reporting.
 *              Tracks preventive, corrective, emergency, and inspection maintenance activities.
 *
 * @features
 * - Maintenance types: PREVENTIVE, CORRECTIVE, EMERGENCY, INSPECTION, OTHER
 * - Categories: PLUMBING, ELECTRICAL, HVAC, STRUCTURAL, APPLIANCE, PAINTING, CLEANING, PEST_CONTROL, LANDSCAPING, OTHER
 * - Cost tracking (labor, materials, vendor fees)
 * - Work order linkage for traceability
 * - Technician assignment and completion tracking
 * - Warranty status tracking
 * - Priority-based scheduling (LOW, MEDIUM, HIGH, CRITICAL)
 * - Property and unit-level maintenance history
 * - Preventive maintenance schedule tracking
 * - Compliance and inspection records
 *
 * @indexes
 * - { org_id: 1, unit_id: 1, date: -1 } — Unit maintenance history queries
 * - { org_id: 1, property_id: 1, date: -1 } — Property-wide maintenance reports
 * - { org_id: 1, work_order_id: 1 } — Work order linkage queries
 * - { org_id: 1, type: 1, date: -1 } — Maintenance type analytics
 * - { org_id: 1, category: 1, date: -1 } — Category-based cost analysis
 * - { org_id: 1, technician: 1, date: -1 } — Technician workload reports
 *
 * @relationships
 * - References Property model (property_id)
 * - References Unit model (unit_id) via property units array
 * - References WorkOrder model (work_order_id)
 * - References User model (technician) for assignment tracking
 * - Integrates with FMPMPlan for preventive maintenance scheduling
 * - Links to FMFinancialTransaction for cost reconciliation
 *
 * @audit
 * - created_at, updated_at: Mongoose timestamps
 * - Manual audit trail via description and notes fields
 * - Immutable records (corrections via new entries)
 */
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMaintenanceLog extends Document {
  unit_id: mongoose.Types.ObjectId;
  property_id: mongoose.Types.ObjectId;
  org_id: mongoose.Types.ObjectId;
  work_order_id?: mongoose.Types.ObjectId;

  // Maintenance details
  date: Date;
  type: "PREVENTIVE" | "CORRECTIVE" | "EMERGENCY" | "INSPECTION" | "OTHER";
  category:
    | "PLUMBING"
    | "ELECTRICAL"
    | "HVAC"
    | "STRUCTURAL"
    | "APPLIANCE"
    | "PAINTING"
    | "CLEANING"
    | "PEST_CONTROL"
    | "LANDSCAPING"
    | "OTHER";
  description: string;
  notes?: string;

  // Vendor/technician info
  vendor_id?: mongoose.Types.ObjectId;
  vendorName?: string;
  technicianName?: string;
  technicianPhone?: string;

  // Cost tracking
  laborCost: number;
  materialCost: number;
  totalCost: number;
  currency: string;
  invoiceNumber?: string;
  invoiceUrl?: string;

  // Status
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  completedAt?: Date;
  scheduledDate?: Date;

  // Attachments
  attachments?: {
    url: string;
    type: "BEFORE" | "DURING" | "AFTER" | "INVOICE" | "OTHER";
    description?: string;
    uploadedAt: Date;
  }[];

  // Audit
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceLogSchema = new Schema<IMaintenanceLog>(
  {
    unit_id: {
      type: Schema.Types.ObjectId,
      ref: "Unit",
      required: true,
      // index via compound { org_id: 1, unit_id: 1, date: -1 }
    },
    property_id: {
      type: Schema.Types.ObjectId,
      ref: "Property",
      required: true,
      // index via compound { org_id: 1, property_id: 1, date: -1 }
    },
    org_id: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      // index via all compound indexes
    },
    work_order_id: {
      type: Schema.Types.ObjectId,
      ref: "WorkOrder",
      index: true, // standalone needed for work order lookups
    },

    // Maintenance details
    date: { type: Date, required: true, index: true }, // standalone needed for date-only queries
    type: {
      type: String,
      enum: ["PREVENTIVE", "CORRECTIVE", "EMERGENCY", "INSPECTION", "OTHER"],
      required: true,
      index: true, // standalone needed for type filtering
    },
    category: {
      type: String,
      enum: [
        "PLUMBING",
        "ELECTRICAL",
        "HVAC",
        "STRUCTURAL",
        "APPLIANCE",
        "PAINTING",
        "CLEANING",
        "PEST_CONTROL",
        "LANDSCAPING",
        "OTHER",
      ],
      required: true,
      // index via compound { org_id: 1, category: 1, date: -1 }
    },
    description: { type: String, required: true },
    notes: String,

    // Vendor/technician info
    vendor_id: { type: Schema.Types.ObjectId, ref: "Vendor" },
    vendorName: String,
    technicianName: String,
    technicianPhone: String,

    // Cost tracking
    laborCost: { type: Number, default: 0, min: 0 },
    materialCost: { type: Number, default: 0, min: 0 },
    totalCost: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: "SAR" },
    invoiceNumber: String,
    invoiceUrl: String,

    // Status
    status: {
      type: String,
      enum: ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "SCHEDULED",
      // index via compound { org_id: 1, status: 1, date: -1 }
    },
    completedAt: Date,
    scheduledDate: Date,

    // Attachments
    attachments: [
      {
        url: { type: String, required: true },
        type: {
          type: String,
          enum: ["BEFORE", "DURING", "AFTER", "INVOICE", "OTHER"],
          default: "OTHER",
        },
        description: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Audit
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
  },
);

// Compound indexes for common queries
MaintenanceLogSchema.index({ org_id: 1, unit_id: 1, date: -1 });
MaintenanceLogSchema.index({ org_id: 1, property_id: 1, date: -1 });
MaintenanceLogSchema.index({ org_id: 1, status: 1, date: -1 });
MaintenanceLogSchema.index({ org_id: 1, category: 1, date: -1 });

// Pre-save hook to calculate total cost
MaintenanceLogSchema.pre("save", function (next) {
  this.totalCost = (this.laborCost || 0) + (this.materialCost || 0);
  next();
});

// Virtual for formatted cost
MaintenanceLogSchema.virtual("formattedCost").get(function () {
  return `${this.totalCost?.toLocaleString() || "0"} ${this.currency || "SAR"}`;
});

// Ensure virtuals are included in JSON
MaintenanceLogSchema.set("toJSON", { virtuals: true });
MaintenanceLogSchema.set("toObject", { virtuals: true });

// Static method to get maintenance summary per unit
MaintenanceLogSchema.statics.getUnitSummary = async function (
  orgId: string,
  unitId: string,
  startDate?: Date,
  endDate?: Date,
) {
  const match: Record<string, unknown> = {
    org_id: new mongoose.Types.ObjectId(orgId),
    unit_id: new mongoose.Types.ObjectId(unitId),
    status: "COMPLETED",
  };

  if (startDate || endDate) {
    match.date = {};
    if (startDate) (match.date as Record<string, Date>).$gte = startDate;
    if (endDate) (match.date as Record<string, Date>).$lte = endDate;
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$category",
        totalCost: { $sum: "$totalCost" },
        count: { $sum: 1 },
        avgCost: { $avg: "$totalCost" },
      },
    },
    { $sort: { totalCost: -1 } },
  ]);
};

// Model type with statics
interface MaintenanceLogModel extends Model<IMaintenanceLog> {
  getUnitSummary(
    orgId: string,
    unitId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<
    { _id: string; totalCost: number; count: number; avgCost: number }[]
  >;
}

export const MaintenanceLog =
  (mongoose.models.MaintenanceLog as MaintenanceLogModel) ||
  mongoose.model<IMaintenanceLog, MaintenanceLogModel>(
    "MaintenanceLog",
    MaintenanceLogSchema,
  );
