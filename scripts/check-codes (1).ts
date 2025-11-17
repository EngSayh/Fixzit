#!/usr/bin/env tsx
/**
 * List all users by code
 */
import { db } from '../lib/mongo';
import { User } from '../server/models/User';

async function listUsers() {
  try {
    await db;
    console.log('👥 Checking specific codes...\n');
    
    const codes = ['TEST-ADMIN', 'TEST-OWNER', 'TEST-EMPLOYEE', 'TEST-TECHNICIAN', 'TEST-PROPERTY-MANAGER', 'TEST-TENANT', 'TEST-VENDOR', 'TEST-VIEWER'];
    
    for (const code of codes) {
      const user = await (User as any).findOne({ code }).select('code username email professional.role status').lean();
      if (user) {
        console.log(`✅ ${code.padEnd(25)} ${user.username?.padEnd(25)} ${user.email?.padEnd(40)} ${user.professional?.role || 'NO_ROLE'}`);
      } else {
        console.log(`❌ ${code.padEnd(25)} NOT FOUND`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

listUsers();
