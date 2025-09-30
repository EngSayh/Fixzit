import { Schema, model, models, Types } from 'mongoose';

const DiscountRuleSchema = new Schema(
  {
    code: { type: String, required: true }, // 'ANNUAL'
    tenantKey: { type: String, required: true, index: true },
    orgId: { type: Schema.Types.ObjectId, required: true, index: true },
    type: { type: String, enum: ['percent', 'amount'], default: 'percent' },
    value: Number, // e.g. 15
    active: { type: Boolean, default: true },
    editableBy: { type: [String], default: ['SUPER_ADMIN'] }
  },
  { timestamps: true }
);

DiscountRuleSchema.index({ code: 1, orgId: 1 }, { unique: true });

export type DiscountRuleDocument = {
  code: string;
  tenantKey: string;
  orgId: Types.ObjectId;
  type: 'percent' | 'amount';
  value: number;
  active: boolean;
  editableBy: string[];
};

export default models.DiscountRule || model('DiscountRule', DiscountRuleSchema);
