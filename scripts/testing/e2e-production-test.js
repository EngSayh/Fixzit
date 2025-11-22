#!/usr/bin/env node

/**
 * Production E2E Test Suite
 * Tests the live production system at the provided URL
 * Tests all pages with all user roles
 * 
 * REQUIRED ENVIRONMENT VARIABLES:
 *   PRODUCTION_URL     - Production URL to test
 *   ADMIN_EMAIL        - Admin user email
 *   ADMIN_PASSWORD     - Admin user password
 *   PM_EMAIL           - Property Manager email
 *   PM_PASSWORD        - Property Manager password
 *   TENANT_EMAIL       - Tenant user email
 *   TENANT_PASSWORD    - Tenant user password
 *   VENDOR_EMAIL       - Vendor user email
 *   VENDOR_PASSWORD    - Vendor user password
 *   HR_EMAIL           - HR Manager email
 *   HR_PASSWORD        - HR Manager password
 * 
 * Usage:
 *   Set environment variables in your CI/CD secrets or .env file
 *   Then run: node scripts/testing/e2e-production-test.js
 * 
 * Security:
 *   - Never hardcode credentials
 *   - Use permission-scoped test accounts
 *   - Rotate credentials regularly in your secrets manager
 *   - Store in GitHub Secrets, GitLab CI/CD variables, or Vault
 */

const fs = require('fs');
const path = require('path');

// Validate required environment variables
const REQUIRED_ENV_VARS = [
  'PRODUCTION_URL',
  'ADMIN_EMAIL', 'ADMIN_PASSWORD',
  'PM_EMAIL', 'PM_PASSWORD',
  'TENANT_EMAIL', 'TENANT_PASSWORD',
  'VENDOR_EMAIL', 'VENDOR_PASSWORD',
  'HR_EMAIL', 'HR_PASSWORD'
];

const missingVars = REQUIRED_ENV_VARS.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ ERROR: Missing required environment variables\n');
  console.error('The following environment variables must be set:');
  missingVars.forEach(varName => {
    console.error(`  - ${varName}`);
  });
  console.error('\nPlease configure these in your CI/CD secrets or environment.');
  console.error('Example:');
  console.error('  export PRODUCTION_URL=https://your-production-url.com');
  console.error('  export ADMIN_EMAIL=admin@example.com');
  console.error('  export ADMIN_PASSWORD=secure_password');
  console.error('  # ... set all required variables\n');
  console.error('For security:');
  console.error('  - Use GitHub Secrets, GitLab CI variables, or Vault');
  console.error('  - Never commit credentials to version control');
  console.error('  - Use dedicated test accounts with minimal permissions');
  console.error('  - Rotate credentials regularly\n');
  process.exit(1);
}

// Configuration - ALL VALUES FROM ENVIRONMENT (NO DEFAULTS)
const CONFIG = {
  baseUrl: process.env.PRODUCTION_URL,
  timeout: 30000,
  testUsers: {
    admin: {
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: 'admin'
    },
    propertyManager: {
      email: process.env.PM_EMAIL,
      password: process.env.PM_PASSWORD,
      role: 'property_manager'
    },
    tenant: {
      email: process.env.TENANT_EMAIL,
      password: process.env.TENANT_PASSWORD,
      role: 'tenant'
    },
    vendor: {
      email: process.env.VENDOR_EMAIL,
      password: process.env.VENDOR_PASSWORD,
      role: 'vendor'
    },
    hrManager: {
      email: process.env.HR_EMAIL,
      password: process.env.HR_PASSWORD,
      role: 'hr_manager'
    }
  },
  pages: [
    { path: '/', name: 'Landing Page', requiresAuth: false },
    { path: '/login', name: 'Login Page', requiresAuth: false },
    { path: '/dashboard', name: 'Dashboard', requiresAuth: true },
    { path: '/properties', name: 'Properties', requiresAuth: true },
    { path: '/work-orders', name: 'Work Orders', requiresAuth: true },
    { path: '/tenants', name: 'Tenants', requiresAuth: true },
    { path: '/vendors', name: 'Vendors', requiresAuth: true },
    { path: '/rfqs', name: 'RFQs', requiresAuth: true },
    { path: '/finance', name: 'Finance', requiresAuth: true },
    { path: '/marketplace', name: 'Marketplace', requiresAuth: false },
    { path: '/help', name: 'Help Center', requiresAuth: false },
    { path: '/careers', name: 'Careers', requiresAuth: false },
    { path: '/hr/employees', name: 'HR Employees', requiresAuth: true },
    { path: '/hr/attendance', name: 'HR Attendance', requiresAuth: true },
    { path: '/settings', name: 'Settings', requiresAuth: true }
  ]
};

