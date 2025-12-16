/**
 * @module server/models/Employee
 * @description DEPRECATED legacy Employee model. Use hr.models.ts Employee instead.
 * Retained for backward compatibility during migration. DO NOT USE for new code.
 *
 * @features
 * - Basic personal info (firstName, lastName, email, phone)
 * - Professional details (role, department, title, startDate)
 * - Status tracking (ACTIVE, INACTIVE, ONBOARDING)
 * - Metadata payload (flexible JSON)
 * - Tenant isolation (orgId via tenantIsolationPlugin)
 * - Audit trail (auditPlugin)
 * - Unique email per tenant
 *
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
 * @indexes
 * - { orgId: 1, 'personal.email': 1 } unique (partial) - Tenant-scoped unique email
 *
 * @relationships
 * - Organization: orgId tenant scope
 * - User: May link to User model via email
 *
 * @compliance
 * - PII encryption NOT IMPLEMENTED (use hr.models.ts)
 * - GOSI/ZATCA fields MISSING (use hr.models.ts)
 *
 * @audit
 * - createdAt/updatedAt: Record lifecycle
 * - createdBy/updatedBy: User actions (from auditPlugin)
 *
 * @see /server/models/hr.models.ts for the canonical Employee model
 * @since 2025-11-29 - Marked as deprecated
 */
import { Schema, model, models, InferSchemaType, Document } from "mongoose";
import { getModel, MModel } from "@/types/mongoose-compat";
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
EmployeeSchema.index(
  { orgId: 1, "personal.email": 1 },
  { unique: true, partialFilterExpression: { orgId: { $exists: true } } },
);

/** @deprecated Use EmployeeDoc from hr.models.ts instead */
export type EmployeeDoc = InferSchemaType<typeof EmployeeSchema> & Document;

/**
 * @deprecated Use Employee from `@/server/models/hr.models` instead
 * This legacy model lacks PII encryption and FM integration
 */
export const Employee = getModel<EmployeeDoc>("Employee", EmployeeSchema);
