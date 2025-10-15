#!/usr/bin/env node
/**
 * Phase 1.1: MongoDB Atlas Connection Test
 */
require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

if (!uri || !uri.includes('mongodb+srv')) {
  console.error('❌ FATAL: Invalid MONGODB_URI in .env.local');
  process.exit(1);
}

async function testConnection() {
  let client;
  try {

    client = await MongoClient.connect(uri, { serverSelectionTimeoutMS: 10000 });

    const adminDb = client.db().admin();
    const pingResult = await adminDb.ping();
    
    if (pingResult.ok === 1) {

    }

    const dbList = await adminDb.listDatabases();

    // Database names not logged for security

    const fixzitDb = client.db('fixzit');
    const collections = await fixzitDb.listCollections().toArray();
    
    if (collections.length === 0) {

    } else {.`);
    }

  } catch (error) {
    console.error('\n❌ CONNECTION FAILED:', error.message);
    process.exit(1);
  } finally {
    if (client) {
      await client.close();

    }
  }
}

testConnection();

