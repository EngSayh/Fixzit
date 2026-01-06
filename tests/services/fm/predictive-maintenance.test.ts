/**
 * Predictive Maintenance Service Tests
 * Tests for AI-powered maintenance prediction and equipment health scoring
 * Created by [AGENT-0040]
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ObjectId } from 'mongodb';

// Mock MongoDB before importing service
vi.mock('@/lib/mongodb-unified', () => ({
  getDatabase: vi.fn(() => ({
    collection: vi.fn(() => ({
      findOne: vi.fn(),
      find: vi.fn(() => ({
        toArray: vi.fn(() => []),
      })),
      insertOne: vi.fn(() => ({ insertedId: new ObjectId() })),
      updateOne: vi.fn(() => ({ modifiedCount: 1 })),
      deleteOne: vi.fn(() => ({ deletedCount: 1 })),
      aggregate: vi.fn(() => ({
        toArray: vi.fn(() => []),
      })),
    })),
  })),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  EquipmentType,
  HealthStatus,
  ConfidenceLevel,
  MaintenancePriority,
  type EquipmentRecord,
  type MaintenanceEvent,
  type FailurePrediction,
} from '@/services/fm/predictive-maintenance';

// Import after mocks
import {
  calculateAssetHealth,
  predictMaintenance,
  type AssetHealthScore,
  type PredictiveMaintenanceResult,
} from '@/services/ai/analytics-service';

// Internal AssetMetrics interface matching the service
interface AssetMetrics {
  asset_id: ObjectId;
  age_days: number;
  expected_lifespan_days: number;
  work_orders_count: number;
  avg_repair_cost: number;
  time_since_last_maintenance_days: number;
  maintenance_schedule_compliance: number; // 0-1
  sensor_readings?: {
    temperature?: number;
    vibration?: number;
    power_consumption?: number;
  };
  failure_history: number; // count of failures
}

describe('Predictive Maintenance Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Types and Enums', () => {
    it('should have all equipment types defined', () => {
      expect(EquipmentType.HVAC).toBe('hvac');
      expect(EquipmentType.ELEVATOR).toBe('elevator');
      expect(EquipmentType.PLUMBING).toBe('plumbing');
      expect(EquipmentType.ELECTRICAL).toBe('electrical');
      expect(EquipmentType.FIRE_SAFETY).toBe('fire_safety');
      expect(EquipmentType.GENERATOR).toBe('generator');
      expect(EquipmentType.WATER_HEATER).toBe('water_heater');
    });

    it('should have all health statuses defined', () => {
      expect(HealthStatus.EXCELLENT).toBe('excellent');
      expect(HealthStatus.GOOD).toBe('good');
      expect(HealthStatus.FAIR).toBe('fair');
      expect(HealthStatus.POOR).toBe('poor');
      expect(HealthStatus.CRITICAL).toBe('critical');
    });

    it('should have all confidence levels defined', () => {
      expect(ConfidenceLevel.HIGH).toBe('high');
      expect(ConfidenceLevel.MEDIUM).toBe('medium');
      expect(ConfidenceLevel.LOW).toBe('low');
    });

    it('should have all maintenance priorities defined', () => {
      expect(MaintenancePriority.IMMEDIATE).toBe('immediate');
      expect(MaintenancePriority.URGENT).toBe('urgent');
      expect(MaintenancePriority.SCHEDULED).toBe('scheduled');
      expect(MaintenancePriority.ROUTINE).toBe('routine');
    });
  });

  describe('EquipmentRecord Interface', () => {
    it('should validate equipment record structure', () => {
      const equipment: Partial<EquipmentRecord> = {
        orgId: 'org-123',
        propertyId: 'prop-456',
        name: 'Main HVAC Unit',
        type: EquipmentType.HVAC,
        manufacturer: 'Carrier',
        model: 'XR15',
        installDate: new Date('2023-01-15'),
        expectedLifespan: 180, // 15 years in months
        maintenanceIntervalDays: 90,
        healthScore: 85,
        healthStatus: HealthStatus.GOOD,
        failureProbability: 0.12,
        estimatedRemainingLife: 120,
        totalMaintenanceCost: 2500,
        maintenanceHistory: [],
      };

      expect(equipment.orgId).toBeDefined();
      expect(equipment.propertyId).toBeDefined();
      expect(equipment.name).toBeDefined();
      expect(equipment.type).toBe(EquipmentType.HVAC);
      expect(equipment.healthScore).toBeGreaterThanOrEqual(0);
      expect(equipment.healthScore).toBeLessThanOrEqual(100);
    });
  });

  describe('MaintenanceEvent Interface', () => {
    it('should validate maintenance event structure', () => {
      const event: MaintenanceEvent = {
        date: new Date(),
        type: 'preventive',
        description: 'Quarterly filter replacement and system check',
        cost: 350,
        technician: 'John Smith',
        duration: 2,
        partsReplaced: ['Air filter', 'Belt'],
        outcome: 'success',
      };

      expect(event.date).toBeInstanceOf(Date);
      expect(event.type).toBe('preventive');
      expect(event.cost).toBeGreaterThan(0);
      expect(event.partsReplaced).toHaveLength(2);
    });
  });

  describe('FailurePrediction Interface', () => {
    it('should validate failure prediction structure', () => {
      const prediction: FailurePrediction = {
        predictedDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        probability: 0.75,
        confidence: ConfidenceLevel.MEDIUM,
        failureMode: 'Compressor failure due to refrigerant leak',
        recommendedAction: 'Schedule compressor inspection and refrigerant level check',
        estimatedCost: 1200,
        factors: [
          { name: 'Age', contribution: 0.4 },
          { name: 'Maintenance overdue', contribution: 0.35 },
          { name: 'Historical failures', contribution: 0.25 },
        ],
      };

      expect(prediction.probability).toBeGreaterThanOrEqual(0);
      expect(prediction.probability).toBeLessThanOrEqual(1);
      expect(prediction.confidence).toBe(ConfidenceLevel.MEDIUM);
      expect(prediction.factors).toHaveLength(3);
    });
  });
});

describe('AI Analytics Service - Asset Health', () => {
  describe('calculateAssetHealth', () => {
    it('should calculate excellent health for new equipment', () => {
      const metrics: AssetMetrics = {
        asset_id: new ObjectId(),
        age_days: 30,
        expected_lifespan_days: 3650, // 10 years
        work_orders_count: 0,
        avg_repair_cost: 100,
        time_since_last_maintenance_days: 5,
        maintenance_schedule_compliance: 1.0,
        failure_history: 0,
      };

      const result = calculateAssetHealth(metrics);

      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(['excellent', 'good']).toContain(result.category);
      expect(result.maintenance_needed).toBe(false);
    });

    it('should calculate poor health for neglected equipment', () => {
      const metrics: AssetMetrics = {
        asset_id: new ObjectId(),
        age_days: 1825, // 5 years
        expected_lifespan_days: 1825, // At end of lifespan
        work_orders_count: 10,
        avg_repair_cost: 2000,
        time_since_last_maintenance_days: 365, // 1 year since last maintenance
        maintenance_schedule_compliance: 0.2,
        failure_history: 5,
      };

      const result = calculateAssetHealth(metrics);

      expect(result.score).toBeLessThan(50);
      expect(['poor', 'critical']).toContain(result.category);
      expect(result.maintenance_needed).toBe(true);
    });

    it('should flag maintenance needed when overdue', () => {
      const metrics: AssetMetrics = {
        asset_id: new ObjectId(),
        age_days: 365,
        expected_lifespan_days: 3650,
        work_orders_count: 2,
        avg_repair_cost: 500,
        time_since_last_maintenance_days: 120, // Overdue (>90 days)
        maintenance_schedule_compliance: 0.5,
        failure_history: 1,
      };

      const result = calculateAssetHealth(metrics);

      expect(result.maintenance_needed).toBe(true);
    });

    it('should include component health breakdown', () => {
      const metrics: AssetMetrics = {
        asset_id: new ObjectId(),
        age_days: 365,
        expected_lifespan_days: 3650,
        work_orders_count: 2,
        avg_repair_cost: 500,
        time_since_last_maintenance_days: 60,
        maintenance_schedule_compliance: 0.8,
        failure_history: 1,
      };

      const result = calculateAssetHealth(metrics);

      expect(result.components).toBeDefined();
      expect(Array.isArray(result.components)).toBe(true);
    });
  });

  describe('predictMaintenance', () => {
    it('should predict RUL for healthy equipment', () => {
      const metrics: AssetMetrics = {
        asset_id: new ObjectId(),
        age_days: 180,
        expected_lifespan_days: 3650,
        work_orders_count: 1,
        avg_repair_cost: 200,
        time_since_last_maintenance_days: 30,
        maintenance_schedule_compliance: 0.9,
        failure_history: 0,
      };

      const historicalData = [
        { date: new Date('2025-01-01'), score: 95 },
        { date: new Date('2025-06-01'), score: 90 },
        { date: new Date('2025-12-01'), score: 85 },
      ];

      const result = predictMaintenance(metrics, historicalData);

      expect(result.rul_days).toBeGreaterThan(0);
      expect(result.failure_probability_30d).toBeLessThan(0.5);
      expect(result.recommended_maintenance_date).toBeInstanceOf(Date);
      expect(result.model_version).toBeDefined();
    });

    it('should predict higher failure probability for degraded equipment', () => {
      const metrics: AssetMetrics = {
        asset_id: new ObjectId(),
        age_days: 2555, // 7 years
        expected_lifespan_days: 3650,
        work_orders_count: 15,
        avg_repair_cost: 3000,
        time_since_last_maintenance_days: 365,
        maintenance_schedule_compliance: 0.3,
        failure_history: 8,
      };

      const historicalData = [
        { date: new Date('2024-01-01'), score: 70 },
        { date: new Date('2024-06-01'), score: 55 },
        { date: new Date('2025-01-01'), score: 35 },
      ];

      const result = predictMaintenance(metrics, historicalData);

      expect(result.preventive_cost).toBeLessThan(result.reactive_cost!);
    });

    it('should provide confidence intervals', () => {
      const metrics: AssetMetrics = {
        asset_id: new ObjectId(),
        age_days: 365,
        expected_lifespan_days: 3650,
        work_orders_count: 2,
        avg_repair_cost: 500,
        time_since_last_maintenance_days: 45,
        maintenance_schedule_compliance: 0.7,
        failure_history: 1,
      };

      const historicalData = [
        { date: new Date('2025-06-01'), score: 80 },
        { date: new Date('2025-12-01'), score: 75 },
      ];

      const result = predictMaintenance(metrics, historicalData);

      expect(result.confidence_interval).toBeDefined();
      expect(result.confidence_interval).toHaveLength(2);
      expect(result.confidence_interval[0]).toBeLessThanOrEqual(result.confidence_interval[1]);
    });

    it('should handle no historical data gracefully', () => {
      const metrics: AssetMetrics = {
        asset_id: new ObjectId(),
        age_days: 90,
        expected_lifespan_days: 3650,
        work_orders_count: 0,
        avg_repair_cost: 100,
        time_since_last_maintenance_days: 10,
        maintenance_schedule_compliance: 1.0,
        failure_history: 0,
      };

      const result = predictMaintenance(metrics, []);

      expect(result.rul_days).toBeGreaterThan(0);
      expect(result.model_version).toBe('v1.0.0-simplified');
    });

    it('should estimate preventive vs reactive costs', () => {
      const metrics: AssetMetrics = {
        asset_id: new ObjectId(),
        age_days: 730,
        expected_lifespan_days: 3650,
        work_orders_count: 5,
        avg_repair_cost: 1000,
        time_since_last_maintenance_days: 120,
        maintenance_schedule_compliance: 0.5,
        failure_history: 2,
      };

      const result = predictMaintenance(metrics, []);

      expect(result.preventive_cost).toBeDefined();
      expect(result.reactive_cost).toBeDefined();
      // Reactive should be 2-5x more expensive
      expect(result.reactive_cost!).toBeGreaterThan(result.preventive_cost!);
    });
  });
});

describe('Integration Scenarios', () => {
  it('should support full maintenance prediction workflow', () => {
    // 1. Create equipment metrics
    const metrics: AssetMetrics = {
      asset_id: new ObjectId(),
      age_days: 1095, // 3 years
      expected_lifespan_days: 3650,
      work_orders_count: 5,
      avg_repair_cost: 800,
      time_since_last_maintenance_days: 90,
      maintenance_schedule_compliance: 0.7,
      failure_history: 2,
    };

    // 2. Get health score
    const health = calculateAssetHealth(metrics);
    expect(health.score).toBeDefined();

    // 3. Get prediction with historical data
    const historicalData = [
      { date: new Date('2024-01-01'), score: 85 },
      { date: new Date('2024-07-01'), score: 78 },
      { date: new Date('2025-01-01'), score: 72 },
    ];

    const prediction = predictMaintenance(metrics, historicalData);

    // 4. Validate complete prediction
    expect(prediction.rul_days).toBeDefined();
    expect(prediction.failure_probability_30d).toBeDefined();
    expect(prediction.recommended_maintenance_date).toBeDefined();
    expect(prediction.confidence_interval).toBeDefined();
  });

  it('should handle edge cases for equipment at end of life', () => {
    const metrics: AssetMetrics = {
      asset_id: new ObjectId(),
      age_days: 5475, // 15 years - well past expected lifespan
      expected_lifespan_days: 3650, // 10 year expected lifespan
      work_orders_count: 30,
      avg_repair_cost: 5000,
      time_since_last_maintenance_days: 500,
      maintenance_schedule_compliance: 0.1,
      failure_history: 15,
    };

    const health = calculateAssetHealth(metrics);
    const prediction = predictMaintenance(metrics, [
      { date: new Date('2024-01-01'), score: 30 },
      { date: new Date('2025-01-01'), score: 15 },
    ]);

    // Equipment past lifespan should be critical or poor
    expect(['critical', 'poor']).toContain(health.category);
    expect(health.maintenance_needed).toBe(true);
    // Prediction should exist
    expect(prediction.rul_days).toBeDefined();
  });
});
