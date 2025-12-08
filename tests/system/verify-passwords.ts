#!/usr/bin/env node
// ✅ SECURITY FIX: Requires test environment to prevent production DB access
// This script checks password field integrity for test accounts only
import { db } from '../../lib/mongo';
import { User } from '../../server/models/User';

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'fixzit.co';

async function checkPasswords() {
  // ✅ SECURITY GATE: Only allow in test environment
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ BLOCKED: Cannot run against production database');
    console.error('Set NODE_ENV=test and use test database URI');
    process.exit(1);
  }
  
  if (!process.env.TEST_MONGODB_URI && !process.env.MONGODB_URI?.includes('test')) {
    console.error('❌ BLOCKED: Must use test database (TEST_MONGODB_URI or MONGODB_URI with "test" in name)');
    process.exit(1);
  }
  
  try {
    await db;
    const userCollection = (User as {
      collection: {
        find: (filter: { email: { $in: string[] } }) => { toArray: () => Promise<Array<{ email?: string; password?: string }>> };
      };
    }).collection;

    const users = await userCollection.find({
      email: { $in: [`superadmin@${EMAIL_DOMAIN}`, `admin@${EMAIL_DOMAIN}`] }
    }).toArray();
    
    users.forEach((user) => {
      console.log(`\n${user.email}:`);
      console.log(`  password field exists: ${!!user.password}`);
      console.log(`  password is bcrypt hash: ${user.password?.startsWith('$2b$')}`);
      console.log(`  password length valid: ${user.password?.length >= 60}`);
      // ✅ REMOVED: No longer log password hash to stdout (security risk)
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPasswords();
