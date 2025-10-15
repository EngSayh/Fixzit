#!/usr/bin/env node
/**
 * Script to ensure all database indexes are created
 * Run this after deployment or when database schema changes
 * 
 * Usage: tsx scripts/ensure-indexes.ts
 */

import { ensureCoreIndexes } from '../lib/db/index';
import { connectToDatabase } from '../lib/mongodb-unified';

async function main() {

  try {
    // Ensure connection
    await connectToDatabase();

    // Create indexes
    await ensureCoreIndexes();

    // Exit successfully
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating indexes:', error);
    process.exit(1);
  }
}

main();
