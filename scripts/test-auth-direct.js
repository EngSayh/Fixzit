/**
 * Direct authentication test - bypasses UI to test auth logic
 */
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load test environment
dotenv.config({ path: '.env.test' });

const EMAIL_DOMAIN = process.env.EMAIL_DOMAIN || 'fixzit.co';

async function testAuth() {
  console.log('🔍 Testing authentication directly...\n');

  try {
    // 1. Connect to database
    const mongoose = require('mongoose');
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit_test';
    console.log(`📦 Connecting to: ${MONGODB_URI}`);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // 2. Load User model (CommonJS can't use TS directly, use dynamic import workaround)
    // For now, just query directly with mongoose
    // Use safe create-or-reuse pattern to avoid OverwriteModelError
    const UserSchema = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    // 3. Find test user
    const testEmail = process.env.TEST_USER_EMAIL || `test-admin@${EMAIL_DOMAIN}`;
    const testPassword = process.env.TEST_USER_PASSWORD || 'Test@1234';
    
    console.log(`👤 Looking for user: ${testEmail}`);
    const user = await UserSchema.findOne({ email: testEmail }).lean();
    
    if (!user) {
      console.error(`❌ User not found: ${testEmail}`);
      process.exit(1);
    }
    
    console.log(`✅ Found user: ${user.email}`);
    console.log(`   - ID: ${user._id}`);
    console.log(`   - Role: ${user.role}`);
    console.log(`   - Status: ${user.status}`);
    // SEC-001: Don't log hash content, only format indicator
    console.log(`   - Password hash format: ${user.password?.startsWith('$2') ? 'bcrypt' : 'unknown'}`);

    // 4. Verify password (never log actual password value)
    console.log(`\n🔐 Testing password verification...`);
    const isValid = await bcrypt.compare(testPassword, user.password);
    
    if (!isValid) {
      console.error('❌ Password verification FAILED!');
      console.error('   This means the password in .env.test does not match the hash in database');
      process.exit(1);
    }
    
    console.log('✅ Password verification PASSED!');

    // 5. Check user status
    if (user.status !== 'ACTIVE') {
      console.error(`❌ User is not ACTIVE (status: ${user.status})`);
      process.exit(1);
    }
    
    console.log('✅ User status is ACTIVE');

    // 6. Summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 ALL AUTH CHECKS PASSED!');
    console.log('='.repeat(50));
    console.log('\nAuthentication logic is working correctly.');
    console.log('The issue must be in the NextAuth integration or client-side code.');
    
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('\n❌ Error during authentication test:');
    console.error(error);
    process.exit(1);
  }
}

testAuth();
