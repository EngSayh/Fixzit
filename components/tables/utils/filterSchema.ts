export type FilterSchema<TFilters extends Record<string, unknown>> = {
  key: keyof TFilters & string;
  /**
   * Query string param name to set when active.
   */
  param: string;
  /**
   * Return true when this filter is active. Defaults to truthiness check.
   */
  isActive?: (filters: TFilters) => boolean;
  /**
   * Convert filter value(s) into a query param value. Defaults to filters[key].
   */
  toParam?: (filters: TFilters) => string | number | boolean | undefined;
  /**
   * Label builder for ActiveFiltersChips.
   */
  label: (filters: TFilters) => string;
  /**
   * Custom clear implementation. Defaults to removing the key.
   */
  clear?: (filters: TFilters) => Partial<TFilters>;
};

export type ActiveFilterChip = {
  key: string;
  label: string;
  onRemove: () => void;
};

const isTruthyValue = (value: unknown) => {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && value !== "";
};

export function serializeFilters<TFilters extends Record<string, unknown>>(
  filters: TFilters | undefined,
  schema: Array<FilterSchema<TFilters>>,
  params: URLSearchParams
) {
  if (!filters) return;

  schema.forEach((field) => {
    const active = field.isActive ? field.isActive(filters) : isTruthyValue(filters[field.key]);
    if (!active) return;

    const rawValue = field.toParam ? field.toParam(filters) : (filters as Record<string, unknown>)[field.key];
    if (rawValue === undefined || rawValue === null || rawValue === "") return;

    params.set(field.param, String(rawValue));
  });
}

export function buildActiveFilterChips<TFilters extends Record<string, unknown>>(
  filters: TFilters | undefined,
  schema: Array<FilterSchema<TFilters>>,
  updateState: (nextFilters: Partial<TFilters>) => void
): ActiveFilterChip[] {
  if (!filters) return [];

  return schema
    .filter((field) => (field.isActive ? field.isActive(filters) : isTruthyValue(filters[field.key])))
    .map((field) => ({
      key: field.key,
      label: field.label(filters),
      onRemove: () => {
        if (field.clear) {
          updateState(field.clear(filters));
          return;
        }
        const { [field.key]: _omit, ...rest } = filters;
        updateState(rest as Partial<TFilters>);
      },
    }));
}
