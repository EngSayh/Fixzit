/**
 * Safe Tenant Update Wrapper
 *
 * Wraps raw MongoDB collection operations to enforce tenant scoping.
 * This prevents cross-tenant write vulnerabilities by asserting that
 * all filters contain the required tenant key (orgId or property_owner_id).
 *
 * @see docs/engineering/audits/tenant-update-triage.md
 */

import type { Collection, Document, Filter, UpdateFilter, UpdateOptions, UpdateResult, BulkWriteOptions, AnyBulkWriteOperation, BulkWriteResult } from 'mongodb';

// Tenant keys that must be present in filters
const TENANT_KEYS = ['orgId', 'org_id', 'property_owner_id', 'propertyOwnerId'] as const;

interface TenantFilter {
  orgId?: string;
  org_id?: string;
  property_owner_id?: string;
  propertyOwnerId?: string;
}

/**
 * Asserts that a filter contains at least one tenant key.
 * Always throws to prevent unscoped cross-tenant writes.
 */
function assertTenantScope<T extends Document>(
  filter: Filter<T>,
  operation: string
): void {
  const hasTenantKey = TENANT_KEYS.some((key) => {
    const value = (filter as TenantFilter)[key];
    return value !== undefined && value !== null;
  });

  if (!hasTenantKey) {
    const message = `[TENANT_SAFETY] ${operation}: Filter missing tenant key (orgId, org_id, property_owner_id, or propertyOwnerId). Filter: ${JSON.stringify(filter)}`;
    // Always fail hard; missing tenant scope is a security bug.
    throw new Error(message);
  }
}

/**
 * Safe updateOne that enforces tenant scoping.
 *
 * @example
 * await safeTenantUpdateOne(collection, { _id: id, orgId: user.orgId }, { $set: { ... } });
 */
export async function safeTenantUpdateOne<T extends Document>(
  collection: Collection<T>,
  filter: Filter<T>,
  update: UpdateFilter<T> | Partial<T>,
  options?: UpdateOptions
): Promise<UpdateResult<T>> {
  assertTenantScope(filter, `updateOne on ${collection.collectionName}`);
  return collection.updateOne(filter, update, options);
}

/**
 * Safe updateMany that enforces tenant scoping.
 *
 * @example
 * await safeTenantUpdateMany(collection, { orgId: user.orgId, status: 'pending' }, { $set: { ... } });
 */
export async function safeTenantUpdateMany<T extends Document>(
  collection: Collection<T>,
  filter: Filter<T>,
  update: UpdateFilter<T>,
  options?: UpdateOptions
): Promise<UpdateResult<T>> {
  assertTenantScope(filter, `updateMany on ${collection.collectionName}`);
  return collection.updateMany(filter, update, options);
}

/**
 * Safe bulkWrite that enforces tenant scoping on all update operations.
 *
 * @example
 * await safeTenantBulkWrite(collection, [
 *   { updateOne: { filter: { _id: id1, orgId }, update: { $set: { ... } } } },
 *   { updateMany: { filter: { orgId, status: 'pending' }, update: { $set: { ... } } } },
 * ]);
 */
export async function safeTenantBulkWrite<T extends Document>(
  collection: Collection<T>,
  operations: AnyBulkWriteOperation<T>[],
  options?: BulkWriteOptions
): Promise<BulkWriteResult> {
  // Validate all update/replace operations have tenant scope
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];

    if ('updateOne' in op && op.updateOne) {
      assertTenantScope(op.updateOne.filter, `bulkWrite[${i}].updateOne on ${collection.collectionName}`);
    }
    if ('updateMany' in op && op.updateMany) {
      assertTenantScope(op.updateMany.filter, `bulkWrite[${i}].updateMany on ${collection.collectionName}`);
    }
    if ('replaceOne' in op && op.replaceOne) {
      assertTenantScope(op.replaceOne.filter, `bulkWrite[${i}].replaceOne on ${collection.collectionName}`);
    }
    if ('deleteOne' in op && op.deleteOne) {
      assertTenantScope(op.deleteOne.filter, `bulkWrite[${i}].deleteOne on ${collection.collectionName}`);
    }
    if ('deleteMany' in op && op.deleteMany) {
      assertTenantScope(op.deleteMany.filter, `bulkWrite[${i}].deleteMany on ${collection.collectionName}`);
    }
  }

  return collection.bulkWrite(operations, options);
}

/**
 * Utility to create a tenant-scoped filter.
 * Ensures the filter always includes the tenant key.
 *
 * @example
 * const filter = withTenantScope({ _id: id }, { orgId: user.orgId });
 * // Result: { _id: id, orgId: user.orgId }
 */
export function withTenantScope<T extends Document>(
  filter: Filter<T>,
  tenantScope: { orgId: string } | { property_owner_id: string }
): Filter<T> {
  return { ...filter, ...tenantScope } as Filter<T>;
}
