import { Schema, model, models } from 'mongoose';

export type ModuleKey =
  | 'FM_CORE'
  | 'PM'
  | 'MARKETPLACE_PRO'
  | 'ANALYTICS_PRO'
  | 'COMPLIANCE'
  | 'HR_LITE'
  | 'CRM_LITE';

const ModuleSchema = new Schema(
  {
    key: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    description: String,
    enabledByDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default models.Module || model('Module', ModuleSchema);
