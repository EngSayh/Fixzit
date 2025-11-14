import { Schema, model, models } from 'mongoose';
import { tenantIsolationPlugin } from '../plugins/tenantIsolation';
import { auditPlugin } from '../plugins/auditPlugin';

const DiscountRuleSchema = new Schema(
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

export default (typeof models !== 'undefined' && models.DiscountRule) || model('DiscountRule', DiscountRuleSchema);

