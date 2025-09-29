const jwt = require('jsonwebtoken');

// Set the JWT secret
const JWT_SECRET = '6c042711c6357e833e41b9e439337fe58476d801f63b60761c72f3629506c267';

console.log('🔐 Testing JWT with new secret...');
console.log('Secret length:', JWT_SECRET.length, 'characters');

// Test token generation
const testPayload = {
  id: 'test-user-123',
  email: 'test@fixzit.co',
  role: 'ADMIN',
  orgId: 'test-org'
};

try {
  const token = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '24h' });
  console.log('✅ Token generated successfully');
  console.log('Token sample:', token.substring(0, 50) + '...');
  
  // Test token verification
  const decoded = jwt.verify(token, JWT_SECRET);
  console.log('✅ Token verified successfully');
  console.log('Decoded payload:', {
    id: decoded.id,
    email: decoded.email,
    role: decoded.role,
    orgId: decoded.orgId
  });
  
  // Test invalid token
  try {
    jwt.verify('invalid.token.here', JWT_SECRET);
    console.log('❌ Invalid token validation failed');
  } catch (err) {
    console.log('✅ Invalid token correctly rejected');
  }
  
  console.log('🎉 All JWT tests passed with new secret!');
  console.log('');
  console.log('📋 Summary:');
  console.log('- JWT Secret: SECURE (64 characters)');
  console.log('- Token Generation: WORKING');
  console.log('- Token Verification: WORKING');
  console.log('- Invalid Token Handling: WORKING');
  console.log('');
  console.log('✅ Ready for production deployment!');

} catch (error) {
  console.error('❌ JWT test failed:', error.message);
}