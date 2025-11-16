#!/usr/bin/env tsx
/**
 * Update Test Users with Phone Numbers
 * 
 * Adds Saudi phone numbers to test users for OTP testing
 */

import { config } from 'dotenv';

// Load environment
config({ path: '.env.local' });

async function updateTestUsersPhone() {
  try {
    const { connectToDatabase } = await import('../lib/mongodb-unified');
    await connectToDatabase();
    
    const mongoose = (await import('mongoose')).default;
    const db = mongoose.connection.db;
    
    if (!db) {
      throw new Error('Database connection not established');
    }

    const usersCollection = db.collection('users');
    
    // Test user emails and their phone numbers
    const testUsers = [
      { email: 'superadmin@test.fixzit.co', phone: '+966501234567' },
      { email: 'admin@test.fixzit.co', phone: '+966501234568' },
      { email: 'property-manager@test.fixzit.co', phone: '+966501234569' },
      { email: 'technician@test.fixzit.co', phone: '+966501234570' },
      { email: 'tenant@test.fixzit.co', phone: '+966501234571' },
      { email: 'vendor@test.fixzit.co', phone: '+966501234572' },
    ];

    let updated = 0;

    for (const user of testUsers) {
      const result = await usersCollection.updateOne(
        { email: user.email },
        { 
          $set: { 
            phone: user.phone,
            'contact.phone': user.phone,
            'personal.phone': user.phone,
            updatedAt: new Date(),
          } 
        }
      );
      
      if (result.modifiedCount > 0) {
        updated++;
        console.log(`✅ Updated ${user.email} with phone ${user.phone}`);
      } else {
        console.log(`ℹ️  ${user.email} already has phone number or doesn't exist`);
      }
    }

    console.log(`\n✅ Updated ${updated} test user(s) with phone numbers`);
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error(`❌ Failed to update test users: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

updateTestUsersPhone();
