#!/usr/bin/env tsx
import { db } from '../lib/mongo';
import mongoose from 'mongoose';

async function listIndexes() {
  try {
    await db;
    if (!mongoose.connection.db) {
      throw new Error('Database connection not established');
    }
    const coll = mongoose.connection.db.collection('users');
    const indexes = await coll.listIndexes().toArray();
    
    console.log('Users collection indexes:');
    indexes.forEach((idx: any) => {
      console.log(`\n  Name: ${idx.name}`);
      console.log(`  Keys: ${JSON.stringify(idx.key)}`);
      if (idx.unique) console.log(`  Unique: YES`);
      if (idx.sparse) console.log(`  Sparse: YES`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

listIndexes();
