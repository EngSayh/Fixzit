/**
 * Database index management for MongoDB
 */

import { connectToDatabase } from '@/lib/mongodb-unified';
import mongoose from 'mongoose';

/**
 * Ensures core indexes are created on all collections
 * This should be run during deployment to optimize query performance
 */
export async function ensureCoreIndexes(): Promise<void> {
  await connectToDatabase();
  
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }

  // Define indexes for each collection
  const indexes = [
    // Users
    {
      collection: 'users',
      indexes: [
        { key: { email: 1 }, unique: true },
        { key: { tenantId: 1 } },
        { key: { role: 1 } },
        { key: { 'personal.phone': 1 } }
      ]
    },
    // Work Orders
    {
      collection: 'workorders',
      indexes: [
        { key: { code: 1 }, unique: true },
        { key: { tenantId: 1 } },
        { key: { status: 1 } },
        { key: { priority: 1 } },
        { key: { propertyId: 1 } },
        { key: { assigneeUserId: 1 } },
        { key: { createdAt: -1 } },
        { key: { dueAt: 1 } },
        { key: { tenantId: 1, status: 1, createdAt: -1 } }
      ]
    },
    // Properties
    {
      collection: 'properties',
      indexes: [
        { key: { code: 1 }, unique: true },
        { key: { tenantId: 1 } },
        { key: { type: 1 } },
        { key: { status: 1 } },
        { key: { 'location.city': 1 } }
      ]
    },
    // Invoices
    {
      collection: 'invoices',
      indexes: [
        { key: { code: 1 }, unique: true },
        { key: { tenantId: 1 } },
        { key: { status: 1 } },
        { key: { dueDate: 1 } },
        { key: { customerId: 1 } }
      ]
    },
    // Support Tickets
    {
      collection: 'supporttickets',
      indexes: [
        { key: { code: 1 }, unique: true },
        { key: { tenantId: 1 } },
        { key: { status: 1 } },
        { key: { priority: 1 } },
        { key: { assigneeUserId: 1 } },
        { key: { createdAt: -1 } }
      ]
    },
    // Help Articles
    {
      collection: 'helparticles',
      indexes: [
        { key: { tenantId: 1 } },
        { key: { slug: 1 }, unique: true },
        { key: { category: 1 } },
        { key: { published: 1 } }
      ]
    },
    // CMS Pages
    {
      collection: 'cmspages',
      indexes: [
        { key: { tenantId: 1 } },
        { key: { slug: 1 }, unique: true },
        { key: { published: 1 } }
      ]
    }
  ];

  for (const { collection, indexes: collIndexes } of indexes) {
    try {
      const coll = db.collection(collection);
      
      for (const indexSpec of collIndexes) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await coll.createIndex(indexSpec.key as any, {
            unique: indexSpec.unique || false,
            background: true
          });
        } catch (error: unknown) {
          const mongoError = error as { code?: number; message?: string };
          // Skip if index already exists (codes 85, 86)
          if (mongoError.code === 85 || mongoError.code === 86 || mongoError.message?.includes('already exists')) {
            // Index already exists - this is expected, skip silently
            continue;
          }
          // Log all other errors for observability
          console.error(`Failed to create index on ${collection}:`, {
            index: JSON.stringify(indexSpec.key),
            error: mongoError.message || 'Unknown error',
            code: mongoError.code
          });
          // Rethrow to propagate the error
          throw error;
        }
      }
    } catch (err) {
      // Log collection-level errors with context
      const error = err as Error;
      console.error(`Failed to create indexes for collection ${collection}:`, {
        message: error.message,
        stack: error.stack
      });
      // Don't throw - allow other collections to be processed
    }
  }

  // Index creation complete
}
