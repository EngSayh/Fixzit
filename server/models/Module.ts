import { Schema, model, models } from 'mongoose';
import { auditPlugin } from '../plugins/auditPlugin';

export type ModuleKey =
  | 'FM_CORE'
  | 'PM'
  | 'MARKETPLACE_PRO'
  | 'ANALYTICS_PRO'
  | 'COMPLIANCE'
  | 'HR_LITE'
  | 'CRM_LITE';

const MODULE_KEYS: ModuleKey[] = [
  'FM_CORE',
  'PM',
  'MARKETPLACE_PRO',
  'ANALYTICS_PRO',
  'COMPLIANCE',
  'HR_LITE',
  'CRM_LITE'
];

const ModuleSchema = new Schema(
  {
    key: { 
      type: String, 
      unique: true, 
      required: true,
      enum: {
        values: MODULE_KEYS,
        message: '{VALUE} is not a valid module key'
      }
    },
    name: { type: String, required: true },
    description: String,
    enabledByDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Apply auditPlugin for change tracking (Module is global, so NO tenantIsolationPlugin)
ModuleSchema.plugin(auditPlugin);

export default (typeof models !== 'undefined' && models.Module) || model('Module', ModuleSchema);
export { MODULE_KEYS };
