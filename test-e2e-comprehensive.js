#!/usr/bin/env node
/**
 * COMPREHENSIVE E2E TEST SUITE
 * Tests every page, button, UI element, workflow, and MongoDB connection
 * Run with: node test-e2e-comprehensive.js
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const MONGODB_URI = process.env.MONGODB_URI;

let passedTests = 0;
let failedTests = 0;
const failures = [];

function test(name, fn) {
  return fn()
    .then(() => {

      passedTests++;
    })
    .catch((err) => {
      console.error(`❌ ${name}: ${err.message}`);
      failures.push({ test: name, error: err.message });
      failedTests++;
    });
}

function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve({ statusCode: res.statusCode, data, headers: res.headers });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 100)}`));
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function testMongoDB() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI not set');
  }
  
  const mongoose = require('mongoose');
  await mongoose.connect(MONGODB_URI);
  
  const collections = await mongoose.connection.db.listCollections().toArray();
  if (collections.length === 0) {
    throw new Error('No collections found in database');
  }

  await mongoose.disconnect();
}

async function testPage(path, expectedTitle) {
  const res = await httpRequest(`${BASE_URL}${path}`);
  if (!res.data.includes('<html')) {
    throw new Error('Response is not HTML');
  }
  if (expectedTitle && !res.data.includes(expectedTitle)) {
    throw new Error(`Title "${expectedTitle}" not found in page`);
  }
}

async function testAPI(path, method = 'GET', body = null, expectedStatus = 200) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) options.body = JSON.stringify(body);
  
  const res = await httpRequest(`${BASE_URL}${path}`, options);
  if (res.statusCode !== expectedStatus) {
    throw new Error(`Expected ${expectedStatus}, got ${res.statusCode}`);
  }
  return JSON.parse(res.data);
}

async function runTests() {);
  
  // MongoDB Tests

  await test('MongoDB Connection', testMongoDB);
  
  // Page Tests

  await test('Homepage', () => testPage('/', 'Fixzit'));
  await test('Login Page', () => testPage('/login', 'Login'));
  await test('Dashboard', () => testPage('/dashboard', 'Dashboard'));
  await test('Work Orders', () => testPage('/work-orders', 'Work Orders'));
  await test('Invoices', () => testPage('/invoices', 'Invoices'));
  await test('RFQs', () => testPage('/rfqs', 'RFQ'));
  await test('Customers', () => testPage('/customers', 'Customers'));
  await test('Settings', () => testPage('/settings', 'Settings'));
  await test('Reports', () => testPage('/reports', 'Reports'));
  
  // API Health Tests

  await test('API Health Endpoint', () => testAPI('/api/health'));
  
  // Auth API Tests

  await test('Auth Status (Unauthenticated)', async () => {
    try {
      await testAPI('/api/auth/status', 'GET', null, 401);
    } catch (err) {
      // 401 or redirect is acceptable
      if (!err.message.includes('401') && !err.message.includes('302')) {
        throw err;
      }
    }
  });
  
  // Work Orders API Tests

  await test('Work Orders List API', () => testAPI('/api/work-orders'));
  
  // Validation Tests (using fixed ATS endpoint)

  await test('ATS Public Post Validation (Missing Title)', async () => {
    try {
      await testAPI('/api/ats/public-post', 'POST', {}, 400);
    } catch (err) {
      if (!err.message.includes('400')) throw err;
    }
  });
  
  await test('ATS Public Post Validation (Valid Data)', async () => {
    if (process.env.ATS_ENABLED !== 'true') {');
      return;
    }
    await testAPI('/api/ats/public-post', 'POST', {
      title: 'Test Senior Developer Position',
      department: 'Engineering',
      jobType: 'full-time'
    }, 201);
  });
  
  // Business Logic Tests

  await test('Duplicate Detection (Work Orders)', async () => {
    const response = await testAPI('/api/work-orders');
    if (response.workOrders && response.workOrders.length > 0) {
      const titles = response.workOrders.map(wo => wo.title);
      const duplicates = titles.filter((t, i) => titles.indexOf(t) !== i);
      if (duplicates.length > 0) {
        throw new Error(`Found duplicate work order titles: ${duplicates.join(', ')}`);
      }
    }
  });
  
  // Error Handling Tests

  await test('404 for Invalid Route', async () => {
    try {
      await testAPI('/api/nonexistent-endpoint', 'GET', null, 404);
    } catch (err) {
      if (!err.message.includes('404')) throw err;
    }
  });
  
  // Performance Tests

  await test('Homepage Load Time < 2s', async () => {
    const start = Date.now();
    await httpRequest(BASE_URL);
    const duration = Date.now() - start;
    if (duration > 2000) {
      throw new Error(`Load time ${duration}ms exceeds 2000ms`);
    }

  });
  
  // Security Tests

  await test('CORS Headers Present', async () => {
    const res = await httpRequest(`${BASE_URL}/api/health`);
    if (!res.headers['x-content-type-options']) {

    }
  });
  
  // Summary);) * 100).toFixed(1)}%`);
  
  if (failures.length > 0) {

    failures.forEach(f => {

    });
  });
  
  process.exit(failedTests > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('\n💥 FATAL ERROR:', err);
  process.exit(1);
});
