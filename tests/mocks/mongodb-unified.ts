/**
 * MongoDB Unified Mock for Vitest
 *
 * Centralized mock for @/lib/mongodb-unified module.
 * Provides mock implementations of MongoDB client, database, and collection methods.
 */

import { vi } from "vitest";
import type { Db, Collection, MongoClient, Document } from "mongodb";

// Mock MongoDB collection methods
export const createMockCollection = <T extends Document = Document>(): Partial<
  Collection<T>
> => ({
  insertOne: vi.fn().mockResolvedValue({
    acknowledged: true,
    insertedId: "mock-id-123",
  }),
  insertMany: vi.fn().mockResolvedValue({
    acknowledged: true,
    insertedCount: 1,
    insertedIds: { 0: "mock-id-123" },
  }),
  find: vi.fn().mockReturnValue({
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
  }),
  findOne: vi.fn().mockResolvedValue(null),
  updateOne: vi.fn().mockResolvedValue({
    acknowledged: true,
    modifiedCount: 1,
    matchedCount: 1,
    upsertedCount: 0,
    upsertedId: null,
  }),
  updateMany: vi.fn().mockResolvedValue({
    acknowledged: true,
    modifiedCount: 1,
    matchedCount: 1,
    upsertedCount: 0,
    upsertedId: null,
  }),
  deleteOne: vi.fn().mockResolvedValue({
    acknowledged: true,
    deletedCount: 1,
  }),
  deleteMany: vi.fn().mockResolvedValue({
    acknowledged: true,
    deletedCount: 1,
  }),
  countDocuments: vi.fn().mockResolvedValue(0),
  aggregate: vi.fn().mockReturnValue({
    toArray: vi.fn().mockResolvedValue([]),
  }),
  bulkWrite: vi.fn().mockResolvedValue({
    acknowledged: true,
    insertedCount: 0,
    matchedCount: 0,
    modifiedCount: 0,
    deletedCount: 0,
    upsertedCount: 0,
    upsertedIds: {},
    insertedIds: {},
  }),
});

// Mock MongoDB database
export const createMockDatabase = (): Partial<Db> => ({
  collection: vi.fn(
    <T extends Document = Document>(_name: string) =>
      createMockCollection<T>() as Collection<T>,
  ) as any,
  command: vi.fn().mockResolvedValue({ ok: 1 }),
  listCollections: vi.fn().mockReturnValue({
    toArray: vi.fn().mockResolvedValue([]),
  }),
});

// Mock MongoDB client
export const createMockClient = (): Partial<MongoClient> => ({
  db: vi.fn((_name?: string) => createMockDatabase() as Db),
  close: vi.fn().mockResolvedValue(undefined),
  connect: vi.fn().mockResolvedValue(undefined as unknown as MongoClient),
});

// Export singleton mocks for use in tests
export const mockDb = createMockDatabase();
export const mockClient = createMockClient();
export const mockCollection = createMockCollection();

// Export mock functions that match the mongodb-unified module API
export const getDatabase = vi.fn(() => mockDb as Db);
export const connectToDatabase = vi.fn(async () => mockClient as MongoClient);

/**
 * Reset all MongoDB mocks
 * Call this in beforeEach to ensure clean state between tests
 */
export const resetMongoMocks = () => {
  vi.clearAllMocks();
};
