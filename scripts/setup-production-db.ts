#!/usr/bin/env tsx
/**
 * Database Deployment Configuration Script
 * 
 * Validates and applies MongoDB production configuration
 */

import { connectToDatabase, disconnectFromDatabase } from '@/lib/mongodb-unified';
import { ObjectId } from 'mongodb';

async function validateProductionConfig() {

  // Check required environment variables
  const requiredEnvs = [
    'MONGODB_URI',
    'MONGODB_DB',
    'JWT_SECRET',
    'NEXTAUTH_SECRET'
  ];

  const missing = requiredEnvs.filter(env => !process.env[env]);
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(env => console.error(`   - ${env}`));
    process.exit(1);
  }

  // Validate MongoDB URI format
  const mongoUri = process.env.MONGODB_URI!;
  if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    console.error('❌ Invalid MONGODB_URI format. Must start with mongodb:// or mongodb+srv://');
    process.exit(1);
  }

  // Test connection
  try {

    await connectToDatabase();

  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  } finally {
    await disconnectFromDatabase();
  }

}

async function setupProductionIndexes() {

  try {
    await connectToDatabase();
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;

    // Create essential indexes for production performance
    const indexes = [
      // Users collection
      { collection: 'users', index: { email: 1 }, options: { unique: true } },
      { collection: 'users', index: { orgId: 1, role: 1 } },
      
      // Properties collection  
      { collection: 'properties', index: { tenantId: 1, 'address.city': 1 } },
      { collection: 'properties', index: { tenantId: 1, type: 1 } },
      { collection: 'properties', index: { tenantId: 1, createdAt: -1 } },
      
      // Work orders collection
      { collection: 'work_orders', index: { tenantId: 1, status: 1 } },
      { collection: 'work_orders', index: { tenantId: 1, priority: 1 } },
      { collection: 'work_orders', index: { tenantId: 1, createdAt: -1 } },
      
      // Multi-tenant indexes
      { collection: 'tenancies', index: { tenantId: 1, unitId: 1 } },
      { collection: 'financial_transactions', index: { tenantId: 1, date: -1 } }
    ];

    for (const { collection, index, options = {} } of indexes) {
      try {
        await db.collection(collection).createIndex(index, options););
      } catch (error: unknown) {
        const err = error as { code?: number; message?: string };
        if (err.code === 85) {);
        } else {
          console.error(`❌ Failed to create index on ${collection}:`, err.message || String(error));
        }
      }
    }

  } finally {
    await disconnectFromDatabase();
  }
}

async function createDefaultTenant() {

  try {
    await connectToDatabase();
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;

    const orgId = new ObjectId();
    const defaultOrg = {
      _id: orgId,
      name: 'Default Organization',
      subscriptionPlan: 'Enterprise',
      createdAt: new Date(),
      isDefault: true
    };

    // Check if default org already exists
    const existing = await db.collection('organizations').findOne({ isDefault: true });
    if (existing) {

      return;
    }

    await db.collection('organizations').insertOne(defaultOrg););

    // Update environment with default tenant ID}`);

  } finally {
    await disconnectFromDatabase();
  }
}

async function main() {);

  try {
    await validateProductionConfig();
    await setupProductionIndexes();
    await createDefaultTenant(););

  } catch (error) {
    console.error('💥 Production setup failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}