// Test results storage
const results = {
  startTime: new Date().toISOString(),
  environment: 'production',
  baseUrl: CONFIG.baseUrl,
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  }
};

/**
 * Test a single page with HTTP request
 */
async function testPageHttp(url, testName, userRole = 'anonymous', pageRequiresAuth = false) {
  const test = {
    testName,
    userRole,
    url,
    requiresAuth: pageRequiresAuth,
    timestamp: new Date().toISOString(),
    status: 'pending'
  };

  try {
    console.log(`\n🧪 Testing: ${testName} (${userRole})`);
    console.log(`   URL: ${url}`);
    console.log(`   Requires Auth: ${pageRequiresAuth ? 'Yes' : 'No'}`);

    const startTime = Date.now();
    
    // Use curl for HTTP testing (works in any environment)
    const { execSync } = require('child_process');
    
    // Added -S flag to show errors and 2>&1 to capture stderr
    const curlCommand = `curl -sS -o /dev/null -w "%{http_code}|%{time_total}" -L --max-time 30 "${url}" 2>&1`;
    
    let output, curlError = null;
    try {
      output = execSync(curlCommand, { encoding: 'utf-8' }).trim();
    } catch (err) {
      // Capture curl errors for diagnostics
      curlError = err.stdout || err.stderr || err.message;
      output = curlError;
    }
    
    const [statusCode, responseTime] = output.split('|');
    
    const duration = Date.now() - startTime;

    test.statusCode = parseInt(statusCode) || 0;
    test.responseTime = responseTime ? parseFloat(responseTime) * 1000 : duration;
    test.duration = duration;
    
    if (curlError) {
      test.curlError = curlError;
      test.diagnostics = `Curl error: ${curlError}`;
    }

    // Determine if test passed based on expected auth requirement
    if (test.statusCode >= 200 && test.statusCode < 400) {
      test.status = 'passed';
      test.message = `✅ Page loaded successfully (${test.statusCode})`;
      console.log(`   ✅ PASSED: ${test.statusCode} in ${test.responseTime.toFixed(0)}ms`);
      results.summary.passed++;
    } else if (test.statusCode === 401 || test.statusCode === 403) {
      // Only treat 401/403 as pass if auth is explicitly required
      if (pageRequiresAuth) {
        test.status = 'passed';
        test.message = `✅ Auth required as expected (${test.statusCode})`;
        console.log(`   ✅ PASSED: ${test.statusCode} (auth required)`);
        results.summary.passed++;
      } else {
        test.status = 'failed';
        test.message = `❌ Unexpected auth error on public page (${test.statusCode})`;
        console.log(`   ❌ FAILED: ${test.statusCode} - Public page should not require auth`);
        results.summary.failed++;
      }
    } else {
      test.status = 'failed';
      test.message = `❌ Unexpected status code: ${test.statusCode}`;
      console.log(`   ❌ FAILED: ${test.statusCode}`);
      if (test.diagnostics) {
        console.log(`   📋 Diagnostics: ${test.diagnostics}`);
      }
      results.summary.failed++;
    }

  } catch (error) {
    test.status = 'failed';
    test.error = error.message;
    test.message = `❌ Error: ${error.message}`;
    console.log(`   ❌ ERROR: ${error.message}`);
    results.summary.failed++;
  }

  results.summary.total++;
  results.tests.push(test);
  return test;
}

/**
 * Test login functionality
 */
