/**
 * Filter Schema Registry
 * Centralized schemas for server-side filter validation
 */

import type { FilterSchema } from "@/components/tables/utils/filterSchema";

// Import schemas from components (server can't import React components directly, so we re-export types)
// In production, these would be extracted to a shared lib/filters/schemas.ts

type WorkOrderFilters = {
  status?: string;
  priority?: string;
  assignedToMe?: boolean;
  unassigned?: boolean;
  overdue?: boolean;
  slaRisk?: boolean;
  dueDateFrom?: string;
  dueDateTo?: string;
};

type InvoiceFilters = {
  status?: string;
  dateRange?: string;
  amountMin?: number;
  amountMax?: number;
  issueFrom?: string;
  issueTo?: string;
  dueFrom?: string;
  dueTo?: string;
};

type EmployeeFilters = {
  role?: string;
  department?: string;
  status?: string;
  hireFrom?: string;
  hireTo?: string;
};

type ProductFilters = {
  category?: string;
  vendor?: string;
  inStock?: boolean;
  featured?: boolean;
  priceMin?: number;
  priceMax?: number;
};

type PropertyFilters = {
  type?: string;
  status?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
};

type AuditLogFilters = {
  action?: string;
  module?: string;
  userId?: string;
  fromDate?: string;
  toDate?: string;
};

type UserFilters = {
  role?: string;
  status?: string;
  createdFrom?: string;
  createdTo?: string;
};

// Schema definitions (simplified - keys only for validation)
const WORK_ORDER_SCHEMA_KEYS = new Set([
  "status",
  "priority",
  "assignedToMe",
  "unassigned",
  "overdue",
  "slaRisk",
  "dueDateFrom",
  "dueDateTo",
]);

const INVOICE_SCHEMA_KEYS = new Set([
  "status",
  "dateRange",
  "amountMin",
  "amountMax",
  "issueFrom",
  "issueTo",
  "dueFrom",
  "dueTo",
]);

const EMPLOYEE_SCHEMA_KEYS = new Set([
  "role",
  "department",
  "status",
  "hireFrom",
  "hireTo",
]);

const PRODUCT_SCHEMA_KEYS = new Set([
  "category",
  "vendor",
  "inStock",
  "featured",
  "priceMin",
  "priceMax",
]);

const PROPERTY_SCHEMA_KEYS = new Set([
  "type",
  "status",
  "city",
  "minPrice",
  "maxPrice",
  "bedrooms",
]);

const AUDIT_LOG_SCHEMA_KEYS = new Set([
  "action",
  "module",
  "userId",
  "fromDate",
  "toDate",
]);

const USER_SCHEMA_KEYS = new Set([
  "role",
  "status",
  "createdFrom",
  "createdTo",
]);

/**
 * Get allowed filter keys for an entity type
 */
export function getSchemaKeysForEntity(entityType: string | null | undefined): Set<string> | null {
  switch (entityType) {
    case "workOrders":
      return WORK_ORDER_SCHEMA_KEYS;
    case "invoices":
      return INVOICE_SCHEMA_KEYS;
    case "employees":
      return EMPLOYEE_SCHEMA_KEYS;
    case "products":
      return PRODUCT_SCHEMA_KEYS;
    case "properties":
      return PROPERTY_SCHEMA_KEYS;
    case "auditLogs":
      return AUDIT_LOG_SCHEMA_KEYS;
    case "users":
      return USER_SCHEMA_KEYS;
    default:
      return null;
  }
}

/**
 * Prune filters to only include keys defined in the entity schema
 */
export function pruneFiltersToSchema(
  filters: Record<string, unknown>,
  entityType: string | null | undefined
): Record<string, unknown> {
  const allowedKeys = getSchemaKeysForEntity(entityType);
  
  // If no schema defined, allow all (backward compatibility)
  if (!allowedKeys) return filters;

  return Object.entries(filters).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (allowedKeys.has(key)) {
      acc[key] = value;
    }
    return acc;
  }, {});
}
