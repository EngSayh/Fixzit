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

export const LEGACY_ENTITY_KEYS = Object.keys(
  LEGACY_ENTITY_ALIASES,
) as ReadonlyArray<string>;

export const ALL_ENTITY_TYPE_KEYS = [
  ...FILTER_ENTITY_TYPES,
  ...LEGACY_ENTITY_KEYS,
] as ReadonlyArray<string>;

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

/**
 * Returns all acceptable values for a given canonical entity, including legacy aliases.
 * When canonical is null, returns the full set of canonical + legacy values.
 */
export function entityTypeQueryValues(
  canonical: FilterEntityType | null,
): ReadonlyArray<string> {
  if (!canonical) return ALL_ENTITY_TYPE_KEYS;
  const legacyForCanonical = Object.entries(LEGACY_ENTITY_ALIASES)
    .filter(([, target]) => target === canonical)
    .map(([legacy]) => legacy);
  return [canonical, ...legacyForCanonical];
}
