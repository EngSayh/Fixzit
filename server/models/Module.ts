/**
 * @module server/models/Module
 * @description Module registry for platform feature modules.
 * Defines available modules (FM_CORE, PM, MARKETPLACE_PRO, etc.) with enablement defaults.
 *
 * @features
 * - Module catalog (FM_CORE, PM, MARKETPLACE_PRO, ANALYTICS_PRO, COMPLIANCE, HR_LITE, CRM_LITE)
 * - Global module registry (not tenant-scoped)
 * - Module key uniqueness (single source of truth)
 * - Enablement defaults (enabledByDefault flag)
 * - Module descriptions for UI/documentation
 * - Audit trail for module changes (auditPlugin)
 * - Organization.enabledModules references
 *
 * @indexes
 * - { key: 1 } unique - Module key lookup
 *
 * @relationships
 * - Organization: Organization.enabledModules references Module.key
 * - FeatureFlag: Feature flags may be module-scoped
 *
 * @compliance
 * - Global reference data (no tenant isolation)
 * - Admin-only modifications
 *
 * @audit
 * - createdAt/updatedAt: Module definition lifecycle
 * - createdBy/updatedBy: Admin who created/updated module
 */
import { Schema, model, models, Model, Document } from "mongoose";
import { getModel, MModel } from "@/types/mongoose-compat";
import { auditPlugin } from "../plugins/auditPlugin";

export type ModuleKey =
  | "FM_CORE"
  | "PM"
  | "MARKETPLACE_PRO"
  | "ANALYTICS_PRO"
  | "COMPLIANCE"
  | "HR_LITE"
  | "CRM_LITE";

const MODULE_KEYS: ModuleKey[] = [
  "FM_CORE",
  "PM",
  "MARKETPLACE_PRO",
  "ANALYTICS_PRO",
  "COMPLIANCE",
  "HR_LITE",
  "CRM_LITE",
];

const ModuleSchema = new Schema(
  {
    key: {
      type: String,
      unique: true,
      required: true,
      enum: {
        values: MODULE_KEYS,
        message: "{VALUE} is not a valid module key",
      },
    },
    name: { type: String, required: true },
    description: String,
    enabledByDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Apply auditPlugin for change tracking (Module is global, so NO tenantIsolationPlugin)
ModuleSchema.plugin(auditPlugin);

// TypeScript-safe model export
interface IModule extends Document {
  key: ModuleKey;
  name: string;
  description?: string;
  enabledByDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: Schema.Types.ObjectId;
  updatedBy?: Schema.Types.ObjectId;
}

const Module = getModel<IModule>("Module", ModuleSchema);
export default Module;
export { MODULE_KEYS };
