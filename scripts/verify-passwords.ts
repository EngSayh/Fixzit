#!/usr/bin/env tsx
/**
 * Script to verify weak passwords against a MongoDB users collection.
 * Guarded to prevent accidental production use and to avoid hard-coded secrets.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

async function verifyPasswords() {
  try {
    if (process.env.ALLOW_PASSWORD_AUDIT !== '1') {
      console.error('❌ Refusing to run: set ALLOW_PASSWORD_AUDIT=1 and MONGODB_URI explicitly.');
      process.exit(1);
    }

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not set. Provide the URI via environment variable.');
      process.exit(1);
    }

    console.log('🔐 Verifying weak passwords against MongoDB...\n');
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection failed');

    // Get users with passwords
    const users = await db.collection('users')
      .find({ password: { $exists: true, $ne: null } })
      .project({ email: 1, password: 1 })
      .toArray();

    console.log(`Found ${users.length} users with password hashes\n`);
    console.log('='.repeat(80));

    // Common test passwords to try
    const testPasswords = [
      'password',
      'password123',
      'Password123',
      'Password@123',
      'Test@123',
      'admin123',
      'Admin@123',
      'fixzit123',
      'Fixzit@123',
      '123456',
      'test123',
    ];

    console.log('\n🔍 Testing common passwords...\n');

    for (const user of users) {
      console.log(`\n📧 ${user.email}`);
      console.log(`   Hash: ${user.password.substring(0, 30)}...`);
      
      let found = false;
      for (const testPassword of testPasswords) {
        try {
          const isMatch = await bcrypt.compare(testPassword, user.password);
          if (isMatch) {
            console.log(`   ✅ Password matched: "${testPassword}"`);
            found = true;
            break;
          }
        } catch (_error) {
          // Skip invalid hashes
        }
      }
      
      if (!found) {
        console.log(`   ⚠️  None of the common passwords matched`);
        console.log(`   💡 Reset this account's password if needed`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📋 REPORT SUMMARY:\n');
    console.log('   - Matching weak passwords were reported above per account.');
    console.log('   - Reset weak credentials immediately.');

  } catch (error: unknown) {
    const err = error as Error;
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB\n');
  }
}

verifyPasswords();
