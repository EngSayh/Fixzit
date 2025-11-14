import { Schema, model, models, Model, Document } from 'mongoose';

interface IPlan {
  name?: string;
  price_per_user_month_usd?: number;
  url?: string;
  features: string[];
}

interface IBenchmark extends Document {
  vendor: string;
  region?: string;
  plans: IPlan[];
  retrieved_at: Date;
  tenantId: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema(
  {
    name: String,
    price_per_user_month_usd: Number,
    url: String,
    features: { type: [String], default: [] },
  },
  { _id: false }
);

const BenchmarkSchema = new Schema<IBenchmark>(
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

// TypeScript-safe model export
const Benchmark: Model<IBenchmark> = models.Benchmark || model<IBenchmark>('Benchmark', BenchmarkSchema);
export default Benchmark;