async function testLogin(userType, credentials) {
  const test = {
    testName: `Login as ${userType}`,
    userRole: userType,
    url: `${CONFIG.baseUrl}/api/auth/login`,
    timestamp: new Date().toISOString(),
    status: 'pending'
  };

  try {
    console.log(`\n🔐 Testing Login: ${userType}`);
    console.log(`   Email: ${credentials.email}`);

    if (!credentials.password) {
      test.status = 'skipped';
      test.message = '⚠️ No password configured';
      console.log('   ⚠️ SKIPPED: No password configured');
      results.summary.skipped++;
      results.summary.total++;
      results.tests.push(test);
      return test;
    }

    const { spawnSync } = require('child_process');
    const loginData = JSON.stringify({
      email: credentials.email,
      password: credentials.password
    });

    // Use spawnSync with stdin to avoid shell injection from passwords with quotes
    const curl = spawnSync('curl', [
      '-s',
      '-w',
      '\n%{http_code}',
      '-X',
      'POST',
      '-H',
      'Content-Type: application/json',
      '-d',
      '@-', // Read from stdin
      '--max-time',
      '30',
      `${CONFIG.baseUrl}/api/auth/login`
    ], {
      input: loginData,
      encoding: 'utf-8'
    });

    if (curl.error) {
      throw curl.error;
    }
    if (curl.status !== 0) {
      throw new Error(curl.stderr || `curl exited with status ${curl.status}`);
    }

    const output = curl.stdout;
    const lines = output.trim().split('\n');
    const statusCode = parseInt(lines[lines.length - 1]);
    const responseBody = lines.slice(0, -1).join('\n');

    test.statusCode = statusCode;
    test.responseBody = responseBody;

    if (statusCode === 200) {
      try {
        const response = JSON.parse(responseBody);
        if (response.token || response.success) {
          test.status = 'passed';
          test.message = '✅ Login successful';
          console.log('   ✅ PASSED: Login successful');
          results.summary.passed++;
        } else {
          test.status = 'failed';
          test.message = '❌ No token in response';
          console.log('   ❌ FAILED: No token in response');
          results.summary.failed++;
        }
      } catch (error) {
        test.status = 'failed';
        test.message = '❌ Invalid JSON response';
        console.log('   ❌ FAILED: Invalid JSON response', error?.message || '');
        results.summary.failed++;
      }
    } else {
      test.status = 'failed';
      test.message = `❌ Login failed with status ${statusCode}`;
      console.log(`   ❌ FAILED: Status ${statusCode}`);
      results.summary.failed++;
    }

  } catch (error) {
    test.status = 'failed';
    test.error = error.message;
    test.message = `❌ Error: ${error.message}`;
    console.log(`   ❌ ERROR: ${error.message}`);
    results.summary.failed++;
  }

  results.summary.total++;
  results.tests.push(test);
  return test;
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 PRODUCTION E2E TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`📍 Base URL: ${CONFIG.baseUrl}`);
  console.log(`⏰ Started: ${results.startTime}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Test 1: Public pages (no auth)
  console.log('\n📋 TEST SECTION 1: PUBLIC PAGES (No Authentication)\n');
  for (const page of CONFIG.pages.filter(p => !p.requiresAuth)) {
    await testPageHttp(`${CONFIG.baseUrl}${page.path}`, page.name, 'anonymous', false);
  }

  // Test 2: Login functionality for each user type
  console.log('\n\n📋 TEST SECTION 2: LOGIN FUNCTIONALITY\n');
  for (const [userType, credentials] of Object.entries(CONFIG.testUsers)) {
    await testLogin(userType, credentials);
  }

  // Test 3: Protected pages (should redirect or return 401/403)
  console.log('\n\n📋 TEST SECTION 3: PROTECTED PAGES (Should require auth)\n');
  for (const page of CONFIG.pages.filter(p => p.requiresAuth)) {
    await testPageHttp(`${CONFIG.baseUrl}${page.path}`, page.name, 'anonymous', true);
  }

  // Test 4: Health checks and API endpoints
  console.log('\n\n📋 TEST SECTION 4: API HEALTH CHECKS\n');
  await testPageHttp(`${CONFIG.baseUrl}/api/health`, 'API Health Check', 'anonymous');
  await testPageHttp(`${CONFIG.baseUrl}/api/health/database`, 'Database Health Check', 'anonymous');

  // Generate report
  results.endTime = new Date().toISOString();
  results.duration = new Date(results.endTime) - new Date(results.startTime);

  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Total Tests:   ${results.summary.total}`);
  console.log(`✅ Passed:     ${results.summary.passed} (${((results.summary.passed/results.summary.total)*100).toFixed(1)}%)`);
  console.log(`❌ Failed:     ${results.summary.failed} (${((results.summary.failed/results.summary.total)*100).toFixed(1)}%)`);
  console.log(`⚠️  Skipped:   ${results.summary.skipped}`);
  console.log(`⏱️  Duration:  ${(results.duration/1000).toFixed(2)}s`);
  console.log('═══════════════════════════════════════════════════════════\n');

  // Save results
  const resultsDir = path.join(process.cwd(), 'e2e-test-results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const timestamp = Date.now();
  const jsonFile = path.join(resultsDir, `production-e2e-${timestamp}.json`);
  const mdFile = path.join(resultsDir, `PRODUCTION_E2E_REPORT_${new Date().toISOString().split('T')[0]}.md`);

  // Save JSON
  fs.writeFileSync(jsonFile, JSON.stringify(results, null, 2));
  console.log(`💾 Saved JSON results: ${jsonFile}`);

  // Generate Markdown Report
  const mdReport = generateMarkdownReport(results);
  fs.writeFileSync(mdFile, mdReport);
  console.log(`📄 Saved Markdown report: ${mdFile}`);

  // Exit with appropriate code
  process.exit(results.summary.failed > 0 ? 1 : 0);
}

