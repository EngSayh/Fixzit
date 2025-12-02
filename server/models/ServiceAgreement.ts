import { Schema, model, models, Types, Model, Document } from "mongoose";
import { getModel, MModel } from "@/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

const ServiceAgreementSchema = new Schema(
  {
    subscriber_type: {
      type: String,
      enum: ["Organization", "Owner"], // FIXED: Must match model names
      required: true,
    },
    subscriber_id: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "subscriber_type",
    },
    modules: { type: [String], default: [] },
    seats: {
      type: Number,
      required: true,
      min: [1, "Seats must be at least 1"],
    },
    term: {
      type: String,
      enum: ["MONTHLY", "ANNUAL"],
      required: true,
    },
    start_at: {
      type: Date,
      required: true,
    },
    end_at: {
      type: Date,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      match: [
        /^[A-Z]{3}$/,
        "Currency must be a valid ISO 4217 code (e.g., USD, EUR, SAR)",
      ],
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount cannot be negative"],
    },
    status: {
      type: String,
      enum: ["DRAFT", "SIGNED", "ACTIVE", "ENDED", "CANCELLED"],
      default: "DRAFT",
    },
    pdf_url: String,
    e_signed_at: Date,
  },
  { timestamps: true },
);

// Apply plugins BEFORE indexes
ServiceAgreementSchema.plugin(tenantIsolationPlugin);
ServiceAgreementSchema.plugin(auditPlugin);

// Tenant-scoped indexes
ServiceAgreementSchema.index({ orgId: 1, status: 1 });
ServiceAgreementSchema.index({
  orgId: 1,
  subscriber_type: 1,
  subscriber_id: 1,
});
ServiceAgreementSchema.index({ orgId: 1, end_at: 1 });

// Validate start_at < end_at
ServiceAgreementSchema.pre("save", function (next) {
  if (this.start_at && this.end_at && this.start_at >= this.end_at) {
    return next(new Error("start_at must be before end_at"));
  }
  next();
});

// TypeScript-safe model export
interface IServiceAgreement extends Document {
  subscriber_type: "Organization" | "Owner";
  subscriber_id: Schema.Types.ObjectId;
  modules: string[];
  seats: number;
  term: "MONTHLY" | "ANNUAL";
  start_at: Date;
  end_at: Date;
  currency: string;
  amount: number;
  status: "DRAFT" | "SIGNED" | "ACTIVE" | "ENDED" | "CANCELLED";
  pdf_url?: string;
  e_signed_at?: Date;
  orgId: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
}

const ServiceAgreement = getModel<IServiceAgreement>(
  "ServiceAgreement",
  ServiceAgreementSchema,
);
export default ServiceAgreement;
