import type { FilterEntityType } from "@/lib/filters/entities";

const PRIMITIVE_TYPES = ["string", "number", "boolean"];

export type SanitizedFilters = Record<string, string | number | boolean>;

/**
 * Keep only primitive equality filters to avoid untrusted operators.
 */
export function sanitizeFilters(
  filters?: Record<string, unknown>
): SanitizedFilters {
  if (!filters) return {};
  return Object.entries(filters).reduce<SanitizedFilters>((acc, [key, value]) => {
    if (value == null) return acc;
    const t = typeof value;
    if (PRIMITIVE_TYPES.includes(t)) {
      acc[key] = value as string | number | boolean;
    }
    return acc;
  }, {});
}

/**
 * Build a namespaced storage key for export artifacts.
 */
export function buildExportKey(
  orgId: string,
  jobId: string,
  format: "csv" | "xlsx"
): string {
  const safeOrg = orgId.replace(/[^a-zA-Z0-9_-]/g, "-") || "org";
  const safeJob = jobId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const ext = format === "xlsx" ? "xlsx" : "csv";
  return `exports/${safeOrg}/${safeJob}.${ext}`;
}

export type ExportEntity =
  | "workOrders"
  | "users"
  | "employees"
  | "invoices"
  | "auditLogs"
  | "properties"
  | "products";

export const SUPPORTED_EXPORT_ENTITIES: ReadonlyArray<ExportEntity> = [
  "workOrders",
  "users",
  "employees",
  "invoices",
  "auditLogs",
  "properties",
  "products",
] as const;

export function assertSupportedEntity(entity: FilterEntityType): ExportEntity {
  if (!SUPPORTED_EXPORT_ENTITIES.includes(entity as ExportEntity)) {
    throw new Error(`Unsupported export entity: ${entity}`);
  }
  return entity as ExportEntity;
}
