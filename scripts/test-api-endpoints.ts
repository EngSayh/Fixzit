#!/usr/bin/env tsx
/**
 * API Endpoint Testing Script
 * 
 * Tests critical API endpoints:
 * - Authentication (login, logout, OTP)
 * - Payments (callback with retry queue)
 * - WhatsApp notifications
 * - Finance reports (balance sheet)
 * - Work orders CRUD
 * 
 * Usage:
 *   tsx scripts/test-api-endpoints.ts
 *   tsx scripts/test-api-endpoints.ts --endpoint=auth
 *   tsx scripts/test-api-endpoints.ts --verbose
 */

import { randomBytes } from 'crypto';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_ORG_ID = process.env.TEST_ORG_ID || 'test-org-' + Date.now();
const VERBOSE = process.argv.includes('--verbose');
const ENDPOINT_FILTER = process.argv.find(arg => arg.startsWith('--endpoint='))?.split('=')[1];

interface TestResult {
  endpoint: string;
  method: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  statusCode?: number;
  duration: number;
  error?: string;
  response?: unknown;
}

const results: TestResult[] = [];
let authToken: string | null = null;
let testUserId: string | null = null;
let sessionCookie: string | null = null;
const allCookies: string[] = []; // Store all cookies for cookie jar

// Login helper to get auth token and session cookie
async function authenticateTestUser() {
  try {
    // Use the test admin user
    const loginData = {
      identifier: 'admin@test.fixzit.co',
      password: 'Test@1234',
    };
    
    log('Step 1: Sending OTP...', 'INFO');
    
    // Step 1: Send OTP
    const otpResponse = await fetch(`${BASE_URL}/api/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData),
    });
    
    const otpText = await otpResponse.text();
    let otpResult;
    try {
      otpResult = JSON.parse(otpText);
    } catch {
      log(`Failed to parse OTP response: ${otpText}`, 'ERROR');
      return false;
    }
    
    if (!otpResult.success) {
      log(`Failed to send OTP: ${otpResult.error}`, 'WARN');
      return false;
    }
    
    // Extract OTP from response (devCode is exposed in dev mode)
    const otp = otpResult.data?.devCode;
    
    if (!otp) {
      log('OTP not available in dev mode. Skipping auth-required tests.', 'WARN');
      return false;
    }
    
    log(`Got OTP: ${otp}`, 'INFO');
    log('Step 2: Verifying OTP...', 'INFO');
    
    // Step 2: Verify OTP to get otpToken
    const verifyResponse = await fetch(`${BASE_URL}/api/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: loginData.identifier,
        otp,
      }),
    });
    
    const verifyText = await verifyResponse.text();
    let verifyResult;
    try {
      verifyResult = JSON.parse(verifyText);
    } catch {
      log(`Failed to parse verify response: ${verifyText}`, 'ERROR');
      return false;
    }
    
    if (!verifyResult.success) {
      log(`Failed to verify OTP: ${verifyResult.error}`, 'WARN');
      return false;
    }
    
    const otpToken = verifyResult.data?.otpToken;
    if (!otpToken) {
      log('OTP token not received from verification', 'ERROR');
      return false;
    }
    
    log('Step 3: Creating NextAuth session...', 'INFO');
    
    // Step 3a: Get CSRF token (and receive CSRF cookie)
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`, {
      method: 'GET',
    });
    
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.csrfToken;
    
    // Store CSRF cookie
    const csrfSetCookies = csrfResponse.headers.getSetCookie?.() || [csrfResponse.headers.get('set-cookie')].filter(Boolean);
    if (csrfSetCookies.length > 0) {
      allCookies.push(...csrfSetCookies);
    }
    
    if (!csrfToken) {
      log('Failed to get CSRF token', 'ERROR');
      return false;
    }
    
    if (VERBOSE) {
      log(`Got CSRF token: ${csrfToken.substring(0, 20)}...`, 'INFO');
      if (csrfSetCookies.length > 0) {
        log(`Got ${csrfSetCookies.length} CSRF cookie(s)`, 'INFO');
      }
    }
    
    // Step 3b: Call NextAuth credentials provider to create session
    // Include the CSRF cookie in the request
    const signInResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': allCookies.join('; '),
      },
      body: new URLSearchParams({
        identifier: loginData.identifier,
        password: loginData.password,
        otpToken: otpToken,
        csrfToken: csrfToken,
        redirect: 'false',
        callbackUrl: `${BASE_URL}/`,
      }).toString(),
      redirect: 'manual', // Don't follow redirects
    });
    
    // Debug: log response status and headers
    if (VERBOSE) {
      log(`NextAuth response status: ${signInResponse.status}`, 'INFO');
      log(`NextAuth response headers:`, 'INFO');
      signInResponse.headers.forEach((value, key) => {
        log(`  ${key}: ${value}`, 'INFO');
      });
    }
    
    // Extract session cookie from Set-Cookie header
    const signInSetCookies = signInResponse.headers.getSetCookie?.() || [signInResponse.headers.get('set-cookie')].filter(Boolean);
    if (signInSetCookies.length === 0) {
      log('No session cookie received from NextAuth', 'ERROR');
      const responseText = await signInResponse.text();
      log(`Response status: ${signInResponse.status}`, 'ERROR');
      log(`Response body: ${responseText}`, 'ERROR');
      return false;
    }
    
    // Store all cookies (session + CSRF)
    allCookies.push(...signInSetCookies);
    sessionCookie = allCookies.map(c => c.split(';')[0]).join('; '); // Extract just the cookie values
    
    // Check if we got the session token
    if (signInSetCookies.some(c => c.includes('authjs.session-token'))) {
      log('Successfully authenticated test user', 'SUCCESS');
      return true;
    }
    
    log('Got cookies but no session token found', 'WARN');
    return false;
  } catch (error) {
    log(`Authentication error: ${error instanceof Error ? error.message : String(error)}`, 'ERROR');
    return false;
  }
}

// Utility functions
function log(message: string, level: 'INFO' | 'SUCCESS' | 'ERROR' | 'WARN' = 'INFO') {
  const colors = {
    INFO: '\x1b[36m',    // Cyan
    SUCCESS: '\x1b[32m', // Green
    ERROR: '\x1b[31m',   // Red
    WARN: '\x1b[33m',    // Yellow
  };
  const reset = '\x1b[0m';
  console.log(`${colors[level]}[${level}]${reset} ${message}`);
}

async function testEndpoint(
  name: string,
  method: string,
  path: string,
  options: {
    body?: unknown;
    headers?: Record<string, string>;
    expectedStatus?: number;
    requiresAuth?: boolean;
    skipOnFilter?: boolean;
  } = {}
): Promise<TestResult> {
  if (options.skipOnFilter && ENDPOINT_FILTER && !name.toLowerCase().includes(ENDPOINT_FILTER.toLowerCase())) {
    return {
      endpoint: name,
      method,
      status: 'SKIP',
      duration: 0,
    };
  }

  const start = Date.now();
  const url = `${BASE_URL}${path}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-org-id': TEST_ORG_ID,
    ...options.headers,
  };

  if (options.requiresAuth && sessionCookie) {
    headers['Cookie'] = sessionCookie;
  } else if (options.requiresAuth && authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    if (VERBOSE) log(`Testing: ${method} ${path}`, 'INFO');
    
    const response = await fetch(url, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const duration = Date.now() - start;
    const statusCode = response.status;
    
    let responseData;
    try {
      const text = await response.text();
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = text;
      }
    } catch {
      responseData = null;
    }

    const expectedStatus = options.expectedStatus || 200;
    const isSuccess = statusCode === expectedStatus || (statusCode >= 200 && statusCode < 300 && !options.expectedStatus);
    
    if (VERBOSE && responseData) {
      console.log('Response:', typeof responseData === 'string' ? responseData : JSON.stringify(responseData, null, 2));
    }

    const result: TestResult = {
      endpoint: name,
      method,
      status: isSuccess ? 'PASS' : 'FAIL',
      statusCode,
      duration,
      response: responseData,
    };

    if (!isSuccess) {
      result.error = `Expected ${expectedStatus}, got ${statusCode}`;
    }

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    return {
      endpoint: name,
      method,
      status: 'FAIL',
      duration,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// Test suites
async function testAuthEndpoints() {
  log('\n🔐 Testing Authentication Endpoints...', 'INFO');

  // Test signup
  const timestamp = Date.now();
  const signupResult = await testEndpoint(
    'Auth - Signup',
    'POST',
    '/api/auth/signup',
    {
      body: {
        email: `test-${timestamp}@fixzit.test`,
        password: 'Test123!@#',
        confirmPassword: 'Test123!@#',
        firstName: 'Test',
        lastName: 'User',
        phone: '+966500000001',
        userType: 'personal',
        termsAccepted: true,
        orgId: TEST_ORG_ID,
        role: 'TENANT',
      },
      expectedStatus: 201,
      skipOnFilter: true,
    }
  );
  results.push(signupResult);
  
  if (signupResult.status === 'PASS' && signupResult.response?.userId) {
    testUserId = signupResult.response.userId;
    authToken = signupResult.response.token;
  }

  // Test OTP send (login endpoint)
  const otpSendResult = await testEndpoint(
    'Auth - OTP Send',
    'POST',
    '/api/auth/otp/send',
    {
      body: {
        identifier: 'admin@test.fixzit.co',
        password: 'Test@1234',
      },
      skipOnFilter: true,
    }
  );
  results.push(otpSendResult);

  // Test me endpoint (requires auth)
  const meResult = await testEndpoint(
    'Auth - Get Current User',
    'GET',
    '/api/auth/me',
    {
      requiresAuth: true,
      skipOnFilter: true,
    }
  );
  results.push(meResult);
}

async function testPaymentEndpoints() {
  log('\n💳 Testing Payment Endpoints...', 'INFO');

  // Test payment callback (simulated)
  const callbackResult = await testEndpoint(
    'Payments - Callback Handler',
    'POST',
    '/api/payments/callback',
    {
      body: {
        tranRef: 'TST_' + randomBytes(16).toString('hex'),
        cartId: 'test-cart-' + Date.now(),
        respStatus: 'A',
        respCode: '000',
        respMessage: 'Approved',
        amount: '100.00',
        currency: 'SAR',
      },
      headers: {
        'x-paytabs-signature': 'test-signature', // Would need real signature in prod
      },
      skipOnFilter: true,
    }
  );
  results.push(callbackResult);

  // Test Tap payment checkout creation
  const tapCheckoutResult = await testEndpoint(
    'Payments - Tap Checkout',
    'POST',
    '/api/payments/tap/checkout',
    {
      body: {
        amount: 100.00,
        currency: 'SAR',
        description: 'Test Payment',
        metadata: {
          orderId: 'test-order-' + Date.now(),
        },
      },
      requiresAuth: true,
      skipOnFilter: true,
    }
  );
  results.push(tapCheckoutResult);
}

async function testWhatsAppEndpoints() {
  log('\n📱 Testing WhatsApp Integration...', 'INFO');

  const whatsappResult = await testEndpoint(
    'Admin - Send WhatsApp Notification',
    'POST',
    '/api/admin/notifications/send',
    {
      body: {
        recipients: {
          type: 'users',
          ids: testUserId ? [testUserId] : [],
        },
        channels: ['whatsapp'],
        subject: 'Test Notification',
        message: 'This is a test WhatsApp message from API testing',
        priority: 'normal',
      },
      requiresAuth: true,
      skipOnFilter: true,
    }
  );
  results.push(whatsappResult);
}

async function testFinanceEndpoints() {
  log('\n📊 Testing Finance Endpoints...', 'INFO');

  // Balance sheet - GET request with query params
  const asOf = new Date().toISOString();
  const balanceSheetResult = await testEndpoint(
    'Finance - Balance Sheet Report',
    'GET',
    `/api/finance/reports/balance-sheet?asOf=${encodeURIComponent(asOf)}`,
    {
      requiresAuth: true,
      skipOnFilter: true,
    }
  );
  results.push(balanceSheetResult);

  // Income statement - GET request with query params
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = new Date().toISOString();
  const incomeStatementResult = await testEndpoint(
    'Finance - Income Statement',
    'GET',
    `/api/finance/reports/income-statement?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
    {
      requiresAuth: true,
      skipOnFilter: true,
    }
  );
  results.push(incomeStatementResult);
}

async function testWorkOrderEndpoints() {
  log('\n🔧 Testing Work Order Endpoints...', 'INFO');

  let workOrderId: string | null = null;

  // Create work order
  const createResult = await testEndpoint(
    'Work Orders - Create',
    'POST',
    '/api/work-orders',
    {
      body: {
        title: 'Test Work Order - Leaking Faucet',
        description: 'Kitchen faucet is leaking and needs repair',
        type: 'MAINTENANCE',
        priority: 'MEDIUM',
        category: 'PLUMBING',
        propertyId: testUserId || '691a122168aef400bf90dbbe', // API extracts this into location.propertyId
        unitNumber: '101',
        requester: {
          type: 'STAFF',
          name: 'Test Admin',
          phone: '+966500000001',
        },
      },
      requiresAuth: true,
      expectedStatus: 201,
      skipOnFilter: true,
    }
  );
  results.push(createResult);
  
  if (createResult.status === 'PASS' && createResult.response?.workOrderId) {
    workOrderId = createResult.response.workOrderId;
  }

  // List work orders
  const listResult = await testEndpoint(
    'Work Orders - List',
    'GET',
    '/api/work-orders',
    {
      requiresAuth: true,
      skipOnFilter: true,
    }
  );
  results.push(listResult);

  // Get specific work order
  if (workOrderId) {
    const getResult = await testEndpoint(
      'Work Orders - Get by ID',
      'GET',
      `/api/work-orders/${workOrderId}`,
      {
        requiresAuth: true,
        skipOnFilter: true,
      }
    );
    results.push(getResult);

    // Update work order status
    const statusResult = await testEndpoint(
      'Work Orders - Update Status',
      'PATCH',
      `/api/work-orders/${workOrderId}/status`,
      {
        body: {
          status: 'IN_PROGRESS',
        },
        requiresAuth: true,
        skipOnFilter: true,
      }
    );
    results.push(statusResult);

    // Add comment
    const commentResult = await testEndpoint(
      'Work Orders - Add Comment',
      'POST',
      `/api/work-orders/${workOrderId}/comments`,
      {
        body: {
          comment: 'Test comment from API testing',
        },
        requiresAuth: true,
        skipOnFilter: true,
      }
    );
    results.push(commentResult);
  }
}

// Main execution
async function main() {
  console.log('🚀 Fixzit API Endpoint Testing\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test Org ID: ${TEST_ORG_ID}`);
  if (ENDPOINT_FILTER) {
    console.log(`Filter: ${ENDPOINT_FILTER}`);
  }
  console.log('');

  // Authenticate test user first
  log('\n🔑 Authenticating test user...', 'INFO');
  const authSuccess = await authenticateTestUser();
  
  if (!authSuccess) {
    log('⚠️  Authentication failed. Tests requiring auth will be skipped.', 'WARN');
  }

  const startTime = Date.now();

  try {
    await testAuthEndpoints();
    await testPaymentEndpoints();
    await testWhatsAppEndpoints();
    await testFinanceEndpoints();
    await testWorkOrderEndpoints();
  } catch (error) {
    log(`Fatal error: ${error instanceof Error ? error.message : String(error)}`, 'ERROR');
  }

  const duration = Date.now() - startTime;

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📋 Test Results Summary');
  console.log('='.repeat(80) + '\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  results.forEach(result => {
    if (result.status === 'SKIP') return;
    
    const icon = result.status === 'PASS' ? '✅' : '❌';
    const statusColor = result.status === 'PASS' ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';
    
    console.log(`${icon} ${result.endpoint} (${result.method})`);
    console.log(`   Status: ${statusColor}${result.status}${reset} | Code: ${result.statusCode || 'N/A'} | Duration: ${result.duration}ms`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  });

  console.log('='.repeat(80));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Skipped: ${skipped}`);
  console.log(`Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
  console.log('='.repeat(80) + '\n');

  if (failed > 0) {
    log(`❌ ${failed} test(s) failed`, 'ERROR');
    process.exit(1);
  } else {
    log(`✅ All tests passed!`, 'SUCCESS');
    process.exit(0);
  }
}

main().catch(error => {
  log(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`, 'ERROR');
  process.exit(1);
});
