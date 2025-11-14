import { Schema, model, models, Model, Document } from 'mongoose';
import { tenantIsolationPlugin } from '../plugins/tenantIsolation';
import { auditPlugin } from '../plugins/auditPlugin';

interface IDiscountRule extends Document {
  key: string;
  percentage: number;
  editableBySuperAdminOnly: boolean;
  orgId: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
}

const DiscountRuleSchema = new Schema<IDiscountRule>(
  {
    key: { 
      type: String, 
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
    // REMOVED: Manual tenantId (plugin will add orgId)
  },
  { timestamps: true }
);

// APPLY PLUGINS (BEFORE INDEXES)
DiscountRuleSchema.plugin(tenantIsolationPlugin);
DiscountRuleSchema.plugin(auditPlugin);

// ADD TENANT-SCOPED INDEX
// Ensures 'key' (e.g., "VAT") is unique within an organization
DiscountRuleSchema.index({ orgId: 1, key: 1 }, { unique: true });

// TypeScript-safe model export
const DiscountRule: Model<IDiscountRule> = models.DiscountRule || model<IDiscountRule>('DiscountRule', DiscountRuleSchema);
export default DiscountRule;

