#!/usr/bin/env node
/**
 * Clear Test Database Script
 * 
 * WARNING: This script will delete ALL data from test collections.
 * Use with caution and only on test/development databases.
 * 
 * Usage:
 *   NODE_ENV=test npm run clear-test-data
 *   or
 *   ts-node scripts/clear-test-data.ts
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

// Load environment variables from .env.local or .env
const envLocalPath = resolve(process.cwd(), '.env.local');
const envPath = resolve(process.cwd(), '.env');

if (existsSync(envLocalPath)) {
  config({ path: envLocalPath });
} else if (existsSync(envPath)) {
  config({ path: envPath });
} else {
  config();
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: MONGODB_URI environment variable is not set');
  process.exit(1);
}

// Safety check: Only allow on test/dev databases
const isSafeDatabase = 
  MONGODB_URI.includes('test') || 
  MONGODB_URI.includes('dev') || 
  MONGODB_URI.includes('localhost') ||
  process.env.NODE_ENV === 'test' ||
  process.env.NODE_ENV === 'development';

if (!isSafeDatabase) {
  console.error('❌ Error: This script can only be run on test/dev databases');
  console.error('   Database must contain "test", "dev", or "localhost" in URI');
  console.error('   Or NODE_ENV must be "test" or "development"');
  process.exit(1);
}

async function clearTestData() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log(`   Database: ${MONGODB_URI.split('@')[1] || 'localhost'}`);
    
    await mongoose.connect(MONGODB_URI);
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    
    console.log(`\n📊 Found ${collections.length} collections\n`);
    
    let totalDeleted = 0;
    const results: { collection: string; deleted: number }[] = [];
    
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      
      // Skip system collections
      if (collectionName.startsWith('system.')) {
        console.log(`⏭️  Skipping system collection: ${collectionName}`);
        continue;
      }
      
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();
        
        if (count === 0) {
          console.log(`✓ ${collectionName}: already empty`);
          continue;
        }
        
        const result = await collection.deleteMany({});
        totalDeleted += result.deletedCount || 0;
        
        results.push({
          collection: collectionName,
          deleted: result.deletedCount || 0
        });
        
        console.log(`🗑️  ${collectionName}: deleted ${result.deletedCount} documents`);
      } catch (error) {
        console.error(`❌ Error clearing ${collectionName}:`, error);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📈 Summary:');
    console.log('='.repeat(60));
    console.log(`Total collections processed: ${results.length}`);
    console.log(`Total documents deleted: ${totalDeleted}`);
    
    if (results.length > 0) {
      console.log('\nTop collections by documents deleted:');
      results
        .sort((a, b) => b.deleted - a.deleted)
        .slice(0, 10)
        .forEach(({ collection, deleted }) => {
          console.log(`  - ${collection}: ${deleted.toLocaleString()}`);
        });
    }
    
    console.log('\n✅ Database cleanup completed successfully');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Confirmation prompt in interactive mode
async function promptConfirmation(): Promise<boolean> {
  if (process.env.CI || process.env.SKIP_CONFIRMATION === 'true') {
    return true;
  }
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    readline.question(
      '\n⚠️  WARNING: This will delete ALL data from the test database.\n' +
      '   Type "YES" to confirm: ',
      (answer: string) => {
        readline.close();
        resolve(answer.trim() === 'YES');
      }
    );
  });
}

// Main execution
(async () => {
  console.log('🧹 Test Database Cleanup Script');
  console.log('='.repeat(60));
  
  const confirmed = await promptConfirmation();
  
  if (!confirmed) {
    console.log('\n❌ Cleanup cancelled by user');
    process.exit(0);
  }
  
  await clearTestData();
  process.exit(0);
})();
