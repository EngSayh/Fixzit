// src/config/rbac.config.ts
// Fixzit RBAC v1 — 14 roles x modules; multi-tenant safe (orgId scoping expected in your data layer)

export type Role =
  | "super_admin"
  | "corporate_admin"
  | "property_manager"
  | "operations_dispatcher"
  | "supervisor"
  | "technician_internal"
  | "vendor_admin"
  | "vendor_technician"
  | "tenant_resident"
  | "owner_landlord"
  | "finance_manager"
  | "hr_manager"
  | "helpdesk_agent"
  | "auditor_compliance";
