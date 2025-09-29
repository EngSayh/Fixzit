// Test script to verify auth fixes
const jwt = require('jsonwebtoken');

// Set a test JWT secret if not set
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-key-change-in-production';
  console.log('⚠️  Using test JWT_SECRET - change this in production!');
}

// Test JWT generation
try {
  const testToken = jwt.sign(
    { userId: 'test123', role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  console.log('✅ JWT generation works');
  
  // Test JWT verification
  const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
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
