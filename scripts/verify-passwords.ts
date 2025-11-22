#!/usr/bin/env tsx
/**
 * Script to verify test passwords against production database
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

async function verifyPasswords() {
  try {
    console.log('🔐 Verifying test passwords against production database...\n');
    
    const mongoUri = 'mongodb+srv://EngSayh:EngSayh%401985@fixzit.vgfiiff.mongodb.net/fixzit?retryWrites=true&w=majority&appName=Fixzit';
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log('✅ Connected to MongoDB Atlas\n');

    const db = mongoose.connection.db;
    if (!db) throw new Error('Database connection failed');

    // Get users with passwords
    const users = await db.collection('users')
      .find({ password: { $exists: true, $ne: null } })
      .toArray();

    console.log(`Found ${users.length} users with passwords\n`);
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
        } catch (error) {
          // Skip invalid hashes
        }
      }
      
      if (!found) {
        console.log(`   ⚠️  None of the common passwords matched`);
        console.log(`   💡 Try: "password123" or contact admin to reset`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n📋 VERIFIED LOGIN CREDENTIALS:\n');

    // Re-check and list verified accounts
    for (const user of users) {
      for (const testPassword of testPasswords) {
        try {
          const isMatch = await bcrypt.compare(testPassword, user.password);
          if (isMatch) {
            console.log(`   📧 Email: ${user.email}`);
            console.log(`   🔐 Password: ${testPassword}`);
            console.log(`   🌐 Login: https://fixzit.co/login`);
            console.log('');
            break;
          }
        } catch (error) {
          // Skip
        }
      }
    }

    console.log('='.repeat(80));
    console.log('\n💡 TO LOGIN:\n');
    console.log('   1. Go to: https://fixzit.co/login');
    console.log('   2. Use one of the email/password combinations above');
    console.log('   3. If login fails, check browser console for errors');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB Atlas\n');
  }
}

verifyPasswords();
