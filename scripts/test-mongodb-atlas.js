#!/usr/bin/env node
/**
 * Phase 1.1: MongoDB Atlas Connection Test
 */
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

console.log('\n=== PHASE 1.1: MONGODB ATLAS CONNECTION TEST ===\n');

if (!uri || !uri.includes('mongodb+srv')) {
  console.error('❌ FATAL: Invalid MONGODB_URI in .env.local');
  process.exit(1);
}

console.log('✓ Atlas URI detected:', uri.substring(0, 60) + '...\n');

async function testConnection() {
  let client;
  try {
    console.log('⏳ Connecting to MongoDB Atlas...');
    client = await MongoClient.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log('✅ Connected to MongoDB Atlas successfully!\n');
    
    console.log('⏳ Pinging database...');
    const adminDb = client.db().admin();
    const pingResult = await adminDb.ping();
    
    if (pingResult.ok === 1) {
      console.log('✅ Ping successful! Database is responsive.\n');
    }
    
    console.log('⏳ Listing available databases...');
    const dbList = await adminDb.listDatabases();
    console.log('✅ Available databases:');
    dbList.databases.forEach(db => {
      console.log(`   - ${db.name} (${(db.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
    });
    
    console.log('\n⏳ Checking "fixzit" database...');
    const fixzitDb = client.db('fixzit');
    const collections = await fixzitDb.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('⚠️  "fixzit" database exists but has no collections yet');
    } else {
      console.log('✅ "fixzit" database collections:');
      collections.forEach(col => console.log(`   - ${col.name}`));
    }
    
    console.log('\n✅✅✅ PHASE 1.1 COMPLETE: MONGODB ATLAS CONNECTION VERIFIED ✅✅✅\n');
    
  } catch (error) {
    console.error('\n❌ CONNECTION FAILED:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('✓ Connection closed.\n');
    }
  }
}

testConnection();