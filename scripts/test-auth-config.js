#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });

const results = { jwtSecret: false, jwtLength: false, mongodbUri: false, authModule: false };

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {

} else {
  results.jwtSecret = true;');
  if (jwtSecret.length >= 32) {
    results.jwtLength = true;`);
  }
}

const mongoUri = process.env.MONGODB_URI;
if (mongoUri && mongoUri.includes('mongodb+srv')) {
  results.mongodbUri = true;');
}

try {
  const { generateToken, verifyToken } = require('../lib/auth');
  results.authModule = true;

  const token = generateToken({ id: '123', email: 'test@fixzit.com', role: 'super_admin', orgId: '456' });

  const decoded = verifyToken(token);
  if (decoded)
} catch (e) {

}

const allPassed = Object.values(results).every(v => v === true););
if (allPassed) {

  process.exit(0);
} else {

  process.exit(1);
}

