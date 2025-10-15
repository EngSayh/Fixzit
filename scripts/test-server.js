require('dotenv').config();
const mongoose = require('mongoose');

// Test 1: Environment

// Test 2: Dependencies

try {
  require('express');

  require('jsonwebtoken');

  require('bcryptjs');

  require('express-validator');

} catch (e) {

}

// Test 3: Middleware

try {
  const asyncHandler = require('./utils/asyncHandler');

  const auth = require('./middleware/auth');

  const validation = require('./middleware/validation');

} catch (e) {

}

// Test 4: Models

try {
  const User = require('./models/User');

  const Tenant = require('./models/Tenant');

} catch (e) {

}

// Test 5: Routes

try {
  const authRoutes = require('./routes/auth');

} catch (e) {

}

process.exit(0);
