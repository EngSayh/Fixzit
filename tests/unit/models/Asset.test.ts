/**
 * Asset model unit tests
 * Testing library/framework: Vitest
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { Asset } from '@/server/models/Asset';
import type { AssetDoc } from '@/server/models/Asset';

type AnyObj = Record<string, any>;
type PartialAsset = Partial<AssetDoc> & AnyObj;

function buildValidAsset(overrides: PartialAsset = {}): AnyObj {
  return {
    tenantId: 'tenant-123',
    code: `ASSET-${Math.random().toString(36).slice(2, 8)}`,
    name: 'Main Asset',
    type: 'HVAC',
    category: 'MEP',
    propertyId: 'property-001',
    createdBy: 'tester',
    // Providing optional fields with valid shapes to exercise nested schemas
    pmSchedule: { frequency: 90, lastPM: new Date('2024-01-01'), nextPM: new Date('2024-04-01'), tasks: ['Inspect', 'Clean'] },
    condition: {
      score: 75,
      lastAssessment: new Date('2024-01-15'),
      nextAssessment: new Date('2024-04-15'),
      sensors: [{
        type: 'Temperature',
        location: 'Outlet',
        thresholds: { min: 10, max: 90, critical: 95 },
        readings: [{ value: 55, timestamp: new Date('2024-02-01'), status: 'NORMAL' }]
      }],
      alerts: [{ type: 'PREDICTIVE', message: 'OK', timestamp: new Date('2024-02-02'), resolved: true }]
    },
    depreciation: { method: 'STRAIGHT_LINE', rate: 10, accumulated: 0, bookValue: 10000, salvageValue: 500 },
    maintenanceHistory: [{
      type: 'PREVENTIVE',
      date: new Date('2023-12-01'),
      description: 'Routine maintenance',
      technician: 'tech-1',
      cost: 120,
      workOrderId: 'WO-1',
      nextDue: new Date('2024-03-01'),
      notes: 'All good'
    }],
    ...overrides,
  };
}

describe('Asset model schema', () => {
  it('validates a minimally valid asset and applies default status and criticality', () => {
    const data = buildValidAsset({ status: undefined, criticality: undefined });
    const doc = new (Asset as any)(data);
    const err = doc.validateSync();
    expect(err).toBeUndefined();
    expect(doc.status).toBe('ACTIVE');
    expect(doc.criticality).toBe('MEDIUM');
  });

  it('fails validation when required fields are missing', () => {
    const required = ['tenantId', 'code', 'name', 'type', 'category', 'propertyId', 'createdBy'] as const;
    for (const field of required) {
      const data = buildValidAsset();
      delete (data as AnyObj)[field];
      const doc = new (Asset as any)(data);
      const err = doc.validateSync();
      expect(err).toBeDefined();
      expect((err as AnyObj).errors?.[field]).toBeDefined();
    }
  });

  it('enforces enum for "type"', () => {
    const ok = new (Asset as any)(buildValidAsset({ type: 'ELECTRICAL' }));
    expect(ok.validateSync()).toBeUndefined();

    const bad = new (Asset as any)(buildValidAsset({ type: 'INVALID_TYPE' as any }));
    const err = bad.validateSync();
    expect(err).toBeDefined();
    expect((err as AnyObj).errors?.type).toBeDefined();
  });

  it('enforces enum for "status" and "criticality"', () => {
    const badStatus = new (Asset as any)(buildValidAsset({ status: 'BROKEN' as any }));
    const errStatus = badStatus.validateSync();
    expect(errStatus).toBeDefined();
    expect((errStatus as AnyObj).errors?.status).toBeDefined();

    const badCrit = new (Asset as any)(buildValidAsset({ criticality: 'ULTRA' as any }));
    const errCrit = badCrit.validateSync();
    expect(errCrit).toBeDefined();
    expect((errCrit as AnyObj).errors?.criticality).toBeDefined();
  });

  it('enforces condition.score boundaries (0..100 inclusive)', () => {
    let doc = new (Asset as any)(buildValidAsset({ condition: { ...buildValidAsset().condition, score: -1 } }));
    expect(doc.validateSync()?.errors?.['condition.score']).toBeDefined();

    doc = new (Asset as any)(buildValidAsset({ condition: { ...buildValidAsset().condition, score: 101 } }));
    expect(doc.validateSync()?.errors?.['condition.score']).toBeDefined();

    doc = new (Asset as any)(buildValidAsset({ condition: { ...buildValidAsset().condition, score: 0 } }));
    expect(doc.validateSync()).toBeUndefined();

    doc = new (Asset as any)(buildValidAsset({ condition: { ...buildValidAsset().condition, score: 100 } }));
    expect(doc.validateSync()).toBeUndefined();
  });

  it('validates maintenanceHistory.type against its enum', () => {
    const ok = new (Asset as any)(buildValidAsset({ maintenanceHistory: [{ type: 'INSPECTION' }] as any }));
    expect(ok.validateSync()).toBeUndefined();

    const bad = new (Asset as any)(buildValidAsset({ maintenanceHistory: [{ type: 'RANDOM' }] as any }));
    const err = bad.validateSync();
    expect(err).toBeDefined();
    expect((err as AnyObj).errors?.['maintenanceHistory.0.type']).toBeDefined();
  });

  it('validates depreciation.method enum', () => {
    const ok = new (Asset as any)(buildValidAsset({ depreciation: { ...buildValidAsset().depreciation, method: 'DECLINING_BALANCE' } }));
    expect(ok.validateSync()).toBeUndefined();

    const bad = new (Asset as any)(buildValidAsset({ depreciation: { ...buildValidAsset().depreciation, method: 'RANDOM' as any } }));
    const err = bad.validateSync();
    expect(err).toBeDefined();
    expect((err as AnyObj).errors?.['depreciation.method']).toBeDefined();
  });

  it('exposes expected indexes on the schema', () => {
    const indexes: Array<[Record<string, any>, Record<string, any>]> = (Asset as any).schema.indexes();

    const hasIndex = (fields: Record<string, 1 | -1>) =>
      indexes.some(([idx]) => Object.keys(fields).length === Object.keys(idx).length &&
        Object.entries(fields).every(([k, v]) => idx[k] === v));

    expect(hasIndex({ tenantId: 1, type: 1 })).toBe(true);
    expect(hasIndex({ tenantId: 1, status: 1 })).toBe(true);
    expect(hasIndex({ tenantId: 1, 'pmSchedule.nextPM': 1 })).toBe(true);
    expect(hasIndex({ tenantId: 1, 'condition.score': 1 })).toBe(true);
  });

  it('configures timestamps and unique constraint for "code"', () => {
    const schema: AnyObj = (Asset as any).schema;
    expect(schema?.options?.timestamps).toBe(true);

    const codePath: AnyObj = schema.path('code');
    expect(codePath?.options?.unique).toBe(true);

    expect(schema.path('createdAt')).toBeDefined();
    expect(schema.path('updatedAt')).toBeDefined();
  });
});
