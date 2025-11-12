#!/usr/bin/env node
// WARNING: This test script connects to the actual database.
// Ensure you are running this in a SAFE TEST ENVIRONMENT ONLY.
// DO NOT run this against production database as it accesses user credentials.
// TODO: Refactor to use test-specific database connection or mock DB for safety.
import { db } from '../../lib/mongo';
import { User } from '../../server/models/User';

async function checkPasswords() {
  try {
    await db;
    const users = await (User as any).collection.find({ 
      email: { $in: ['superadmin@fixzit.co', 'admin@fixzit.co'] } 
    }).toArray();
    
    users.forEach((user: any) => {
      console.log(`\n${user.email}:`);
      console.log(`  password field exists: ${!!user.password}`);
      console.log(`  password starts with $2b$: ${user.password?.startsWith('$2b$')}`);
      console.log(`  password length: ${user.password?.length}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPasswords();