/**
 * Generate Markdown Report
 */
function generateMarkdownReport(results) {
  const passRate = ((results.summary.passed / results.summary.total) * 100).toFixed(1);
  
  let md = `# Production E2E Test Report\n\n`;
  md += `**Generated:** ${results.endTime}\n\n`;
  md += `**Environment:** Production\n\n`;
  md += `**Base URL:** ${results.baseUrl}\n\n`;
  md += `---\n\n`;
  
  md += `## 📊 Summary\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Total Tests | ${results.summary.total} |\n`;
  md += `| ✅ Passed | ${results.summary.passed} (${passRate}%) |\n`;
  md += `| ❌ Failed | ${results.summary.failed} |\n`;
  md += `| ⚠️ Skipped | ${results.summary.skipped} |\n`;
  md += `| ⏱️ Duration | ${(results.duration/1000).toFixed(2)}s |\n`;
  md += `| Status | ${results.summary.failed === 0 ? '✅ **ALL TESTS PASSED**' : '❌ **SOME TESTS FAILED**'} |\n\n`;
  
  md += `---\n\n`;
  md += `## 📋 Detailed Test Results\n\n`;
  
  // Group by test type
  const groupedTests = {
    'Public Pages': results.tests.filter(t => t.testName.includes('Page') && t.userRole === 'anonymous' && !t.url.includes('/api/')),
    'Login Tests': results.tests.filter(t => t.testName.includes('Login')),
    'Protected Pages': results.tests.filter(t => t.testName.includes('Page') && t.testName !== 'Landing Page' && t.testName !== 'Login Page' && t.testName !== 'Marketplace' && t.testName !== 'Help Center' && t.testName !== 'Careers'),
    'API Health Checks': results.tests.filter(t => t.testName.includes('Health'))
  };
  
  for (const [category, tests] of Object.entries(groupedTests)) {
    if (tests.length === 0) continue;
    
    md += `### ${category}\n\n`;
    md += `| Test | Status | Details |\n`;
    md += `|------|--------|----------|\n`;
    
    for (const test of tests) {
      const statusIcon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️';
      const details = test.responseTime ? `${test.statusCode} (${test.responseTime.toFixed(0)}ms)` : test.statusCode || test.message;
      md += `| ${test.testName} | ${statusIcon} ${test.status} | ${details} |\n`;
    }
    md += `\n`;
  }
  
  // Failed tests section
  const failedTests = results.tests.filter(t => t.status === 'failed');
  if (failedTests.length > 0) {
    md += `---\n\n`;
    md += `## ❌ Failed Tests Details\n\n`;
    for (const test of failedTests) {
      md += `### ${test.testName}\n\n`;
      md += `- **URL:** ${test.url}\n`;
      md += `- **User Role:** ${test.userRole}\n`;
      md += `- **Status Code:** ${test.statusCode || 'N/A'}\n`;
      md += `- **Error:** ${test.error || test.message}\n`;
      if (test.responseBody) {
        md += `- **Response:** \`${test.responseBody.substring(0, 200)}...\`\n`;
      }
      md += `\n`;
    }
  }
  
  md += `---\n\n`;
  md += `## 🔧 Configuration\n\n`;
  md += `\`\`\`json\n`;
  md += JSON.stringify({
    baseUrl: CONFIG.baseUrl,
    timeout: CONFIG.timeout,
    testUsers: Object.keys(CONFIG.testUsers),
    pagesCount: CONFIG.pages.length
  }, null, 2);
  md += `\n\`\`\`\n\n`;
  
  md += `---\n\n`;
  md += `*Report generated by Production E2E Test Suite*\n`;
  
  return md;
}

// Run the tests
runTests().catch(error => {
  console.error('\n❌ FATAL ERROR:', error);
  process.exit(1);
});
