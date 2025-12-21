/**
 * Unit Tests: SearchFiltersNew Component
 * 
 * Tests the refactored Aqar search filters using standard components
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// Static analysis tests (like the integration tests)
describe("SearchFiltersNew - Static Analysis", () => {
  const filePath = join(process.cwd(), "components/aqar/SearchFiltersNew.tsx");
  let source: string;

  beforeEach(() => {
    source = readFileSync(filePath, "utf-8");
  });

  describe("Standard Component Imports", () => {
    it("should import FacetMultiSelect", () => {
      expect(source).toContain("import { FacetMultiSelect");
      expect(source).toContain('@/components/tables/filters/FacetMultiSelect');
    });

    it("should import NumericRangeFilter", () => {
      expect(source).toContain("import { NumericRangeFilter");
      expect(source).toContain('@/components/tables/filters/NumericRangeFilter');
    });

    it("should import useTableQueryState", () => {
      expect(source).toContain("import { useTableQueryState");
      expect(source).toContain('@/hooks/useTableQueryState');
    });
  });

  describe("Component Usage", () => {
    it("should use FacetMultiSelect for property types", () => {
      expect(source).toMatch(/FacetMultiSelect[\s\S]*?propertyTypeOptions/);
    });

    it("should use FacetMultiSelect for cities", () => {
      expect(source).toMatch(/FacetMultiSelect[\s\S]*?cityOptions/);
    });

    it("should use FacetMultiSelect for amenities", () => {
      expect(source).toMatch(/FacetMultiSelect[\s\S]*?amenityOptions/);
    });

    it("should use NumericRangeFilter for price", () => {
      expect(source).toMatch(/NumericRangeFilter[\s\S]*?priceMin[\s\S]*?priceMax/);
    });

    it("should use NumericRangeFilter for area", () => {
      expect(source).toMatch(/NumericRangeFilter[\s\S]*?areaMin[\s\S]*?areaMax/);
    });
  });

  describe("URL Sync Integration", () => {
    it("should call useTableQueryState with storage key", () => {
      expect(source).toContain('useTableQueryState(storageKey');
    });

    it("should have updateState function usage", () => {
      expect(source).toContain("updateState(");
    });

    it("should have resetState function usage", () => {
      expect(source).toContain("resetState()");
    });
  });

  describe("Filter Conversion Functions", () => {
    it("should have filtersToTableState converter", () => {
      expect(source).toContain("function filtersToTableState");
    });

    it("should have tableStateToFilters converter", () => {
      expect(source).toContain("function tableStateToFilters");
    });
  });

  describe("RTL/i18n Support", () => {
    it("should use logical start/end classes for RTL", () => {
      expect(source).toMatch(/\b(start|end|ps|pe|ms|me)-/);
    });

    it("should use translation function for labels", () => {
      expect(source).toContain('t("aqar.');
    });
  });

  describe("Accessibility", () => {
    it("should have aria-expanded on filter toggle", () => {
      expect(source).toContain("aria-expanded={showAdvanced}");
    });

    it("should have aria-controls linking to advanced filters", () => {
      expect(source).toContain('aria-controls="advanced-filters"');
    });

    it("should have role=region on advanced filters panel", () => {
      expect(source).toContain('role="region"');
    });
  });
});
