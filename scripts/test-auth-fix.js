// Test script to verify auth fixes
const jwt = require('jsonwebtoken');

// Set a test JWT secret if not set
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-key-change-in-production';

}

// Test JWT generation
try {
  const testToken = jwt.sign(
    { userId: 'test123', role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Test JWT verification
  const decoded = jwt.verify(testToken, process.env.JWT_SECRET);

} catch (error) {
  console.error('❌ JWT test failed:', error.message);
}

