/**
 * Fix Super Admin Login Issue
 * 
 * Diagnoses and fixes login issues for superadmin account
 * Common issues:
 * 1. Missing or invalid phone number (needed for OTP)
 * 2. Incorrect password hash
 * 3. Inactive status
 * 4. Missing orgId
 */

import { connectToDatabase } from '../lib/mongodb-unified';
import { User } from '../server/models/User';
import bcrypt from 'bcryptjs';

// 🔐 Use configurable email domain for Business.sa rebrand compatibility
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'fixzit.co';
const SUPERADMIN_EMAIL = `superadmin@${EMAIL_DOMAIN}`;
const EXPECTED_PASSWORD = process.env.SUPERADMIN_PASSWORD;
const FALLBACK_PHONE = process.env.NEXTAUTH_SUPERADMIN_FALLBACK_PHONE || '+966552233456'; // Updated to user's number

if (!EXPECTED_PASSWORD) {
  console.error('❌ SUPERADMIN_PASSWORD environment variable is required');
  process.exit(1);
}

// TypeScript: After the exit check above, this is guaranteed to be a string
const PASSWORD: string = EXPECTED_PASSWORD;

async function fixSuperAdminLogin() {
  console.log('🔍 Diagnosing Super Admin login issue...\n');

  try {
    // Connect to database
    await connectToDatabase();
    console.log('✅ Connected to database\n');

    // Find super admin user
    const user = await User.findOne({ email: SUPERADMIN_EMAIL });

    if (!user) {
      console.error(`❌ User not found: ${SUPERADMIN_EMAIL}`);
      console.error('   Run: pnpm exec tsx scripts/seed-test-users.js');
      process.exit(1);
    }

    // Use .get() for dynamic properties that may not be in TypeScript schema
    const userDoc = user.toObject() as Record<string, unknown>;
    const role = userDoc.role as string | undefined;
    const orgId = userDoc.orgId as string | undefined;
    const contact = userDoc.contact as Record<string, unknown> | undefined;
    const personal = userDoc.personal as Record<string, unknown> | undefined;

    console.log('✅ Found user:', SUPERADMIN_EMAIL);
    console.log('   ID:', user._id);
    console.log('   Role:', role);
    console.log('   Status:', user.status);
    console.log('   OrgId:', orgId || 'MISSING');
    
    // Check phone number
    const phone = (contact?.phone || personal?.phone || userDoc.phone) as string | undefined;
    console.log('   Phone:', phone || 'MISSING');

    let needsUpdate = false;
    const updates: Record<string, unknown> = {};

    // 1. Verify password
    console.log('\n🔐 Checking password...');
    const isPasswordValid = await bcrypt.compare(PASSWORD, user.password as string);
    
    if (!isPasswordValid) {
      console.log('   ⚠️  Password mismatch - updating to value from SUPERADMIN_PASSWORD env');
      const hashedPassword = await bcrypt.hash(PASSWORD, 10);
      updates.password = hashedPassword;
      needsUpdate = true;
    } else {
      console.log('   ✅ Password is correct');
    }

    // 2. Check status
    if (user.status !== 'ACTIVE') {
      console.log(`   ⚠️  Status is "${user.status}" - updating to ACTIVE`);
      updates.status = 'ACTIVE';
      updates.isActive = true;
      needsUpdate = true;
    } else {
      console.log('   ✅ Status is ACTIVE');
    }

    // 3. Check phone number (required for OTP)
    if (!phone) {
      console.log(`   ⚠️  Missing phone number - adding fallback: ${FALLBACK_PHONE}`);
      updates['contact.phone'] = FALLBACK_PHONE;
      updates['personal.phone'] = FALLBACK_PHONE;
      updates.phone = FALLBACK_PHONE;
      needsUpdate = true;
    } else {
      console.log('   ✅ Phone number exists');
    }

    // 4. Check orgId
    if (!orgId) {
      console.log('   ⚠️  Missing orgId - this may cause issues');
      console.log('   Note: Run seed-test-users.js to create proper org structure');
    }

    // 5. Ensure role is SUPER_ADMIN
    if (role !== 'SUPER_ADMIN') {
      console.log(`   ⚠️  Role is "${role}" - updating to SUPER_ADMIN`);
      updates.role = 'SUPER_ADMIN';
      updates.isSuperAdmin = true;
      updates['professional.role'] = 'SUPER_ADMIN';
      needsUpdate = true;
    } else {
      console.log('   ✅ Role is SUPER_ADMIN');
    }

    // Apply updates if needed
    if (needsUpdate) {
      console.log('\n🔧 Applying fixes...');
      await User.updateOne({ _id: user._id }, { $set: updates });
      console.log('✅ User updated successfully\n');
    } else {
      console.log('\n✅ No updates needed\n');
    }

    // Test password one more time
    const updatedUser = await User.findOne({ email: SUPERADMIN_EMAIL });
    if (updatedUser) {
      const updatedDoc = updatedUser.toObject() as Record<string, unknown>;
      const updatedContact = updatedDoc.contact as Record<string, unknown> | undefined;
      const updatedPersonal = updatedDoc.personal as Record<string, unknown> | undefined;
      const updatedPhone = (updatedContact?.phone || updatedPersonal?.phone || updatedDoc.phone) as string | undefined;
      const updatedRole = updatedDoc.role as string | undefined;
      const updatedOrgId = updatedDoc.orgId as string | undefined;
      
      const finalPasswordCheck = await bcrypt.compare(PASSWORD, updatedUser.password as string);
      
      console.log('📋 Final Status:');
      console.log('   Email:', SUPERADMIN_EMAIL);
      console.log('   Password:', '[configured via env]');
      console.log('   Password Valid:', finalPasswordCheck ? '✅ YES' : '❌ NO');
      console.log('   Phone:', updatedPhone || 'MISSING');
      console.log('   Status:', updatedUser.status);
      console.log('   Role:', updatedRole);
      console.log('   OrgId:', updatedOrgId || 'MISSING');

      if (finalPasswordCheck && updatedUser.status === 'ACTIVE' && updatedPhone) {
        console.log('\n✅ ✅ ✅ LOGIN SHOULD NOW WORK! ✅ ✅ ✅\n');
        console.log('Try logging in at: https://fixzit.co/login');
        console.log(`Email: ${SUPERADMIN_EMAIL}`);
        console.log('Password: [use the value from SUPERADMIN_PASSWORD env]');
      } else {
        console.log('\n⚠️  Some issues remain - check above for details\n');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    // Close MongoDB connection to prevent hanging
    process.exit(0);
  }
}

fixSuperAdminLogin();
