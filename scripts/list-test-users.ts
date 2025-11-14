#!/usr/bin/env tsx
/**
 * List all test users
 */
import { db } from '../lib/mongo';
import { User } from '../server/models/User';

async function listUsers() {
  try {
    await db;
    console.log('👥 Listing test users with @test or test- prefix...\n');
    
    const users = await User.find({ 
      $or: [
        { email: { $regex: /@test/i } },
        { email: { $regex: /test-/i } },
        { username: { $regex: /test-/i } },
        { code: { $regex: /^TEST-/i } }
      ]
    }).select('code username email professional.role status').lean();
    
    console.log(`Found ${users.length} users:\n`);
    users.forEach((u: any) => {
      console.log(`  ${u.code?.padEnd(25)} ${u.email?.padEnd(35)} ${u.professional?.role || 'NO_ROLE'}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

listUsers();
