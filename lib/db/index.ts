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

  console.log('📊 Creating indexes for core collections...');

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

  let created = 0;
  let skipped = 0;

  for (const { collection, indexes: collIndexes } of indexes) {
    try {
      const coll = db.collection(collection);
      
      for (const indexSpec of collIndexes) {
        try {
          await coll.createIndex(indexSpec.key as any, {
            unique: indexSpec.unique || false,
            background: true
          });
          created++;
          console.log(`  ✓ ${collection}: ${JSON.stringify(indexSpec.key)}`);
        } catch (error: unknown) {
          if (error.code === 85 || error.code === 86 || (error as Error).message.includes('already exists')) {
            // Index already exists
            skipped++;
          } else {
            console.warn(`  ⚠ ${collection}: ${(error as Error).message}`);
          }
        }
      }
    } catch (error) {
      console.error(`  ✗ Failed to create indexes for ${collection}:`, error);
    }
  }

  console.log(`✅ Index creation complete: ${created} created, ${skipped} already existed`);
}
