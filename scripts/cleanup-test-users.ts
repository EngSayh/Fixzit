#!/usr/bin/env tsx
/**
 * Clean up test users (@test.fixzit.co)
 */
import { db } from '../lib/mongo';
import { User } from '../server/models/User';

async function cleanup() {
  try {
    await db;
    console.log('🧹 Cleaning up test users...');
    
    // Delete by email pattern
    const result1 = await (User as any).deleteMany({ 
      email: { $regex: /@test\.fixzit\.co$/ } 
    });
    
    // Delete by orgId with null employeeId (old test users)
    const result2 = await (User as any).deleteMany({
      orgId: '68dc8955a1ba6ed80ff372dc',
      employeeId: null
    });
    
    console.log(`✅ Deleted ${result1.deletedCount + result2.deletedCount} test users`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

cleanup();
