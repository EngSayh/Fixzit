#!/usr/bin/env tsx
/**
 * Database Cleanup Script - Superadmin Only
 * 
 * This script clears all data from the MongoDB database while preserving
 * exactly ONE demo row per collection for testing purposes.
 * 
 * Usage:
 *   pnpm tsx scripts/clear-database-keep-demo.ts
 *   pnpm tsx scripts/clear-database-keep-demo.ts --dry-run    # Preview only
 *   pnpm tsx scripts/clear-database-keep-demo.ts --force      # Skip confirmation
 * 
 * SECURITY: This is a destructive operation. Use with caution.
 * 
 * @author Copilot Agent
 * @date 2025-12-10
 */

import mongoose from 'mongoose';
import readline from 'readline';

// Collections to preserve (critical system data that should not be cleared)
const PRESERVE_COLLECTIONS = new Set([
  'system.indexes',
  'system.profile',
  'system.users',
  'migrations',
  'schemas',
]);

// Collections that need special handling (keep all)
const KEEP_ALL_COLLECTIONS = new Set([
  'roles',          // RBAC roles should not be touched
  'permissions',    // Permissions should not be touched
  'translations',   // Translation keys should not be touched
  'systemconfigs',  // System configuration
  'featureflags',   // Feature flags
]);

interface CleanupStats {
  collection: string;
  originalCount: number;
  deletedCount: number;
  remainingCount: number;
  status: 'cleared' | 'preserved' | 'skipped' | 'error';
  error?: string;
}

async function getConnectionUri(): Promise<string> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is required');
  }
  return uri;
}

async function connectToDatabase(): Promise<void> {
  const uri = await getConnectionUri();
  console.log('🔌 Connecting to MongoDB...');
  console.log(`   URI: ${uri.replace(/:[^:@]+@/, ':****@')}`);
  
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  
  console.log('✅ Connected successfully\n');
}

async function getCollections(): Promise<string[]> {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database not available');
  
  const collections = await db.listCollections().toArray();
  return collections
    .map(c => c.name)
    .filter(name => !name.startsWith('system.'));
}

async function clearCollection(
  collectionName: string,
  isDryRun: boolean
): Promise<CleanupStats> {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database not available');
  
  const collection = db.collection(collectionName);
  
  // Check if collection should be preserved entirely
  if (PRESERVE_COLLECTIONS.has(collectionName)) {
    return {
      collection: collectionName,
      originalCount: await collection.countDocuments(),
      deletedCount: 0,
      remainingCount: await collection.countDocuments(),
      status: 'skipped',
    };
  }
  
  // Check if collection should keep all records
  if (KEEP_ALL_COLLECTIONS.has(collectionName)) {
    return {
      collection: collectionName,
      originalCount: await collection.countDocuments(),
      deletedCount: 0,
      remainingCount: await collection.countDocuments(),
      status: 'preserved',
    };
  }
  
  try {
    const originalCount = await collection.countDocuments();
    
    if (originalCount === 0) {
      return {
        collection: collectionName,
        originalCount: 0,
        deletedCount: 0,
        remainingCount: 0,
        status: 'cleared',
      };
    }
    
    if (originalCount === 1) {
      // Already has only 1 record, skip
      return {
        collection: collectionName,
        originalCount: 1,
        deletedCount: 0,
        remainingCount: 1,
        status: 'preserved',
      };
    }
    
    // Get the first document to preserve
    const firstDoc = await collection.findOne({}, { sort: { _id: 1 } });
    
    if (!isDryRun && firstDoc) {
      // Delete all documents except the first one
      const deleteResult = await collection.deleteMany({
        _id: { $ne: firstDoc._id }
      });
      
      const remainingCount = await collection.countDocuments();
      
      return {
        collection: collectionName,
        originalCount,
        deletedCount: deleteResult.deletedCount,
        remainingCount,
        status: 'cleared',
      };
    }
    
    // Dry run - just report what would happen
    return {
      collection: collectionName,
      originalCount,
      deletedCount: originalCount - 1,
      remainingCount: 1,
      status: 'cleared',
    };
  } catch (error) {
    return {
      collection: collectionName,
      originalCount: 0,
      deletedCount: 0,
      remainingCount: 0,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function confirmOperation(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question(
      '\n⚠️  This will DELETE data from the database. Type "YES" to confirm: ',
      (answer) => {
        rl.close();
        resolve(answer.trim() === 'YES');
      }
    );
  });
}

function printSummary(stats: CleanupStats[]): void {
  console.log('\n' + '='.repeat(70));
  console.log('📊 CLEANUP SUMMARY');
  console.log('='.repeat(70));
  
  const cleared = stats.filter(s => s.status === 'cleared');
  const preserved = stats.filter(s => s.status === 'preserved');
  const skipped = stats.filter(s => s.status === 'skipped');
  const errors = stats.filter(s => s.status === 'error');
  
  console.log(`\n✅ Cleared:   ${cleared.length} collections`);
  console.log(`📌 Preserved: ${preserved.length} collections`);
  console.log(`⏭️  Skipped:   ${skipped.length} collections`);
  console.log(`❌ Errors:    ${errors.length} collections`);
  
  const totalDeleted = stats.reduce((sum, s) => sum + s.deletedCount, 0);
  const totalRemaining = stats.reduce((sum, s) => sum + s.remainingCount, 0);
  
  console.log(`\n🗑️  Total documents deleted:  ${totalDeleted}`);
  console.log(`📄 Total documents remaining: ${totalRemaining}`);
  
  if (errors.length > 0) {
    console.log('\n❌ ERRORS:');
    errors.forEach(e => {
      console.log(`   - ${e.collection}: ${e.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(70));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isForce = args.includes('--force');
  
  console.log('\n' + '='.repeat(70));
  console.log('🧹 DATABASE CLEANUP SCRIPT');
  console.log('   Clears all data, keeping 1 demo row per collection');
  console.log('='.repeat(70));
  
  if (isDryRun) {
    console.log('\n🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  try {
    await connectToDatabase();
    
    const collections = await getCollections();
    console.log(`📋 Found ${collections.length} collections to process\n`);
    
    if (!isDryRun && !isForce) {
      const confirmed = await confirmOperation();
      if (!confirmed) {
        console.log('\n❌ Operation cancelled by user\n');
        process.exit(0);
      }
    }
    
    console.log('\n🔄 Processing collections...\n');
    
    const stats: CleanupStats[] = [];
    
    for (const collectionName of collections) {
      process.stdout.write(`   Processing ${collectionName}...`);
      const result = await clearCollection(collectionName, isDryRun);
      stats.push(result);
      
      const statusIcon = {
        cleared: '✅',
        preserved: '📌',
        skipped: '⏭️',
        error: '❌',
      }[result.status];
      
      console.log(` ${statusIcon} ${result.originalCount} → ${result.remainingCount} (deleted: ${result.deletedCount})`);
    }
    
    printSummary(stats);
    
    if (isDryRun) {
      console.log('\n💡 This was a dry run. Run without --dry-run to apply changes.\n');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

main();
