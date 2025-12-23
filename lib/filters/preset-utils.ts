import { type FilterSchema } from "@/components/tables/utils/filterSchema";

type FilterRecord = Record<string, unknown>;

/**
 * Strip any filter keys that are not part of the provided schema.
 * Ensures saved views only persist schema-aligned filters.
 */
export function pickSchemaFilters<TFilters extends FilterRecord>(
  filters: FilterRecord | undefined,
  schema: Array<FilterSchema<TFilters>>
): Partial<TFilters> {
  if (!filters) return {};

  const allowedKeys = new Set(schema.map((field) => field.key));
  return Object.entries(filters).reduce<Partial<TFilters>>((acc, [key, value]) => {
    if (allowedKeys.has(key as keyof TFilters & string)) {
      (acc as Record<string, unknown>)[key] = value;
    }
    return acc;
  }, {});
}

/**
 * Convenience helper to split search text from a saved preset.
 * Accepts either `search` or `q` keys for compatibility.
 */
export function extractSearchFromPreset(
  preset: { search?: unknown; q?: unknown } | undefined
): string {
  if (!preset) return "";
  const raw = preset.search ?? preset.q;
  return typeof raw === "string" ? raw : "";
}
