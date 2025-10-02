import { Schema, model, models, Types } from 'mongoose';

const DiscountRuleSchema = new Schema(
  {
    key: { 
      type: String, 
      unique: true, 
      required: true,
      trim: true 
    },
    percentage: { 
      type: Number, 
      default: 15,
      min: [0, 'Percentage must be between 0 and 100'],
      max: [100, 'Percentage must be between 0 and 100']
    },
    editableBySuperAdminOnly: { type: Boolean, default: true },
    // Tenant isolation
    tenantId: { 
      type: Types.ObjectId, 
      ref: ''Organization'',
      required: true,
      index: true 
    },
  },
  { timestamps: true }
);

export default models.DiscountRule || model('DiscountRule', DiscountRuleSchema);
