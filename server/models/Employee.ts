/**
 * @deprecated LEGACY MODEL - DO NOT USE
 *
 * This model is DEPRECATED and will be removed in a future release.
 * Use the Employee model from `@/server/models/hr.models` instead,
 * which includes:
 * - PII encryption hooks for sensitive fields
 * - Proper technician profile integration
 * - GOSI/ZATCA compliance fields
 * - Full FM integration (Work Orders, Properties)
 *
 * Migration: Import from hr.models.ts
 * ```typescript
 * import { Employee } from "@/server/models/hr.models";
 * ```
 *
 * @see /server/models/hr.models.ts for the canonical Employee model
 * @since 2025-11-29 - Marked as deprecated
 */
import { Schema, model, models, InferSchemaType, Document } from "mongoose";
import { getModel, MModel } from "@/src/types/mongoose-compat";
import { tenantIsolationPlugin } from "../plugins/tenantIsolation";
import { auditPlugin } from "../plugins/auditPlugin";

/** @deprecated Use Employee from hr.models.ts instead */
const EmployeeSchema = new Schema(
  {
    personal: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String },
    },
    professional: {
      role: { type: String, default: "EMPLOYEE" },
      department: { type: String },
      title: { type: String },
      startDate: { type: Date },
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "ONBOARDING"],
      default: "ACTIVE",
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

// Apply plugins BEFORE indexes
EmployeeSchema.plugin(tenantIsolationPlugin);
EmployeeSchema.plugin(auditPlugin);

// Tenant-scoped index
EmployeeSchema.index({ orgId: 1, "personal.email": 1 }, { unique: true });

/** @deprecated Use EmployeeDoc from hr.models.ts instead */
export type EmployeeDoc = InferSchemaType<typeof EmployeeSchema> & Document;

/**
 * @deprecated Use Employee from `@/server/models/hr.models` instead
 * This legacy model lacks PII encryption and FM integration
 */
export const Employee = getModel<EmployeeDoc>("Employee", EmployeeSchema);
