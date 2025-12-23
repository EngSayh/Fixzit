/**
 * Reusable Test Fixtures
 * Factory functions for creating consistent test data
 * 
 * @module tests/helpers/fixtures
 */

import type { Types } from 'mongoose';

/**
 * Generate consistent test ObjectId
 * @param seed - Number to generate deterministic ID
 */
export function testObjectId(seed: number = 1): Types.ObjectId {
  // Create deterministic 24-char hex string
  const hex = seed.toString(16).padStart(24, '0');
  return hex as unknown as Types.ObjectId;
}

/**
 * Create test session user
 */
export function createTestSession(overrides?: {
  userId?: string;
  orgId?: string;
  role?: string;
  isSuperAdmin?: boolean;
}) {
  return {
    userId: overrides?.userId || testObjectId(1).toString(),
    orgId: overrides?.orgId || testObjectId(100).toString(),
    role: overrides?.role || 'PROPERTY_MANAGER',
    isSuperAdmin: overrides?.isSuperAdmin ?? false,
    permissions: [],
    roles: [overrides?.role || 'PROPERTY_MANAGER'],
  };
}

/**
 * Create test work order
 */
export function createTestWorkOrder(overrides?: {
  _id?: Types.ObjectId | string;
  title?: string;
  status?: string;
  priority?: string;
  org_id?: Types.ObjectId | string;
  property_owner_id?: Types.ObjectId | string;
  assigned_to?: string | null;
}) {
  return {
    _id: overrides?._id || testObjectId(1),
    title: overrides?.title || 'Test Work Order',
    description: 'Test description',
    status: overrides?.status || 'open',
    priority: overrides?.priority || 'medium',
    org_id: overrides?.org_id || testObjectId(100),
    property_owner_id: overrides?.property_owner_id || testObjectId(200),
    assigned_to: overrides?.assigned_to ?? null,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
  };
}

/**
 * Create test user
 */
export function createTestUser(overrides?: {
  _id?: Types.ObjectId | string;
  email?: string;
  name?: string;
  role?: string;
  orgId?: Types.ObjectId | string;
}) {
  return {
    _id: overrides?._id || testObjectId(1),
    email: overrides?.email || 'test@example.com',
    name: overrides?.name || 'Test User',
    role: overrides?.role || 'PROPERTY_MANAGER',
    orgId: overrides?.orgId || testObjectId(100),
    isSuperAdmin: false,
    permissions: [],
    roles: [overrides?.role || 'PROPERTY_MANAGER'],
    status: 'active',
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
  };
}

/**
 * Create test organization
 */
export function createTestOrg(overrides?: {
  _id?: Types.ObjectId | string;
  name?: string;
  status?: string;
}) {
  return {
    _id: overrides?._id || testObjectId(100),
    name: overrides?.name || 'Test Organization',
    status: overrides?.status || 'active',
    subscription_plan: 'professional',
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
  };
}

/**
 * Create test invoice
 */
export function createTestInvoice(overrides?: {
  _id?: Types.ObjectId | string;
  invoice_number?: string;
  amount?: number;
  status?: string;
  org_id?: Types.ObjectId | string;
}) {
  return {
    _id: overrides?._id || testObjectId(1),
    invoice_number: overrides?.invoice_number || 'INV-001',
    amount: overrides?.amount || 1000.0,
    currency: 'SAR',
    status: overrides?.status || 'unpaid',
    org_id: overrides?.org_id || testObjectId(100),
    due_date: new Date('2025-12-31'),
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
  };
}

/**
 * Create test employee
 */
export function createTestEmployee(overrides?: {
  _id?: Types.ObjectId | string;
  name?: string;
  position?: string;
  org_id?: Types.ObjectId | string;
}) {
  return {
    _id: overrides?._id || testObjectId(1),
    name: overrides?.name || 'Test Employee',
    email: 'employee@example.com',
    position: overrides?.position || 'Technician',
    org_id: overrides?.org_id || testObjectId(100),
    status: 'active',
    hire_date: new Date('2025-01-01'),
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-01-01'),
  };
}

/**
 * Create bulk test data
 * @param factory - Factory function
 * @param count - Number of items to create
 * @param modifier - Function to modify each item based on index
 */
export function createBulk<T>(
  factory: (overrides?: any) => T,
  count: number,
  modifier?: (item: T, index: number) => T
): T[] {
  return Array.from({ length: count }, (_, i) => {
    const item = factory({ _id: testObjectId(i + 1) });
    return modifier ? modifier(item, i) : item;
  });
}
