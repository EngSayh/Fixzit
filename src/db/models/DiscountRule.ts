import { Schema, model, models } from 'mongoose';

const DiscountRuleSchema = new Schema(
  {
    key: { type: String, unique: true },
    percentage: { type: Number, default: 0.15 },
    editableBySuperAdminOnly: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default models.DiscountRule || model('DiscountRule', DiscountRuleSchema);
