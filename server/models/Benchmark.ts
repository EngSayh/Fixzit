import { Schema, model, models } from 'mongoose';

const PlanSchema = new Schema(
  {
    name: String,
    price_per_user_month_usd: Number,
    url: String,
    features: { type: [String], default: [] },
  },
  { _id: false }
);

const VendorSchema = new Schema(
  {
    vendor: { type: String, required: true },
    region: String,
    plans: { type: [PlanSchema], default: [] },
    retrieved_at: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

export default models.Benchmark || model('Benchmark', VendorSchema);
