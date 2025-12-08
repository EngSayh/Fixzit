/**
 * Quick Fix for Super Admin Login
 * Directly updates database without complex logic
 * 
 * SEC-051: Password now configurable via DEMO_SUPERADMIN_PASSWORD env var
 */

import { connectToDatabase } from '../lib/mongodb-unified';
import { User } from '../server/models/User';
import bcrypt from 'bcryptjs';

// 🔐 Use configurable email domain for Business.sa rebrand compatibility
const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'fixzit.co';

// Safety: block accidental production/CI execution and require explicit opt-in
const isProdLike = process.env.NODE_ENV === 'production' || process.env.CI === 'true';
if (isProdLike) {
  throw new Error('❌ quick-fix-superadmin.ts blocked in production/CI');
}
if (process.env.ALLOW_SEED !== '1') {
  throw new Error('❌ ALLOW_SEED=1 required to run quick-fix-superadmin.ts (prevents accidental prod writes)');
}

const SUPERADMIN_EMAIL = `superadmin@${EMAIL_DOMAIN}`;
const PASSWORD_RAW = process.env.DEMO_SUPERADMIN_PASSWORD;
if (!PASSWORD_RAW) {
  throw new Error('DEMO_SUPERADMIN_PASSWORD is required (no fallback).');
}
// TypeScript: After the throw above, this is guaranteed to be a string
const PASSWORD: string = PASSWORD_RAW;
// Use non-dialable test number as default (ITU-T E.164 test range)
const PHONE = process.env.DEMO_SUPERADMIN_PHONE || '+15005550000';

async function quickFix() {
  try {
    await connectToDatabase();
    console.log('✅ Connected to database');

    const hashedPassword = await bcrypt.hash(PASSWORD, 10);

    const result = await User.updateOne(
      { email: SUPERADMIN_EMAIL },
      {
        $set: {
          password: hashedPassword,
          status: 'ACTIVE',
          isActive: true,
          role: 'SUPER_ADMIN',
          isSuperAdmin: true,
          phone: PHONE,
          'contact.phone': PHONE,
          'personal.phone': PHONE,
          'professional.role': 'SUPER_ADMIN',
          'security.lastLogin': new Date(),
        }
      },
      { upsert: false }
    );

    if (result.modifiedCount > 0) {
      console.log('✅ Super admin updated successfully!');
      console.log('\nLogin credentials:');
      console.log(`Email: ${SUPERADMIN_EMAIL}`);
      // SEC-051: Don't log password - use env var reference instead
      console.log('Password: [use DEMO_SUPERADMIN_PASSWORD env value]');
      console.log(`Phone: ${PHONE}`);
      console.log('\n🎉 You can now login!');
    } else {
      console.log('⚠️  No changes made - user may not exist');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

quickFix();
