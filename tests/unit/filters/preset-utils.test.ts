import { describe, it, expect } from "vitest";
import { pickSchemaFilters, extractSearchFromPreset } from "@/lib/filters/preset-utils";
import { type FilterSchema } from "@/components/tables/utils/filterSchema";

type Filters = { status?: string; priority?: string; dateRange?: string };

const SCHEMA: Array<FilterSchema<Filters>> = [
  { key: "status", param: "status", label: (f) => `Status: ${f.status}` },
  { key: "priority", param: "priority", label: (f) => `Priority: ${f.priority}` },
  { key: "dateRange", param: "dateRange", label: (f) => `Range: ${f.dateRange}` },
];

describe("preset-utils", () => {
  it("keeps only schema-backed filters", () => {
    const filters = {
      status: "OPEN",
      priority: "HIGH",
      rogue: "value",
    };

    const sanitized = pickSchemaFilters<Filters>(filters, SCHEMA);
    expect(sanitized).toEqual({ status: "OPEN", priority: "HIGH" });
    expect(Object.hasOwn(sanitized, "rogue")).toBe(false);
  });

  it("extracts search from either search or q key", () => {
    expect(extractSearchFromPreset({ search: "alpha" })).toBe("alpha");
    expect(extractSearchFromPreset({ q: "beta" })).toBe("beta");
    expect(extractSearchFromPreset(undefined)).toBe("");
  });
});
