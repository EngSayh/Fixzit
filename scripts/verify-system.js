#!/usr/bin/env node
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit-enterprise';
const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'PAYTABS_PROFILE_ID',
  'PAYTABS_SERVER_KEY',
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
  'SENDGRID_API_KEY',
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'OPENAI_API_KEY'
];

const requiredCollections = [
  'users',
  'properties',
  'workorders',
  'assets',
  'tenants',
  'vendors',
  'projects',
  'rfqs',
  'invoices',
  'products',
  'carts',
  'orders',
  'notifications',
  'tickets',
  'articles',
  'cms_pages'
];

async function verifySystem() {
  console.log('🔍 FIXZIT ENTERPRISE SYSTEM VERIFICATION\n');
  console.log('=' .repeat(50));
  
  let score = 0;
  let maxScore = 0;

  // 1. Check Environment Variables
  console.log('\n📋 CHECKING ENVIRONMENT VARIABLES:');
  const envPath = path.join(process.cwd(), '.env.local');
  const hasEnvFile = fs.existsSync(envPath);
  
  if (hasEnvFile) {
    console.log('✅ .env.local file exists');
    score += 5;
  } else {
    console.log('❌ .env.local file missing');
    console.log('   Run: cp env.example .env.local');
  }
  maxScore += 5;

  // Check individual env vars
  const missingEnvVars = [];
  for (const envVar of requiredEnvVars) {
    if (process.env[envVar]) {
      console.log(`✅ ${envVar}: Configured`);
      score += 2;
    } else {
      console.log(`⚠️  ${envVar}: Not configured`);
      missingEnvVars.push(envVar);
    }
    maxScore += 2;
  }

  // 2. Check Database Connection
  console.log('\n🗄️  CHECKING DATABASE:');
  let client;
  let dbConnected = false;
  
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    console.log('✅ MongoDB connection: SUCCESS');
    score += 10;
    dbConnected = true;
    
    const db = client.db();
    
    // Check collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    for (const collection of requiredCollections) {
      if (collectionNames.includes(collection)) {
        const count = await db.collection(collection).countDocuments();
        console.log(`✅ Collection '${collection}': ${count} documents`);
        score += 2;
      } else {
        console.log(`❌ Collection '${collection}': Missing`);
      }
      maxScore += 2;
    }
    
    // Check for sample data
    const userCount = await db.collection('users').countDocuments();
    const productCount = await db.collection('products').countDocuments();
    const propertyCount = await db.collection('properties').countDocuments();
    
    if (userCount > 0 && productCount > 0 && propertyCount > 0) {
      console.log('\n✅ Sample data exists');
      score += 10;
    } else {
      console.log('\n⚠️  No sample data found');
      console.log('   Run: node scripts/setup-database.js');
    }
    maxScore += 10;
    
  } catch (error) {
    console.log('❌ MongoDB connection: FAILED');
    console.log(`   Error: ${error.message}`);
    console.log('   Make sure MongoDB is running');
  } finally {
    if (client) await client.close();
  }
  maxScore += 10;

  // 3. Check API Endpoints
  console.log('\n🔌 CHECKING API ENDPOINTS:');
  const testEndpoints = [
    { path: '/api/auth/me', method: 'GET', requiresAuth: true },
    { path: '/api/marketplace/products', method: 'GET', requiresAuth: false },
    { path: '/api/properties', method: 'GET', requiresAuth: true },
    { path: '/api/work-orders', method: 'GET', requiresAuth: true }
  ];

  console.log('⚠️  API endpoint testing requires server to be running');
  console.log('   Skipping automated API tests');

  // 4. Check Frontend Pages
  console.log('\n📄 CHECKING FRONTEND PAGES:');
  const pagePaths = [
    'app/(root)/page.tsx',
    'app/login/page.tsx',
    'app/signup/page.tsx',
    'app/marketplace/page.tsx',
    'app/fm/page.tsx',
    'app/work-orders/page.tsx',
    'app/properties/page.tsx',
    'app/notifications/page.tsx'
  ];

  for (const pagePath of pagePaths) {
    const fullPath = path.join(process.cwd(), pagePath);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${pagePath}: Exists`);
      score += 2;
    } else {
      console.log(`❌ ${pagePath}: Missing`);
    }
    maxScore += 2;
  }

  // 5. Check Integrations
  console.log('\n🔗 CHECKING INTEGRATIONS:');
  
  // PayTabs
  if (process.env.PAYTABS_PROFILE_ID && process.env.PAYTABS_SERVER_KEY) {
    console.log('✅ PayTabs: Configured');
    score += 5;
  } else {
    console.log('⚠️  PayTabs: Not configured (optional)');
  }
  maxScore += 5;

  // Google Maps
  if (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    console.log('✅ Google Maps: Configured');
    score += 5;
  } else {
    console.log('⚠️  Google Maps: Not configured (optional)');
  }
  maxScore += 5;

  // OpenAI
  if (process.env.OPENAI_API_KEY) {
    console.log('✅ OpenAI: Configured');
    score += 5;
  } else {
    console.log('⚠️  OpenAI: Not configured (optional)');
  }
  maxScore += 5;

  // 6. Final Report
  console.log('\n' + '='.repeat(50));
  console.log('📊 SYSTEM VERIFICATION SUMMARY:');
  console.log('='.repeat(50));
  
  const percentage = Math.round((score / maxScore) * 100);
  let status = '';
  let statusColor = '';
  
  if (percentage >= 90) {
    status = '✅ PRODUCTION READY';
    statusColor = '\x1b[32m'; // Green
  } else if (percentage >= 70) {
    status = '⚠️  MOSTLY READY';
    statusColor = '\x1b[33m'; // Yellow
  } else if (percentage >= 50) {
    status = '⚠️  PARTIALLY READY';
    statusColor = '\x1b[33m'; // Yellow
  } else {
    status = '❌ NOT READY';
    statusColor = '\x1b[31m'; // Red
  }
  
  console.log(`\nScore: ${score}/${maxScore} (${percentage}%)`);
  console.log(`${statusColor}Status: ${status}\x1b[0m`);
  
  // Recommendations
  if (missingEnvVars.length > 0) {
    console.log('\n📌 NEXT STEPS:');
    console.log('1. Configure missing environment variables in .env.local');
    console.log('2. Set up external services (PayTabs, Google Maps, etc.)');
  }
  
  if (!dbConnected) {
    console.log('3. Install and start MongoDB');
    console.log('4. Run: node scripts/setup-database.js');
  }
  
  console.log('\n💡 To start the system:');
  console.log('   npm run dev');
  console.log('\n📚 Documentation: docs/README.md');
  console.log('🧪 Run tests: npm test');
  
  process.exit(percentage >= 70 ? 0 : 1);
}

// Run verification
verifySystem().catch(console.error);
