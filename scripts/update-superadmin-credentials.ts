#!/usr/bin/env tsx
/**
 * Update SuperAdmin Credentials
 * 
 * Updates the SuperAdmin account with username/password authentication.
 * OTP is disabled for SuperAdmin; SMS OTP is restricted to Taqnyat-only flows.
 * 
 * SuperAdmin Credentials:
 * - Username: SUPERADMIN_USERNAME (required env)
 * - Password: SUPERADMIN_PASSWORD (required env)
 * - Email: Uses centralized demo-users config
 */

import { connectToDatabase } from '@/lib/mongodb-unified';
import { User } from '@/server/models/User';
import bcrypt from 'bcryptjs';
import { getDemoEmail } from '@/lib/config/demo-users';
import { requireEnv } from '@/lib/env';

const SUPERADMIN_EMAIL = getDemoEmail('superadmin');
const NEW_USERNAME = requireEnv('SUPERADMIN_USERNAME', {
  testFallback: 'superadmin',
});
const NEW_PASSWORD = requireEnv('SUPERADMIN_PASSWORD', {
  testFallback: 'ChangeMe!123',
});

async function updateSuperAdminCredentials() {
  console.log('🔐 Updating SuperAdmin credentials...\n');

  try {
    // Connect to database
    await connectToDatabase();
    console.log('✅ Connected to database\n');

    // Find super admin user
    const user = await User.findOne({ email: SUPERADMIN_EMAIL });

    if (!user) {
      console.error(`❌ SuperAdmin user not found: ${SUPERADMIN_EMAIL}`);
      console.error('   Run: pnpm exec tsx scripts/seed-test-users.ts');
      process.exit(1);
    }

    console.log('✅ Found SuperAdmin user');
    console.log('   ID:', user._id);
    console.log('   Current Role:', user.role || user.professional?.role);
    console.log('   Current Username:', user.username || 'NOT SET');

    // Hash new password
    const hashedPassword = await bcrypt.hash(NEW_PASSWORD, 12);

    // Update user with new credentials
    const updateResult = await User.updateOne(
      { _id: user._id },
      {
        $set: {
          username: NEW_USERNAME,
          password: hashedPassword,
          status: 'ACTIVE',
          isActive: true,
          isSuperAdmin: true,
          role: 'SUPER_ADMIN',
          'professional.role': 'SUPER_ADMIN',
          // Disable OTP requirement for SuperAdmin (Twilio doesn't support KSA)
          'preferences.otpDisabled': true,
          'security.locked': false,
          'security.lockReason': null,
          'security.lockTime': null,
          'security.loginAttempts': 0,
        },
      },
    );

    if (updateResult.modifiedCount > 0 || updateResult.matchedCount > 0) {
      console.log('\n✅ SuperAdmin credentials updated successfully!\n');
    } else {
      console.log('\n⚠️  No changes made (user may already have correct credentials)\n');
    }

    // Verify the update
    const updatedUser = await User.findOne({ email: SUPERADMIN_EMAIL });
    if (updatedUser) {
      const passwordValid = await bcrypt.compare(NEW_PASSWORD, updatedUser.password);
      
      console.log('📋 Updated SuperAdmin Details:');
      console.log('   ═══════════════════════════════════════════');
      console.log('   Email:    ', SUPERADMIN_EMAIL);
      console.log('   Username: ', updatedUser.username);
      console.log('   Password: ', passwordValid ? '✅ VERIFIED' : '❌ FAILED');
      console.log('   Role:     ', updatedUser.role || updatedUser.professional?.role);
      console.log('   Status:   ', updatedUser.status);
      console.log('   OTP:      ', updatedUser.preferences?.otpDisabled ? '❌ DISABLED' : '✅ ENABLED');
      console.log('   ═══════════════════════════════════════════\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

updateSuperAdminCredentials();
