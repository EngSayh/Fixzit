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
  
  if (
    !process.env.TEST_MONGODB_URI &&
    !process.env.MONGODB_URI?.includes('test') &&
    !process.env.MONGODB_URI?.includes('localhost')
  ) {
    console.error('❌ BLOCKED: Must use test database (TEST_MONGODB_URI or MONGODB_URI with "test" or localhost in name)');
    process.exit(1);
  }
  
  try {
    await db;
    const userCollection = (User as {
      collection: {
        find: (filter: { email: { $in: string[] } }) => { toArray: () => Promise<Array<{ email?: string; password?: string }>> };
      };
    }).collection;

    const targetEmails = [
      `superadmin@${EMAIL_DOMAIN}`,
      `corp.admin@${EMAIL_DOMAIN}`,
      `manager@${EMAIL_DOMAIN}`,
    ];

    const users = await userCollection
      .find({
        email: { $in: targetEmails },
      })
      .toArray();
    
    users.forEach((user) => {
      const hash = (user as { passwordHash?: string; password?: string }).passwordHash || (user as { password?: string }).password;
      console.log(`\n${user.email}:`);
      console.log(`  hash field exists: ${!!hash}`);
      console.log(`  password is bcrypt hash: ${hash?.startsWith('$2')}`);
      console.log(`  hash length valid: ${hash ? hash.length >= 50 : false}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPasswords();
