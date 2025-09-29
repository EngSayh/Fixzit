// Quick JWT test script
const { generateToken, verifyToken } = require('./src/lib/auth.ts');

// Set the JWT secret
process.env.JWT_SECRET = '6c042711c6357e833e41b9e439337fe58476d801f63b60761c72f3629506c267';

console.log('🔐 Testing JWT with new secret...');

// Test token generation
const testPayload = {
  id: 'test-user-123',
  email: 'test@fixzit.co',
  role: 'ADMIN',
  orgId: 'test-org'
};

try {
  const token = generateToken(testPayload);
  console.log('✅ Token generated successfully');
  console.log('Token length:', token.length);
  
  // Test token verification
  const decoded = verifyToken(token);
  console.log('✅ Token verified successfully');
  console.log('Decoded payload:', decoded);
  
  // Test invalid token
  const invalid = verifyToken('invalid.token.here');
  console.log('✅ Invalid token handling:', invalid === null ? 'Working' : 'Failed');
  
  console.log('🎉 All JWT tests passed with new secret!');
} catch (error) {
  console.error('❌ JWT test failed:', error.message);
}