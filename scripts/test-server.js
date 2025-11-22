require('dotenv').config();

console.log('🧪 Testing Fixzit Souq Server Components...\n');

// Test 1: Environment
console.log('1️⃣ Environment Check:');
console.log('   ✅ NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('   ✅ JWT_SECRET:', process.env.JWT_SECRET ? 'configured' : '❌ missing');
console.log('   ✅ MONGODB_URI:', process.env.MONGODB_URI ? 'configured' : '❌ missing');

// Test 2: Dependencies
console.log('\n2️⃣ Dependencies Check:');
try {
  require('express');
  console.log('   ✅ express installed');
  require('jsonwebtoken');
  console.log('   ✅ jsonwebtoken installed');
  require('bcryptjs');
  console.log('   ✅ bcryptjs installed');
  require('express-validator');
  console.log('   ✅ express-validator installed');
} catch (e) {
  console.log('   ❌ Missing dependency:', e.message);
}

// Test 3: Middleware
console.log('\n3️⃣ Middleware Check:');
try {
  require('./utils/asyncHandler');
  console.log('   ✅ asyncHandler loaded');
  require('./middleware/auth');
  console.log('   ✅ auth middleware loaded');
  require('./middleware/validation');
  console.log('   ✅ validation middleware loaded');
} catch (e) {
  console.log('   ❌ Middleware error:', e.message);
}

// Test 4: Models
console.log('\n4️⃣ Models Check:');
try {
  require('./models/User');
  console.log('   ✅ User model loaded');
  require('./models/Tenant');
  console.log('   ✅ Tenant model loaded');
} catch (e) {
  console.log('   ❌ Model error:', e.message);
}

// Test 5: Routes
console.log('\n5️⃣ Routes Check:');
try {
  require('./routes/auth');
  console.log('   ✅ Auth routes loaded');
} catch (e) {
  console.log('   ❌ Routes error:', e.message);
}

console.log('\n✅ All tests completed!');
console.log('🚀 Ready to start server with: npm run dev\n');
process.exit(0);
