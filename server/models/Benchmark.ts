import { Schema, model, models, Types } from 'mongoose';

const PlanSchema = new Schema(
  {
    name: String,
    price_per_user_month_usd: Number,
    url: String,
    features: { type: [String], default: [] },
  },
  { _id: false }
);

const BenchmarkSchema = new Schema(
  {
    vendor: { type: String, required: true },
    region: String,
    plans: { type: [PlanSchema], default: [] },
    retrieved_at: { type: Date, default: () => new Date() },
    // Tenant isolation
    tenantId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Organization',
      required: true,
    },
  },
  { timestamps: true }
);

export default models.Benchmark || model('Benchmark', BenchmarkSchema);

