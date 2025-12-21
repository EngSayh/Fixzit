/**
 * Tests for safe-tenant-update.ts
 *
 * Verifies that raw collection operations enforce tenant scoping.
 * @see docs/engineering/audits/tenant-update-triage.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

// Mock the collection before importing the module
const mockUpdateOne = vi.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 1 });
const mockUpdateMany = vi.fn().mockResolvedValue({ acknowledged: true, modifiedCount: 5 });
const mockBulkWrite = vi.fn().mockResolvedValue({ insertedCount: 0, matchedCount: 2 });

const mockCollection = {
  collectionName: 'test_collection',
  updateOne: mockUpdateOne,
  updateMany: mockUpdateMany,
  bulkWrite: mockBulkWrite,
};

describe('safe-tenant-update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset NODE_ENV to test mode
    vi.stubEnv('NODE_ENV', 'test');
  });

  describe('safeTenantUpdateOne', () => {
    it('allows updateOne with orgId in filter', async () => {
      const { safeTenantUpdateOne } = await import('@/lib/db/safe-tenant-update');
      const docId = new ObjectId();

      await safeTenantUpdateOne(
        mockCollection as any,
        { _id: docId, orgId: 'org-456' },
        { $set: { status: 'updated' } }
      );

      expect(mockUpdateOne).toHaveBeenCalledWith(
        { _id: docId, orgId: 'org-456' },
        { $set: { status: 'updated' } },
        undefined
      );
    });

    it('allows updateOne with property_owner_id in filter', async () => {
      const { safeTenantUpdateOne } = await import('@/lib/db/safe-tenant-update');
      const docId = new ObjectId();

      await safeTenantUpdateOne(
        mockCollection as any,
        { _id: docId, property_owner_id: 'owner-789' },
        { $set: { status: 'updated' } }
      );

      expect(mockUpdateOne).toHaveBeenCalled();
    });

    it('throws in test mode when filter lacks tenant key', async () => {
      const { safeTenantUpdateOne } = await import('@/lib/db/safe-tenant-update');
      const docId = new ObjectId();

      await expect(
        safeTenantUpdateOne(
          mockCollection as any,
          { _id: docId }, // Missing tenant key!
          { $set: { status: 'updated' } }
        )
      ).rejects.toThrow('[TENANT_SAFETY]');

      expect(mockUpdateOne).not.toHaveBeenCalled();
    });
  });

  describe('safeTenantUpdateMany', () => {
    it('allows updateMany with orgId in filter', async () => {
      const { safeTenantUpdateMany } = await import('@/lib/db/safe-tenant-update');

      await safeTenantUpdateMany(
        mockCollection as any,
        { orgId: 'org-456', status: 'pending' },
        { $set: { status: 'processed' } }
      );

      expect(mockUpdateMany).toHaveBeenCalledWith(
        { orgId: 'org-456', status: 'pending' },
        { $set: { status: 'processed' } },
        undefined
      );
    });

    it('throws in test mode when filter lacks tenant key', async () => {
      const { safeTenantUpdateMany } = await import('@/lib/db/safe-tenant-update');

      await expect(
        safeTenantUpdateMany(
          mockCollection as any,
          { status: 'pending' }, // Missing tenant key!
          { $set: { status: 'processed' } }
        )
      ).rejects.toThrow('[TENANT_SAFETY]');

      expect(mockUpdateMany).not.toHaveBeenCalled();
    });
  });

  describe('safeTenantBulkWrite', () => {
    it('allows bulkWrite when all operations have tenant key', async () => {
      const { safeTenantBulkWrite } = await import('@/lib/db/safe-tenant-update');
      const docId = new ObjectId();

      await safeTenantBulkWrite(mockCollection as any, [
        { updateOne: { filter: { _id: docId, orgId: 'org-1' }, update: { $set: { x: 1 } } } },
        { updateMany: { filter: { orgId: 'org-1', status: 'pending' }, update: { $set: { x: 2 } } } },
      ]);

      expect(mockBulkWrite).toHaveBeenCalled();
    });

    it('throws when any operation lacks tenant key', async () => {
      const { safeTenantBulkWrite } = await import('@/lib/db/safe-tenant-update');
      const docId = new ObjectId();

      await expect(
        safeTenantBulkWrite(mockCollection as any, [
          { updateOne: { filter: { _id: docId, orgId: 'org-1' }, update: { $set: { x: 1 } } } },
          { updateMany: { filter: { status: 'pending' }, update: { $set: { x: 2 } } } }, // Missing!
        ])
      ).rejects.toThrow('[TENANT_SAFETY]');

      expect(mockBulkWrite).not.toHaveBeenCalled();
    });
  });

  describe('withTenantScope', () => {
    it('merges tenant scope into filter', async () => {
      const { withTenantScope } = await import('@/lib/db/safe-tenant-update');
      const docId = new ObjectId();

      const filter = withTenantScope({ _id: docId }, { orgId: 'org-456' });

      expect(filter).toEqual({ _id: docId, orgId: 'org-456' });
    });

    it('merges property_owner_id scope into filter', async () => {
      const { withTenantScope } = await import('@/lib/db/safe-tenant-update');

      const filter = withTenantScope({ status: 'active' }, { property_owner_id: 'owner-789' });

      expect(filter).toEqual({ status: 'active', property_owner_id: 'owner-789' });
    });
  });
});
