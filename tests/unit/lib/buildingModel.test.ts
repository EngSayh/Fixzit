/**
 * Unit tests for Building Model generation
 * @module tests/unit/lib/buildingModel.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  generateBuildingModel,
  attachUnitDbIds,
  type BuildingGenSpec,
} from '@/lib/buildingModel';

describe('buildingModel', () => {
  describe('generateBuildingModel', () => {
    it('should generate a valid building model with basic spec', () => {
      const spec: BuildingGenSpec = {
        floors: 3,
        apartmentsPerFloor: 4,
        layout: 'grid',
        floorHeightM: 3,
        unitWidthM: 10,
        unitDepthM: 8,
        gapM: 1.2,
        slabThicknessM: 0.15,
        template: '2br',
      };

      const model = generateBuildingModel(spec);

      // Validate schema version
      expect(model.schemaVersion).toBe('1.0.0');

      // Validate floor count
      expect(model.floors).toHaveLength(3);

      // Validate apartments per floor
      model.floors.forEach((floor) => {
        expect(floor.units).toHaveLength(4);
      });

      // Validate unit metadata for 2br template
      const firstUnit = model.floors[0].units[0];
      expect(firstUnit.metadata.bedrooms).toBe(2);
      expect(firstUnit.metadata.bathrooms).toBeGreaterThan(0);
      expect(firstUnit.metadata.areaSqm).toBeGreaterThan(0);

      // Validate rooms are created
      expect(firstUnit.rooms.length).toBeGreaterThan(0);
    });

    it('should generate studio apartments with correct room count', () => {
      const spec: BuildingGenSpec = {
        floors: 1,
        apartmentsPerFloor: 2,
        layout: 'grid',
        template: 'studio',
      };

      const model = generateBuildingModel(spec);
      const unit = model.floors[0].units[0];

      expect(unit.metadata.bedrooms).toBe(0);
      expect(unit.rooms.some((r) => r.kind === 'living')).toBe(true);
      expect(unit.rooms.some((r) => r.kind === 'bathroom')).toBe(true);
      expect(unit.rooms.some((r) => r.kind === 'kitchen')).toBe(true);
    });

    it('should generate 3br apartments with correct room count', () => {
      const spec: BuildingGenSpec = {
        floors: 1,
        apartmentsPerFloor: 2,
        layout: 'grid',
        template: '3br',
      };

      const model = generateBuildingModel(spec);
      const unit = model.floors[0].units[0];

      expect(unit.metadata.bedrooms).toBe(3);
      const bedrooms = unit.rooms.filter((r) => r.kind === 'bedroom');
      expect(bedrooms.length).toBe(3);
    });

    it('should create unique unit keys for all units', () => {
      const spec: BuildingGenSpec = {
        floors: 5,
        apartmentsPerFloor: 10,
        layout: 'grid',
        template: '2br',
      };

      const model = generateBuildingModel(spec);
      const allKeys = model.floors.flatMap((floor) =>
        floor.units.map((u) => u.key)
      );

      const uniqueKeys = new Set(allKeys);
      expect(uniqueKeys.size).toBe(allKeys.length);
    });

    it('should enforce minimum and maximum constraints', () => {
      const validSpec: BuildingGenSpec = {
        floors: 120,
        apartmentsPerFloor: 200,
        layout: 'grid',
        template: '2br',
      };

      // Should not throw for valid max values
      expect(() => generateBuildingModel(validSpec)).not.toThrow();
    });

    it('should generate corridor layout with different positioning', () => {
      const gridSpec: BuildingGenSpec = {
        floors: 1,
        apartmentsPerFloor: 4,
        layout: 'grid',
        template: '2br',
      };

      const corridorSpec: BuildingGenSpec = {
        ...gridSpec,
        layout: 'corridor',
      };

      const gridModel = generateBuildingModel(gridSpec);
      const corridorModel = generateBuildingModel(corridorSpec);

      // Unit positions should differ between layouts
      const gridPos = gridModel.floors[0].units[0].position;
      const corridorPos = corridorModel.floors[0].units[0].position;

      expect(gridPos).not.toEqual(corridorPos);
    });

    it('should use deterministic seed for reproducibility', () => {
      const spec: BuildingGenSpec = {
        floors: 2,
        apartmentsPerFloor: 3,
        layout: 'grid',
        template: '2br',
        seed: 'test-seed-123',
      };

      const model1 = generateBuildingModel(spec);
      const model2 = generateBuildingModel(spec);

      // Should generate identical models with same seed
      expect(model1.floors[0].units[0].key).toBe(
        model2.floors[0].units[0].key
      );
      expect(model1.floors[0].units[0].position).toEqual(
        model2.floors[0].units[0].position
      );
    });

    it('should preserve prompt in model spec', () => {
      const spec: BuildingGenSpec = {
        floors: 1,
        apartmentsPerFloor: 2,
        layout: 'grid',
        template: '2br',
        prompt: 'Modern luxury design with open floor plan',
      };

      const model = generateBuildingModel(spec);

      expect(model.spec.prompt).toBe(
        'Modern luxury design with open floor plan'
      );
    });
  });

  describe('attachUnitDbIds', () => {
    it('should attach database IDs to units by designKey', () => {
      const spec: BuildingGenSpec = {
        floors: 1,
        apartmentsPerFloor: 2,
        layout: 'grid',
        template: '2br',
      };

      const model = generateBuildingModel(spec);
      const unitKey = model.floors[0].units[0].key;

      const dbUnits = [
        {
          _id: 'db-unit-123',
          designKey: unitKey,
          electricityMeter: 'EM-001',
          waterMeter: 'WM-001',
        },
      ];

      const hydratedModel = attachUnitDbIds(model, dbUnits);

      expect(hydratedModel.floors[0].units[0].metadata.unitDbId).toBe(
        'db-unit-123'
      );
      expect(hydratedModel.floors[0].units[0].metadata.electricityMeter).toBe(
        'EM-001'
      );
      expect(hydratedModel.floors[0].units[0].metadata.waterMeter).toBe(
        'WM-001'
      );
    });

    it('should handle missing DB units gracefully', () => {
      const spec: BuildingGenSpec = {
        floors: 1,
        apartmentsPerFloor: 2,
        layout: 'grid',
        template: '2br',
      };

      const model = generateBuildingModel(spec);
      const hydratedModel = attachUnitDbIds(model, []);

      // Should not throw and units should not have DB IDs
      expect(hydratedModel.floors[0].units[0].metadata.unitDbId).toBeUndefined();
    });
  });
});
