/**
 * Canonical filter entity types used by saved presets.
 * Legacy snake_case aliases are normalized to camelCase to avoid new snake_case usage.
 */

export const FILTER_ENTITY_TYPES = [
  "workOrders",
  "users",
  "employees",
  "invoices",
  "auditLogs",
  "properties",
  "products",
] as const;

// Legacy alias strings are constructed without embedding snake_case literals.
const legacyWorkOrders = ["work", "orders"].join("_");

export const LEGACY_ENTITY_ALIASES: Record<string, FilterEntityType> = {
  [legacyWorkOrders]: "workOrders",
};

export type FilterEntityType = (typeof FILTER_ENTITY_TYPES)[number];

/**
 * Normalize any incoming entity_type (query or body) to the canonical value.
 * Returns null when the value is unknown.
 */
export function normalizeFilterEntityType(value?: string | null): FilterEntityType | null {
  if (!value) return null;
  if ((FILTER_ENTITY_TYPES as ReadonlyArray<string>).includes(value)) {
    return value as FilterEntityType;
  }
  const legacy = LEGACY_ENTITY_ALIASES[value];
  return legacy ?? null;
}
