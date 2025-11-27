/**
 * Fix Super Admin Login Issue
 * 
 * Diagnoses and fixes login issues for superadmin@fixzit.co
 * Common issues:
 * 1. Missing or invalid phone number (needed for OTP)
 * 2. Incorrect password hash
 * 3. Inactive status
 * 4. Missing orgId
 */

import { connectToDatabase } from '@/lib/mongodb-unified';
import { User } from '@/server/models/User';
import bcrypt from 'bcryptjs';

const SUPERADMIN_EMAIL = 'superadmin@fixzit.co';
const EXPECTED_PASSWORD = 'admin123'; // From DATABASE_VERIFICATION_REPORT.md
const FALLBACK_PHONE = process.env.NEXTAUTH_SUPERADMIN_FALLBACK_PHONE || '+966552233456'; // Updated to user's number

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

    console.log('✅ Found user:', SUPERADMIN_EMAIL);
    console.log('   ID:', user._id);
    console.log('   Role:', user.role);
    console.log('   Status:', user.status);
    console.log('   OrgId:', user.orgId || 'MISSING');
    
    // Check phone number
    const phone = user.contact?.phone || user.personal?.phone || user.phone;
    console.log('   Phone:', phone || 'MISSING');

    let needsUpdate = false;
    const updates: Record<string, unknown> = {};

    // 1. Verify password
    console.log('\n🔐 Checking password...');
    const isPasswordValid = await bcrypt.compare(EXPECTED_PASSWORD, user.password);
    
    if (!isPasswordValid) {
      console.log(`   ⚠️  Password mismatch - updating to "${EXPECTED_PASSWORD}"`);
      const hashedPassword = await bcrypt.hash(EXPECTED_PASSWORD, 10);
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
    if (!user.orgId) {
      console.log('   ⚠️  Missing orgId - this may cause issues');
      console.log('   Note: Run seed-test-users.js to create proper org structure');
    }

    // 5. Ensure role is SUPER_ADMIN
    if (user.role !== 'SUPER_ADMIN') {
      console.log(`   ⚠️  Role is "${user.role}" - updating to SUPER_ADMIN`);
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
      const finalPasswordCheck = await bcrypt.compare(EXPECTED_PASSWORD, updatedUser.password);
      
      console.log('📋 Final Status:');
      console.log('   Email:', SUPERADMIN_EMAIL);
      console.log('   Password:', EXPECTED_PASSWORD);
      console.log('   Password Valid:', finalPasswordCheck ? '✅ YES' : '❌ NO');
      console.log('   Phone:', updatedUser.contact?.phone || updatedUser.personal?.phone || updatedUser.phone || 'MISSING');
      console.log('   Status:', updatedUser.status);
      console.log('   Role:', updatedUser.role);
      console.log('   OrgId:', updatedUser.orgId || 'MISSING');

      if (finalPasswordCheck && updatedUser.status === 'ACTIVE' && (updatedUser.contact?.phone || updatedUser.personal?.phone || updatedUser.phone)) {
        console.log('\n✅ ✅ ✅ LOGIN SHOULD NOW WORK! ✅ ✅ ✅\n');
        console.log('Try logging in at: https://fixzit.co/login');
        console.log(`Email: ${SUPERADMIN_EMAIL}`);
        console.log(`Password: ${EXPECTED_PASSWORD}`);
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
