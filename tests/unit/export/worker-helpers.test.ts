import { describe, it, expect } from "vitest";
import { sanitizeFilters, buildExportKey, assertSupportedEntity } from "@/lib/export/worker-helpers";

describe("export worker helpers", () => {
  it("sanitizes filters to primitives only", () => {
    const filters = {
      status: "OPEN",
      priority: "HIGH",
      nested: { bad: true },
      arr: [1, 2],
      num: 5,
      bool: true,
      nil: null,
    };
    expect(sanitizeFilters(filters)).toEqual({
      status: "OPEN",
      priority: "HIGH",
      num: 5,
      bool: true,
    });
  });

  it("builds namespaced export key", () => {
    const key = buildExportKey("org-123", "job_456", "csv");
    expect(key).toBe("exports/org-123/job_456.csv");
  });

  it("asserts supported entities", () => {
    expect(() => assertSupportedEntity("workOrders" as any)).not.toThrow();
    expect(() => assertSupportedEntity("unknown" as any)).toThrow();
  });
});
