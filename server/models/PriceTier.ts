import { Schema, model, models, Document } from "mongoose";
import { getModel, MModel } from "@/src/types/mongoose-compat";
import { auditPlugin } from "../plugins/auditPlugin";

export interface IPriceTier extends Document {
  moduleId: Schema.Types.ObjectId;
  seatsMin: number;
  seatsMax: number;
  pricePerSeatMonthly?: number;
  flatMonthly?: number;
  currency: string;
  region?: string;
  // updatedBy removed - handled by auditPlugin
  createdBy?: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
  version?: number;
  changeHistory?: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

const priceTierSchema = new Schema<IPriceTier>(
  {
    moduleId: {
      type: Schema.Types.ObjectId,
      ref: "Module",
      required: true,
    },
    seatsMin: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: function (this: IPriceTier, value: number) {
          return !this.seatsMax || value <= this.seatsMax;
        },
        message: "seatsMin must be less than or equal to seatsMax",
      },
    },
    seatsMax: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: function (this: IPriceTier, value: number) {
          return !this.seatsMin || value >= this.seatsMin;
        },
        message: "seatsMax must be greater than or equal to seatsMin",
      },
    },
    pricePerSeatMonthly: {
      type: Number,
      min: 0,
    },
    flatMonthly: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      required: true,
      default: "USD",
      uppercase: true,
      match: [
        /^[A-Z]{3}$/,
        "Currency must be a valid ISO 4217 code (e.g., USD, EUR, SAR)",
      ],
    },
    region: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// NOTE: PriceTier is global platform configuration (no tenantIsolationPlugin)
// Apply audit plugin to track who changes pricing
priceTierSchema.plugin(auditPlugin);

priceTierSchema.index(
  { moduleId: 1, seatsMin: 1, seatsMax: 1, currency: 1 },
  { unique: true },
);

export const PriceTier = getModel<IPriceTier>("PriceTier", priceTierSchema);
export default PriceTier;
