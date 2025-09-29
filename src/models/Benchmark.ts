import { Schema, model, models } from 'mongoose';

const BenchmarkSchema = new Schema({
  vendor: String, plan: String,
  pricingModel: { type: String, enum: ['per_user_month','per_property','flat'] },
  priceMonthly: Number,
  priceAnnualMonthly: Number,
  src: String, notes: String
}, { timestamps: true });

export default models.Benchmark || model('Benchmark', BenchmarkSchema);
