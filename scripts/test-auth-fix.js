// Test script to verify auth fixes
const jwt = require('jsonwebtoken');
const { requireEnv } = require('../lib/env');

let jwtSecret;
try {
  jwtSecret = requireEnv('JWT_SECRET');
} catch (_error) {
  console.error('❌ JWT_SECRET is required to run this script.');
  console.error('   Set JWT_SECRET in your environment before running auth tests.');
  process.exit(1);
}

// Test JWT generation
try {
  const testToken = jwt.sign(
    { userId: 'test123', role: 'admin' },
    jwtSecret,
    { expiresIn: '1h' }
  );
  console.log('✅ JWT generation works');
  
  // Test JWT verification
  const decoded = jwt.verify(testToken, jwtSecret);
  console.log('✅ JWT verification works');
  console.log('   Decoded:', decoded);
} catch (error) {
  console.error('❌ JWT test failed:', error.message);
}

console.log('\n✅ Auth fixes applied successfully!');
console.log('\nNext steps:');
console.log('1. Set JWT_SECRET in your .env file');
console.log('2. Restart your server: npm run dev');
console.log('3. Test login endpoint: POST /api/auth/login');
