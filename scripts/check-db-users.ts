#!/usr/bin/env tsx
/**
 * Script to check MongoDB connection and list users
 */

import mongoose from 'mongoose';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

// User schema (simplified)
const userSchema = new mongoose.Schema({
  email: String,
  name: String,
  phone: String,
  role: String,
  organizationId: String,
  createdAt: Date,
}, { collection: 'users' });

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function checkDatabase() {
  try {
    console.log('🔍 Checking MongoDB connection...\n');
    
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    console.log('📡 Connecting to MongoDB...');
    console.log('URI:', mongoUri.replace(/:[^:@]+@/, ':****@')); // Hide password
    
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB successfully!\n');

    // Check connection state
    const state = mongoose.connection.readyState;
    console.log('Connection state:', state === 1 ? 'Connected ✅' : 'Disconnected ❌');
    console.log('Database:', mongoose.connection.db?.databaseName);
    console.log('Host:', mongoose.connection.host);
    console.log('\n' + '='.repeat(80) + '\n');

    // List all users
    console.log('👥 Fetching users from database...\n');
    const users = await User.find({}).select('email name phone role organizationId createdAt').lean();
    
    if (users.length === 0) {
      console.log('⚠️  No users found in database');
      console.log('\n💡 You may need to seed the database with test users');
    } else {
      console.log(`Found ${users.length} user(s):\n`);
      
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name || 'Unnamed User'}`);
        console.log(`   Email: ${user.email || 'N/A'}`);
        console.log(`   Phone: ${user.phone || 'N/A'}`);
        console.log(`   Role: ${user.role || 'N/A'}`);
        console.log(`   Organization: ${user.organizationId || 'N/A'}`);
        console.log(`   Created: ${user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}`);
        console.log('');
      });
    }

    // Check for credentials collection
    console.log('\n' + '='.repeat(80) + '\n');
    console.log('🔐 Checking credentials...\n');
    
    const collections = await mongoose.connection.db?.listCollections().toArray();
    const hasCredentials = collections?.some(c => c.name === 'credentials');
    
    if (hasCredentials) {
      const credentialsCount = await mongoose.connection.db?.collection('credentials').countDocuments();
      console.log(`✅ Found ${credentialsCount} credential(s) in database`);
    } else {
      console.log('⚠️  No credentials collection found');
    }

    // List all collections
    console.log('\n📚 Available collections:');
    collections?.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    console.log('\n' + '='.repeat(80) + '\n');
    console.log('💡 To test login on production (https://fixzit.co):');
    console.log('   1. Users need to have credentials in NextAuth format');
    console.log('   2. Check if users were created via signup');
    console.log('   3. Password is hashed with bcrypt');
    console.log('\n📝 Note: Passwords are not shown for security reasons');

  } catch (error: unknown) {
    const err = error as Error & { code?: string | number };
    console.error('\n❌ Error:', err.message);
    if (err.code === 'ENOTFOUND') {
      console.error('\n🔧 DNS resolution failed. Check:');
      console.error('   - Network connection');
      console.error('   - MongoDB Atlas cluster is running');
      console.error('   - Correct hostname in MONGODB_URI');
    } else if (error.code === 8000) {
      console.error('\n🔧 Authentication failed. Check:');
      console.error('   - Username and password are correct');
      console.error('   - User has proper permissions');
      console.error('   - IP is whitelisted in MongoDB Atlas');
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the check
checkDatabase();
