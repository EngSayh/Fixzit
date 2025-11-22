#!/usr/bin/env tsx
/**
 * Script to check MongoDB and list collections.
 * NOTE: Access is gated to prevent accidental prod access and to avoid hard-coded secrets.
 */

import mongoose from 'mongoose';

async function checkProductionDatabase() {
  try {
    if (process.env.ALLOW_PROD_DB !== '1') {
      console.error('❌ Refusing to run: set ALLOW_PROD_DB=1 and provide MONGODB_URI explicitly.');
      process.exit(1);
    }

    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not set. Provide the URI via environment variable.');
      process.exit(1);
    }

    console.log('🔍 Checking MongoDB connection...\n');
    
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log('✅ Connected to MongoDB successfully!\n');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection failed');
    }

    // List all collections
    console.log('📚 Available collections in production:');
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collections\n`);
    
    // Check for auth-related collections
    const authCollections = collections.filter(c => 
      c.name.includes('user') || 
      c.name.includes('account') || 
      c.name.includes('credential') ||
      c.name.includes('session')
    );
    
    console.log('🔐 Auth-related collections:');
    authCollections.forEach(col => {
      console.log(`   ✓ ${col.name}`);
    });
    console.log('');

    // Count users
    const userCount = await db.collection('users').countDocuments();
    console.log(`👥 Total users in production: ${userCount}\n`);

    if (userCount > 0) {
      console.log('📋 Fetching user details...\n');
      console.log('='.repeat(80));
      
      const users = await db.collection('users')
        .find({})
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray();

      users.forEach((user: { name?: string; email?: string; phone?: string; role?: string; organizationId?: string; _id: unknown; createdAt?: Date }, index: number) => {
        console.log(`\n${index + 1}. ${user.name || 'Unnamed User'}`);
        console.log(`   📧 Email: ${user.email || 'N/A'}`);
        console.log(`   📱 Phone: ${user.phone || 'N/A'}`);
        console.log(`   👤 Role: ${user.role || 'N/A'}`);
        console.log(`   🏢 Organization: ${user.organizationId || 'N/A'}`);
        console.log(`   🆔 User ID: ${user._id}`);
        console.log(`   📅 Created: ${user.createdAt ? new Date(user.createdAt).toLocaleString() : 'N/A'}`);
      });
    }

    // Check for accounts collection (NextAuth credentials)
    console.log('\n' + '='.repeat(80));
    console.log('\n🔐 Checking NextAuth accounts/credentials...\n');
    
    const accountCount = await db.collection('accounts').countDocuments();
    console.log(`Found ${accountCount} account(s) in 'accounts' collection`);

    if (accountCount > 0) {
      const accounts = await db.collection('accounts')
        .find({ provider: 'credentials' })
        .limit(10)
        .toArray();
      
      console.log(`\nCredentials-based accounts: ${accounts.length}`);
      
      for (const account of accounts) {
        const user = await db.collection('users').findOne({ _id: account.userId });
        if (user) {
          console.log(`\n   📧 ${user.email}`);
          console.log(`   👤 Name: ${user.name || 'N/A'}`);
          console.log(`   🔐 Provider: ${account.provider}`);
        }
      }
    }

    // Check for password hashes (if stored in users collection)
    console.log('\n' + '='.repeat(80));
    console.log('\n🔑 Checking for password hashes in users...\n');
    
    const usersWithPassword = await db.collection('users')
      .find({ password: { $exists: true } })
      .limit(5)
      .toArray();

    if (usersWithPassword.length > 0) {
      console.log(`✅ Found ${usersWithPassword.length} user(s) with password field:`);
      usersWithPassword.forEach((user: { email: string; password?: string }) => {
        console.log(`\n   📧 Email: ${user.email}`);
        console.log(`   🔐 Has password: ${user.password ? 'Yes (hashed)' : 'No'}`);
        console.log(`   🔐 Hash preview: ${user.password ? user.password.substring(0, 20) + '...' : 'N/A'}`);
      });
    } else {
      console.log('⚠️  No users found with password field in users collection');
      console.log('   This means passwords might be in a separate collection or OAuth only');
    }

    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 PRODUCTION DATABASE SUMMARY:\n');
    console.log(`   Total Collections: ${collections.length}`);
    console.log(`   Total Users: ${userCount}`);
    console.log(`   NextAuth Accounts: ${accountCount}`);
    console.log(`   Users with Passwords: ${usersWithPassword.length}`);

    console.log('\n💡 LOGIN INFORMATION NOT SHOWN (guarded).');
    console.log('   - To audit auth data, run with explicit queries and appropriate approvals.');

  } catch (error: unknown) {
    const err = error as Error;
    console.error('\n❌ Error:', err.message);
    
    if (err.message.includes('ENOTFOUND')) {
      console.error('\n🔧 Cannot reach MongoDB. Check connectivity/whitelists.');
    } else if (err.message.includes('Authentication failed')) {
      console.error('\n🔧 Authentication failed. Verify credentials and roles.');
    } else if (err.name === 'MongoServerSelectionError') {
      console.error('\n🔧 Cannot connect to server. Check cluster status and IP allow list.');
    }
    
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the check
checkProductionDatabase();
