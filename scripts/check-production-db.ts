#!/usr/bin/env tsx
/**
 * Script to check production MongoDB and list login credentials
 */

import mongoose from 'mongoose';

// User schema
const userSchema = new mongoose.Schema({
  email: String,
  name: String,
  phone: String,
  role: String,
  organizationId: String,
}, { collection: 'users', strict: false });

// Account schema (NextAuth)
const accountSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  type: String,
  provider: String,
  providerAccountId: String,
}, { collection: 'accounts', strict: false });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Account = mongoose.models.Account || mongoose.model('Account', accountSchema);

async function checkProductionDatabase() {
  try {
    console.log('🔍 Checking PRODUCTION MongoDB Atlas connection...\n');
    
    // Use the production MongoDB URI
    const mongoUri = 'mongodb+srv://EngSayh:EngSayh%401985@fixzit.vgfiiff.mongodb.net/fixzit?retryWrites=true&w=majority&appName=Fixzit';
    
    console.log('📡 Connecting to MongoDB Atlas (Production)...');
    console.log('Cluster: fixzit.vgfiiff.mongodb.net');
    console.log('Database: fixzit\n');
    
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    
    console.log('✅ Connected to MongoDB Atlas successfully!\n');

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

      users.forEach((user: any, index: number) => {
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
      usersWithPassword.forEach((user: any) => {
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

    console.log('\n💡 LOGIN INFORMATION:\n');
    console.log('   🌐 Production URL: https://fixzit.co/login');
    console.log('   📧 Login with: email + password');
    console.log('\n   ⚠️  IMPORTANT: Passwords are hashed with bcrypt and cannot be retrieved');
    console.log('   🔧 To reset password: Use forgot password flow or create new test user');

    // Check for demo/test users
    console.log('\n🧪 Common test accounts to try:\n');
    const testEmails = [
      'superadmin@fixzit.co',
      'admin@fixzit.co',
      'manager@fixzit.co',
      'tenant@fixzit.co',
      'vendor@fixzit.co',
      'superadmin@test.fixzit.co',
      'admin@test.fixzit.co',
    ];

    for (const email of testEmails) {
      const user = await db.collection('users').findOne({ email });
      if (user) {
        const hasPassword = user.password ? '✅ Has password' : '❌ No password';
        console.log(`   ${email.padEnd(35)} ${hasPassword}`);
      }
    }

    console.log('\n📝 Common test password: "password123" or "Test@123" or "admin123"');
    console.log('   (Try these with the accounts that have passwords)');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.error('\n🔧 Cannot reach MongoDB Atlas. Check:');
      console.error('   - Internet connection');
      console.error('   - MongoDB Atlas cluster is running');
      console.error('   - Firewall not blocking connection');
    } else if (error.message.includes('Authentication failed')) {
      console.error('\n🔧 Authentication failed. Check:');
      console.error('   - Username: EngSayh');
      console.error('   - Password is correct');
      console.error('   - User has database permissions');
    } else if (error.name === 'MongoServerSelectionError') {
      console.error('\n🔧 Cannot connect to server. Check:');
      console.error('   - IP address is whitelisted (0.0.0.0/0)');
      console.error('   - Cluster is not paused');
      console.error('   - Network connectivity');
    }
    
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB Atlas');
  }
}

// Run the check
checkProductionDatabase();
