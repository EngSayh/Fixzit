import mongoose, { Schema, Document, Model } from "mongoose";

/**
 * RevenueLog Model
 * Tracks all revenue per unit for financial reporting and net profit calculations
 *
 * @version 1.0.0
 * @date 2024-12-04
 */

export interface IRevenueLog extends Document {
  unit_id: mongoose.Types.ObjectId;
  property_id: mongoose.Types.ObjectId;
  org_id: mongoose.Types.ObjectId;
  tenant_id?: mongoose.Types.ObjectId;
  tenancy_id?: mongoose.Types.ObjectId;
  invoice_id?: mongoose.Types.ObjectId;

  // Revenue details
  date: Date;
  type:
    | "RENT"
    | "DEPOSIT"
    | "UTILITY_REIMBURSEMENT"
    | "LATE_FEE"
    | "MAINTENANCE_FEE"
    | "PARKING"
    | "AMENITY"
    | "OTHER";
  description?: string;

  // Amount
  amount: number;
  currency: string;

  // Payment details
  paymentMethod?:
    | "CASH"
    | "BANK_TRANSFER"
    | "CREDIT_CARD"
    | "CHECK"
    | "TAP"
    | "PAYTABS"
    | "OTHER";
  paymentReference?: string;
  paymentDate?: Date;

  // Status
  status: "PENDING" | "RECEIVED" | "PARTIAL" | "OVERDUE" | "REFUNDED" | "CANCELLED";
  dueDate?: Date;
  receivedAmount?: number;
  outstandingAmount?: number;

  // Period (for rent)
  periodStart?: Date;
  periodEnd?: Date;

  // Attachments
  receiptUrl?: string;
  notes?: string;

  // Audit
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}

const RevenueLogSchema = new Schema<IRevenueLog>(
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
    tenant_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      // index via compound { org_id: 1, tenant_id: 1, date: -1 }
    },
    tenancy_id: {
      type: Schema.Types.ObjectId,
      ref: "Tenancy",
      index: true, // standalone needed - not covered by compounds
    },
    invoice_id: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      index: true, // standalone needed - not covered by compounds
    },

    // Revenue details
    date: { type: Date, required: true, index: true }, // standalone needed for date-only queries
    type: {
      type: String,
      enum: [
        "RENT",
        "DEPOSIT",
        "UTILITY_REIMBURSEMENT",
        "LATE_FEE",
        "MAINTENANCE_FEE",
        "PARKING",
        "AMENITY",
        "OTHER",
      ],
      required: true,
      // index via compound { org_id: 1, type: 1, date: -1 }
    },
    description: String,

    // Amount
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "SAR" },

    // Payment details
    paymentMethod: {
      type: String,
      enum: [
        "CASH",
        "BANK_TRANSFER",
        "CREDIT_CARD",
        "CHECK",
        "TAP",
        "PAYTABS",
        "OTHER",
      ],
    },
    paymentReference: String,
    paymentDate: Date,

    // Status
    status: {
      type: String,
      enum: ["PENDING", "RECEIVED", "PARTIAL", "OVERDUE", "REFUNDED", "CANCELLED"],
      default: "PENDING",
      // index via compound { org_id: 1, status: 1, dueDate: 1 }
    },
    dueDate: { type: Date }, // index via compound { org_id: 1, status: 1, dueDate: 1 }
    receivedAmount: { type: Number, default: 0, min: 0 },
    outstandingAmount: { type: Number, default: 0, min: 0 },

    // Period
    periodStart: Date,
    periodEnd: Date,

    // Attachments
    receiptUrl: String,
    notes: String,

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
RevenueLogSchema.index({ org_id: 1, unit_id: 1, date: -1 });
RevenueLogSchema.index({ org_id: 1, property_id: 1, date: -1 });
RevenueLogSchema.index({ org_id: 1, tenant_id: 1, date: -1 });
RevenueLogSchema.index({ org_id: 1, status: 1, dueDate: 1 });
RevenueLogSchema.index({ org_id: 1, type: 1, date: -1 });

// Pre-save hook to calculate outstanding amount
RevenueLogSchema.pre("save", function (next) {
  this.outstandingAmount = Math.max(0, this.amount - (this.receivedAmount || 0));
  
  // Update status based on payment
  if (this.receivedAmount && this.receivedAmount >= this.amount) {
    this.status = "RECEIVED";
  } else if (this.receivedAmount && this.receivedAmount > 0) {
    this.status = "PARTIAL";
  } else if (this.dueDate && new Date() > this.dueDate && this.status === "PENDING") {
    this.status = "OVERDUE";
  }
  
  next();
});

// Virtual for formatted amount
RevenueLogSchema.virtual("formattedAmount").get(function () {
  return `${this.amount?.toLocaleString() || "0"} ${this.currency || "SAR"}`;
});

// Ensure virtuals are included in JSON
RevenueLogSchema.set("toJSON", { virtuals: true });
RevenueLogSchema.set("toObject", { virtuals: true });

// Static method to get revenue summary per unit
RevenueLogSchema.statics.getUnitRevenueSummary = async function (
  orgId: string,
  unitId: string,
  startDate?: Date,
  endDate?: Date,
) {
  const match: Record<string, unknown> = {
    org_id: new mongoose.Types.ObjectId(orgId),
    unit_id: new mongoose.Types.ObjectId(unitId),
    status: { $in: ["RECEIVED", "PARTIAL"] },
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
        _id: "$type",
        totalAmount: { $sum: "$amount" },
        receivedAmount: { $sum: "$receivedAmount" },
        count: { $sum: 1 },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);
};

// Static method to calculate net profit per unit
RevenueLogSchema.statics.calculateNetProfit = async function (
  orgId: string,
  unitId: string,
  startDate: Date,
  endDate: Date,
) {
  const MaintenanceLogModel = mongoose.model("MaintenanceLog");

  // Get total revenue
  const revenueResult = await this.aggregate([
    {
      $match: {
        org_id: new mongoose.Types.ObjectId(orgId),
        unit_id: new mongoose.Types.ObjectId(unitId),
        date: { $gte: startDate, $lte: endDate },
        status: { $in: ["RECEIVED", "PARTIAL"] },
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: "$receivedAmount" },
      },
    },
  ]);

  // Get total maintenance costs
  const expenseResult = await MaintenanceLogModel.aggregate([
    {
      $match: {
        org_id: new mongoose.Types.ObjectId(orgId),
        unit_id: new mongoose.Types.ObjectId(unitId),
        date: { $gte: startDate, $lte: endDate },
        status: "COMPLETED",
      },
    },
    {
      $group: {
        _id: null,
        totalExpenses: { $sum: "$totalCost" },
      },
    },
  ]);

  const totalRevenue = revenueResult[0]?.totalRevenue || 0;
  const totalExpenses = expenseResult[0]?.totalExpenses || 0;
  const netProfit = totalRevenue - totalExpenses;

  return {
    unitId,
    period: { start: startDate, end: endDate },
    totalRevenue,
    totalExpenses,
    netProfit,
    profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
  };
};

// Model type with statics
interface RevenueLogModel extends Model<IRevenueLog> {
  getUnitRevenueSummary(
    orgId: string,
    unitId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<
    { _id: string; totalAmount: number; receivedAmount: number; count: number }[]
  >;
  calculateNetProfit(
    orgId: string,
    unitId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    unitId: string;
    period: { start: Date; end: Date };
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
  }>;
}

export const RevenueLog =
  (mongoose.models.RevenueLog as RevenueLogModel) ||
  mongoose.model<IRevenueLog, RevenueLogModel>("RevenueLog", RevenueLogSchema);
