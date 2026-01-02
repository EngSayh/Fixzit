/**
 * @fileoverview Unit tests for Building Model generation
 * @description Tests for lib/buildingModel.ts - procedural 3D building generation
 * @module tests/unit/lib/buildingModel
 * 
 * Covers FEAT-0036: AI Building Model Generation
 * Tests procedural generation (free tier) and validates output schemas
 */
import { describe, it, expect } from "vitest";
import {
  generateBuildingModel,
  BuildingGenSpecSchema,
  type BuildingGenSpec,
  type BuildingModel,
  type FloorModel,
  type UnitModel,
} from "@/lib/buildingModel";

describe("Building Model Generation (FEAT-0036)", () => {
  describe("BuildingGenSpecSchema validation", () => {
    it("should accept valid minimal spec", () => {
      const spec = {
        floors: 5,
        apartmentsPerFloor: 4,
      };
      const result = BuildingGenSpecSchema.safeParse(spec);
      expect(result.success).toBe(true);
    });

    it("should accept full spec with all options", () => {
      const spec = {
        floors: 10,
        apartmentsPerFloor: 8,
        layout: "corridor",
        floorHeightM: 3.2,
        unitWidthM: 12,
        unitDepthM: 10,
        gapM: 1.5,
        slabThicknessM: 0.2,
        template: "3br",
        prompt: "Modern residential building with balconies",
        seed: "test-seed-123",
      };
      const result = BuildingGenSpecSchema.safeParse(spec);
      expect(result.success).toBe(true);
    });

    it("should reject floors < 1", () => {
      const spec = { floors: 0, apartmentsPerFloor: 4 };
      const result = BuildingGenSpecSchema.safeParse(spec);
      expect(result.success).toBe(false);
    });

    it("should reject floors > 120", () => {
      const spec = { floors: 121, apartmentsPerFloor: 4 };
      const result = BuildingGenSpecSchema.safeParse(spec);
      expect(result.success).toBe(false);
    });

    it("should reject apartmentsPerFloor < 1", () => {
      const spec = { floors: 5, apartmentsPerFloor: 0 };
      const result = BuildingGenSpecSchema.safeParse(spec);
      expect(result.success).toBe(false);
    });

    it("should reject invalid layout", () => {
      const spec = { floors: 5, apartmentsPerFloor: 4, layout: "invalid" };
      const result = BuildingGenSpecSchema.safeParse(spec);
      expect(result.success).toBe(false);
    });

    it("should reject invalid template", () => {
      const spec = { floors: 5, apartmentsPerFloor: 4, template: "5br" };
      const result = BuildingGenSpecSchema.safeParse(spec);
      expect(result.success).toBe(false);
    });

    it("should apply default values", () => {
      const spec = { floors: 5, apartmentsPerFloor: 4 };
      const result = BuildingGenSpecSchema.parse(spec);
      expect(result.layout).toBe("grid");
      expect(result.template).toBe("2br");
      expect(result.floorHeightM).toBe(3);
      expect(result.unitWidthM).toBe(10);
      expect(result.unitDepthM).toBe(8);
      expect(result.gapM).toBe(1.2);
      expect(result.slabThicknessM).toBe(0.15);
    });
  });

  describe("generateBuildingModel - procedural generation", () => {
    it("should generate a valid building model", () => {
      const spec: BuildingGenSpec = {
        floors: 3,
        apartmentsPerFloor: 2,
        layout: "grid",
        template: "2br",
        floorHeightM: 3,
        unitWidthM: 10,
        unitDepthM: 8,
        gapM: 1.2,
        slabThicknessM: 0.15,
      };

      const model = generateBuildingModel(spec);

      expect(model).toBeDefined();
      expect(model.schemaVersion).toBe(1);
      expect(model.generatedAt).toBeDefined();
      expect(model.spec).toEqual(spec);
    });

    it("should generate correct number of floors", () => {
      const spec: BuildingGenSpec = {
        floors: 5,
        apartmentsPerFloor: 4,
        layout: "grid",
        template: "2br",
        floorHeightM: 3,
        unitWidthM: 10,
        unitDepthM: 8,
        gapM: 1.2,
        slabThicknessM: 0.15,
      };

      const model = generateBuildingModel(spec);

      expect(model.floors).toHaveLength(5);
    });

    it("should generate correct number of units per floor", () => {
      const spec: BuildingGenSpec = {
        floors: 3,
        apartmentsPerFloor: 6,
        layout: "grid",
        template: "2br",
        floorHeightM: 3,
        unitWidthM: 10,
        unitDepthM: 8,
        gapM: 1.2,
        slabThicknessM: 0.15,
      };

      const model = generateBuildingModel(spec);

      model.floors.forEach((floor: FloorModel) => {
        expect(floor.units).toHaveLength(6);
      });
    });

    it("should generate unique unit keys", () => {
      const spec: BuildingGenSpec = {
        floors: 3,
        apartmentsPerFloor: 4,
        layout: "grid",
        template: "2br",
        floorHeightM: 3,
        unitWidthM: 10,
        unitDepthM: 8,
        gapM: 1.2,
        slabThicknessM: 0.15,
      };

      const model = generateBuildingModel(spec);
      const allKeys = model.floors.flatMap((f: FloorModel) =>
        f.units.map((u: UnitModel) => u.key)
      );
      const uniqueKeys = new Set(allKeys);

      expect(uniqueKeys.size).toBe(allKeys.length);
    });

    it("should generate floor labels in ascending order", () => {
      const spec: BuildingGenSpec = {
        floors: 5,
        apartmentsPerFloor: 2,
        layout: "grid",
        template: "2br",
        floorHeightM: 3,
        unitWidthM: 10,
        unitDepthM: 8,
        gapM: 1.2,
        slabThicknessM: 0.15,
      };

      const model = generateBuildingModel(spec);

      model.floors.forEach((floor: FloorModel, index: number) => {
        expect(floor.index).toBe(index);
        expect(floor.elevationM).toBe(index * 3);
      });
    });

    it("should generate rooms for each unit", () => {
      const spec: BuildingGenSpec = {
        floors: 2,
        apartmentsPerFloor: 2,
        layout: "grid",
        template: "2br",
        floorHeightM: 3,
        unitWidthM: 10,
        unitDepthM: 8,
        gapM: 1.2,
        slabThicknessM: 0.15,
      };

      const model = generateBuildingModel(spec);

      model.floors.forEach((floor: FloorModel) => {
        floor.units.forEach((unit: UnitModel) => {
          expect(unit.rooms.length).toBeGreaterThan(0);
          expect(unit.metadata.areaSqm).toBeGreaterThan(0);
        });
      });
    });

    it("should generate floor themes with valid colors", () => {
      const spec: BuildingGenSpec = {
        floors: 3,
        apartmentsPerFloor: 2,
        layout: "grid",
        template: "2br",
        floorHeightM: 3,
        unitWidthM: 10,
        unitDepthM: 8,
        gapM: 1.2,
        slabThicknessM: 0.15,
      };

      const model = generateBuildingModel(spec);

      model.floors.forEach((floor: FloorModel) => {
        expect(floor.theme).toBeDefined();
        expect(floor.theme.baseColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(floor.theme.accentColor).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(floor.theme.roomColors).toBeDefined();
      });
    });

    it("should calculate correct building bounds", () => {
      const spec: BuildingGenSpec = {
        floors: 4,
        apartmentsPerFloor: 3,
        layout: "grid",
        template: "2br",
        floorHeightM: 3,
        unitWidthM: 10,
        unitDepthM: 8,
        gapM: 1.2,
        slabThicknessM: 0.15,
      };

      const model = generateBuildingModel(spec);

      expect(model.bounds).toBeDefined();
      expect(model.bounds.height).toBe(4 * 3); // floors * floorHeight
      expect(model.bounds.width).toBeGreaterThan(0);
      expect(model.bounds.depth).toBeGreaterThan(0);
    });

    it("should be deterministic with same seed", () => {
      const spec: BuildingGenSpec = {
        floors: 3,
        apartmentsPerFloor: 2,
        layout: "grid",
        template: "mixed",
        floorHeightM: 3,
        unitWidthM: 10,
        unitDepthM: 8,
        gapM: 1.2,
        slabThicknessM: 0.15,
        seed: "deterministic-test-seed",
      };

      const model1 = generateBuildingModel(spec);
      const model2 = generateBuildingModel(spec);

      // Same seed should produce same unit keys
      const keys1 = model1.floors.flatMap((f: FloorModel) =>
        f.units.map((u: UnitModel) => u.key)
      );
      const keys2 = model2.floors.flatMap((f: FloorModel) =>
        f.units.map((u: UnitModel) => u.key)
      );

      expect(keys1).toEqual(keys2);
    });
  });

  describe("Unit templates", () => {
    it("should handle studio template", () => {
      const spec: BuildingGenSpec = {
        floors: 1,
        apartmentsPerFloor: 1,
        layout: "grid",
        template: "studio",
        floorHeightM: 3,
        unitWidthM: 10,
        unitDepthM: 8,
        gapM: 1.2,
        slabThicknessM: 0.15,
      };

      const model = generateBuildingModel(spec);
      const unit = model.floors[0].units[0];

      // Studio should have 0 bedrooms
      expect(unit.metadata.bedrooms).toBe(0);
    });

    it("should handle 1br template", () => {
      const spec: BuildingGenSpec = {
        floors: 1,
        apartmentsPerFloor: 1,
        layout: "grid",
        template: "1br",
        floorHeightM: 3,
        unitWidthM: 10,
        unitDepthM: 8,
        gapM: 1.2,
        slabThicknessM: 0.15,
      };

      const model = generateBuildingModel(spec);
      const unit = model.floors[0].units[0];

      expect(unit.metadata.bedrooms).toBe(1);
    });

    it("should handle 3br template", () => {
      const spec: BuildingGenSpec = {
        floors: 1,
        apartmentsPerFloor: 1,
        layout: "grid",
        template: "3br",
        floorHeightM: 3,
        unitWidthM: 10,
        unitDepthM: 8,
        gapM: 1.2,
        slabThicknessM: 0.15,
      };

      const model = generateBuildingModel(spec);
      const unit = model.floors[0].units[0];

      expect(unit.metadata.bedrooms).toBe(3);
    });
  });

  describe("Layout modes", () => {
    it("should generate grid layout", () => {
      const spec: BuildingGenSpec = {
        floors: 2,
        apartmentsPerFloor: 4,
        layout: "grid",
        template: "2br",
        floorHeightM: 3,
        unitWidthM: 10,
        unitDepthM: 8,
        gapM: 1.2,
        slabThicknessM: 0.15,
      };

      const model = generateBuildingModel(spec);

      // Grid layout: units arranged in a grid pattern
      expect(model.floors[0].units.length).toBe(4);
    });

    it("should generate corridor layout", () => {
      const spec: BuildingGenSpec = {
        floors: 2,
        apartmentsPerFloor: 4,
        layout: "corridor",
        template: "2br",
        floorHeightM: 3,
        unitWidthM: 10,
        unitDepthM: 8,
        gapM: 1.2,
        slabThicknessM: 0.15,
      };

      const model = generateBuildingModel(spec);

      // Corridor layout should still have correct unit count
      expect(model.floors[0].units.length).toBe(4);
    });
  });

  describe("Edge cases", () => {
    it("should handle single floor building", () => {
      const spec: BuildingGenSpec = {
        floors: 1,
        apartmentsPerFloor: 1,
        layout: "grid",
        template: "2br",
        floorHeightM: 3,
        unitWidthM: 10,
        unitDepthM: 8,
        gapM: 1.2,
        slabThicknessM: 0.15,
      };

      const model = generateBuildingModel(spec);

      expect(model.floors).toHaveLength(1);
      expect(model.floors[0].units).toHaveLength(1);
    });

    it("should handle large building (max floors)", () => {
      const spec: BuildingGenSpec = {
        floors: 120,
        apartmentsPerFloor: 1,
        layout: "grid",
        template: "2br",
        floorHeightM: 3,
        unitWidthM: 10,
        unitDepthM: 8,
        gapM: 1.2,
        slabThicknessM: 0.15,
      };

      const model = generateBuildingModel(spec);

      expect(model.floors).toHaveLength(120);
      expect(model.bounds.height).toBe(120 * 3);
    });

    it("should handle many apartments per floor", () => {
      const spec: BuildingGenSpec = {
        floors: 1,
        apartmentsPerFloor: 50,
        layout: "grid",
        template: "studio",
        floorHeightM: 3,
        unitWidthM: 6,
        unitDepthM: 6,
        gapM: 0.5,
        slabThicknessM: 0.15,
      };

      const model = generateBuildingModel(spec);

      expect(model.floors[0].units).toHaveLength(50);
    });
  });
});
