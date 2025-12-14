#!/usr/bin/env node
/**
 * Setup SuperAdmin (Simple Version - No Top-Level Await Issues)
 *
 * Creates or updates the superadmin account directly in MongoDB.
 * Bypasses the problematic lib/mongo.ts top-level await issue.
 *
 * Required Environment Variables:
 * - MONGODB_URI: MongoDB connection string
 * - SUPERADMIN_EMAIL: SuperAdmin email (default: sultan.a.hassni@gmail.com)
 * - SUPERADMIN_PASSWORD: SuperAdmin password (will be hashed)
 *
 * Usage:
 *   SUPERADMIN_PASSWORD="YourPassword123!" node scripts/setup-superadmin-simple.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function setupSuperAdmin() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🔐 SUPERADMIN SETUP (Simple Version)');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  // Get environment variables
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  const email = (process.env.SUPERADMIN_EMAIL || 'sultan.a.hassni@gmail.com').toLowerCase();
  const password = process.env.SUPERADMIN_PASSWORD;

  // Validate inputs
  if (!mongoUri) {
    console.error('❌ Missing MONGODB_URI environment variable');
    console.error('   Set it in .env.local or pass it directly:\n');
    console.error('   MONGODB_URI="mongodb+srv://..." SUPERADMIN_PASSWORD="YourPass" node scripts/setup-superadmin-simple.js\n');
    process.exit(1);
  }

  if (!password) {
    console.error('❌ Missing SUPERADMIN_PASSWORD environment variable');
    console.error('   Usage:\n');
    console.error('   SUPERADMIN_PASSWORD="YourPassword123!" node scripts/setup-superadmin-simple.js\n');
    process.exit(1);
  }

  console.log(`📧 Email: ${email}`);
  console.log(`🔑 Password: ${'*'.repeat(password.length)} (will be hashed)\n`);

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');

    // Define User schema (minimal version)
    const userSchema = new mongoose.Schema({
      email: { type: String, required: true, unique: true, lowercase: true },
      password: { type: String, required: true },
      name: String,
      isSuperAdmin: { type: Boolean, default: false },
      isActive: { type: Boolean, default: true },
      role: String,
      orgId: String,
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    }, { collection: 'users', timestamps: true });

    const User = mongoose.models.User || mongoose.model('User', userSchema);

    // Check if user exists
    console.log('🔍 Checking if user exists...');
    let user = await User.findOne({ email });

    // Hash password
    console.log('🔐 Hashing password...');
    const hashedPassword = await bcrypt.hash(password, 10);

    if (user) {
      console.log('✅ User exists - updating...\n');
      
      // Update existing user
      user.password = hashedPassword;
      user.isSuperAdmin = true;
      user.isActive = true;
      user.role = 'superadmin';
      user.name = user.name || 'Eng. Sultan Al Hassni';
      user.updatedAt = new Date();
      
      await user.save();
      
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('✅ SUPERADMIN UPDATED SUCCESSFULLY');
      console.log('═══════════════════════════════════════════════════════════════════\n');
      console.log(`📧 Email: ${user.email}`);
      console.log(`👤 Name: ${user.name}`);
      console.log(`🔑 Password: Updated (hashed)`);
      console.log(`⭐ isSuperAdmin: ${user.isSuperAdmin}`);
      console.log(`✓ isActive: ${user.isActive}`);
      console.log(`🏢 orgId: ${user.orgId || 'NOT SET (correct for superadmin)'}`);
      console.log(`📅 Updated: ${user.updatedAt}\n`);
    } else {
      console.log('➕ User does not exist - creating new...\n');
      
      // Create new user
      user = await User.create({
        email,
        password: hashedPassword,
        name: 'Eng. Sultan Al Hassni',
        isSuperAdmin: true,
        isActive: true,
        role: 'superadmin',
        // No orgId - superadmin is cross-tenant
      });
      
      console.log('═══════════════════════════════════════════════════════════════════');
      console.log('✅ SUPERADMIN CREATED SUCCESSFULLY');
      console.log('═══════════════════════════════════════════════════════════════════\n');
      console.log(`📧 Email: ${user.email}`);
      console.log(`👤 Name: ${user.name}`);
      console.log(`🔑 Password: Set (hashed)`);
      console.log(`⭐ isSuperAdmin: ${user.isSuperAdmin}`);
      console.log(`✓ isActive: ${user.isActive}`);
      console.log(`🏢 orgId: NOT SET (correct for superadmin)`);
      console.log(`📅 Created: ${user.createdAt}\n`);
    }

    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('🎯 NEXT STEPS');
    console.log('═══════════════════════════════════════════════════════════════════\n');
    console.log('1. Login at: https://fixzit.co/superadmin/login\n');
    console.log('2. Enter:');
    console.log(`   Email: ${email}`);
    console.log('   Password: [the password you just set]');
    console.log('   OTP Code: EngSayh@1985#Fixzit\n');
    console.log('3. You should reach: /superadmin/issues\n');
    console.log('4. Test refresh: Session should persist ✅\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    // Disconnect
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB\n');
  }
}

// Run the setup
setupSuperAdmin().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
