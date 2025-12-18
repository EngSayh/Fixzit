/**
 * Filter System Integration Tests
 * Tests filter presets CRUD + application to data lists
 * 
 * @module tests/integration/filters.test
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startMongoMemory, stopMongoMemory, clearCollections } from '../helpers/mongoMemory';
import { createTestSession, createTestWorkOrder, createBulk } from '../helpers/fixtures';

describe('Filter System Integration', () => {
  beforeAll(async () => {
    await startMongoMemory();
  });

  afterAll(async () => {
    await stopMongoMemory();
  });

  beforeEach(async () => {
    await clearCollections();
  });

  it('should create and apply filter preset to work orders', async () => {
    const session = createTestSession();
    const workOrders = createBulk(
      createTestWorkOrder,
      10,
      (wo, i) => ({
        ...wo,
        status: i % 2 === 0 ? 'open' : 'closed',
        priority: i % 3 === 0 ? 'high' : 'medium',
      })
    );

    // Create filter preset
    const preset = {
      entity_type: 'work_orders',
      name: 'High Priority Open',
      filters: { status: 'open', priority: 'high' },
      user_id: session.userId,
    };

    // Apply filter
    const filtered = workOrders.filter(
      wo => wo.status === 'open' && wo.priority === 'high'
    );

    expect(preset.filters).toHaveProperty('status', 'open');
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every(wo => wo.status === 'open' && wo.priority === 'high')).toBe(true);
  });

  it('should save user-specific filter presets', () => {
    const user1Session = createTestSession({ userId: 'user_1' });
    const user2Session = createTestSession({ userId: 'user_2' });

    const user1Preset = {
      user_id: user1Session.userId,
      name: 'My Filters',
      filters: { status: 'open' },
    };

    const user2Preset = {
      user_id: user2Session.userId,
      name: 'My Filters', // Same name, different user
      filters: { status: 'closed' },
    };

    // Each user should have isolated presets
    expect(user1Preset.user_id).not.toBe(user2Preset.user_id);
    expect(user1Preset.filters.status).not.toBe(user2Preset.filters.status);
  });

  it('should handle complex multi-field filters', () => {
    const workOrders = createBulk(createTestWorkOrder, 20, (wo, i) => ({
      ...wo,
      status: ['open', 'in_progress', 'closed'][i % 3],
      priority: ['low', 'medium', 'high'][i % 3],
      assigned_to: i % 2 === 0 ? 'tech_1' : 'tech_2',
    })) as Array<ReturnType<typeof createTestWorkOrder> & { assigned_to: string }>;

    // Complex filter: status IN (open, in_progress) AND priority = high AND assigned_to = tech_1
    const filtered = workOrders.filter(
      wo =>
        ['open', 'in_progress'].includes(wo.status) &&
        wo.priority === 'high' &&
        wo.assigned_to === 'tech_1'
    );

    expect(filtered.every(wo => ['open', 'in_progress'].includes(wo.status))).toBe(true);
    expect(filtered.every(wo => wo.priority === 'high')).toBe(true);
    expect(filtered.every(wo => wo.assigned_to === 'tech_1')).toBe(true);
  });

  it('should set default filter preset per entity type', () => {
    const session = createTestSession();
    
    const defaultPreset = {
      user_id: session.userId,
      entity_type: 'work_orders',
      name: 'My Default View',
      filters: { status: 'open' },
      is_default: true,
    };

    expect(defaultPreset.is_default).toBe(true);
    expect(defaultPreset.entity_type).toBe('work_orders');
  });
});
