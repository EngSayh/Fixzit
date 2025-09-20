const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const MODULES = [
  'dashboard',
  'properties', 
  'work-orders',
  'finance',
  'hr',
  'admin',
  'crm',
  'marketplace',
  'support',
  'compliance',
  'reports',
  'settings',
  'preventive'
];

const ROLES = [
  'super_admin',
  'admin', 
  'property_manager',
  'employee',
  'vendor'
];

// Test results storage
const testResults = {
  pages: {},
  api: {},
  authentication: {},
  overall: {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    errors: []
  }
};

// Helper function to make HTTP requests
function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: url,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FIXZIT-Test-Suite/1.0'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body,
          url: url
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test page accessibility
async function testPage(page) {
  try {
    const response = await makeRequest(`/${page}`);
    const isAccessible = response.statusCode === 200;
    const isRedirect = response.statusCode === 302 || response.statusCode === 307;
    const isLoginRequired = response.body.includes('login') || response.body.includes('Login');
    
    return {
      accessible: isAccessible,
      redirected: isRedirect,
      loginRequired: isLoginRequired,
      statusCode: response.statusCode,
      hasContent: response.body.length > 1000,
      error: null
    };
  } catch (error) {
    return {
      accessible: false,
      redirected: false,
      loginRequired: false,
      statusCode: 0,
      hasContent: false,
      error: error.message
    };
  }
}

// Test API endpoints
async function testAPI() {
  const apiEndpoints = [
    '/api/test',
    '/api/properties',
    '/api/work-orders',
    '/api/finance/invoices',
    '/api/hr/employees',
    '/api/crm/contacts',
    '/api/marketplace/vendors',
    '/api/support/tickets',
    '/api/compliance/documents',
    '/api/reports/analytics',
    '/api/auth/session'
  ];

  const results = {};
  
  for (const endpoint of apiEndpoints) {
    try {
      const response = await makeRequest(endpoint);
      results[endpoint] = {
        statusCode: response.statusCode,
        accessible: response.statusCode < 500,
        hasResponse: response.body.length > 0,
        responseType: response.headers['content-type'] || 'unknown'
      };
    } catch (error) {
      results[endpoint] = {
        statusCode: 0,
        accessible: false,
        hasResponse: false,
        error: error.message
      };
    }
  }
  
  return results;
}

// Test authentication system
async function testAuthentication() {
  const authTests = {
    loginPage: await testPage('login'),
    authAPI: await makeRequest('/api/auth/session'),
    protectedRedirect: await makeRequest('/dashboard')
  };

  return {
    loginPageAccessible: authTests.loginPage.accessible,
    authAPIWorking: authTests.authAPI.statusCode < 500,
    protectedPagesRedirect: authTests.protectedRedirect.statusCode === 302 || authTests.protectedRedirect.statusCode === 307,
    sessionEndpoint: authTests.authAPI.statusCode
  };
}

// Main test function
async function runTests() {
  console.log('🚀 Starting FIXZIT SOUQ Enterprise System Tests...\n');
  
  // Test all module pages
  console.log('📄 Testing Module Pages...');
  for (const module of MODULES) {
    console.log(`  Testing /${module}...`);
    const result = await testPage(module);
    testResults.pages[module] = result;
    testResults.overall.totalTests++;
    
    if (result.accessible || result.redirected) {
      testResults.overall.passedTests++;
      console.log(`    ✅ ${module}: ${result.statusCode} ${result.redirected ? '(Redirected)' : '(Accessible)'}`);
    } else {
      testResults.overall.failedTests++;
      testResults.overall.errors.push(`${module}: ${result.error || 'Failed'}`);
      console.log(`    ❌ ${module}: ${result.statusCode} - ${result.error || 'Failed'}`);
    }
  }

  // Test API endpoints
  console.log('\n🔌 Testing API Endpoints...');
  testResults.api = await testAPI();
  for (const [endpoint, result] of Object.entries(testResults.api)) {
    testResults.overall.totalTests++;
    if (result.accessible) {
      testResults.overall.passedTests++;
      console.log(`  ✅ ${endpoint}: ${result.statusCode}`);
    } else {
      testResults.overall.failedTests++;
      testResults.overall.errors.push(`${endpoint}: ${result.error || 'Failed'}`);
      console.log(`  ❌ ${endpoint}: ${result.statusCode} - ${result.error || 'Failed'}`);
    }
  }

  // Test authentication
  console.log('\n🔐 Testing Authentication System...');
  testResults.authentication = await testAuthentication();
  testResults.overall.totalTests += 4;
  
  if (testResults.authentication.loginPageAccessible) {
    testResults.overall.passedTests++;
    console.log('  ✅ Login page accessible');
  } else {
    testResults.overall.failedTests++;
    console.log('  ❌ Login page not accessible');
  }

  if (testResults.authentication.authAPIWorking) {
    testResults.overall.passedTests++;
    console.log('  ✅ Auth API working');
  } else {
    testResults.overall.failedTests++;
    console.log('  ❌ Auth API not working');
  }

  if (testResults.authentication.protectedPagesRedirect) {
    testResults.overall.passedTests++;
    console.log('  ✅ Protected pages redirect to login');
  } else {
    testResults.overall.failedTests++;
    console.log('  ❌ Protected pages not redirecting');
  }

  if (testResults.authentication.sessionEndpoint < 500) {
    testResults.overall.passedTests++;
    console.log('  ✅ Session endpoint responding');
  } else {
    testResults.overall.failedTests++;
    console.log('  ❌ Session endpoint not responding');
  }

  // Generate report
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('========================');
  console.log(`Total Tests: ${testResults.overall.totalTests}`);
  console.log(`Passed: ${testResults.overall.passedTests} (${Math.round(testResults.overall.passedTests / testResults.overall.totalTests * 100)}%)`);
  console.log(`Failed: ${testResults.overall.failedTests} (${Math.round(testResults.overall.failedTests / testResults.overall.totalTests * 100)}%)`);
  
  if (testResults.overall.errors.length > 0) {
    console.log('\n❌ ERRORS:');
    testResults.overall.errors.forEach(error => console.log(`  - ${error}`));
  }

  // Module-specific results
  console.log('\n📋 MODULE STATUS:');
  for (const [module, result] of Object.entries(testResults.pages)) {
    const status = result.accessible ? '✅ WORKING' : result.redirected ? '🔄 REDIRECT' : '❌ FAILED';
    console.log(`  ${module.padEnd(15)}: ${status} (${result.statusCode})`);
  }

  // API Status
  console.log('\n🔌 API STATUS:');
  for (const [endpoint, result] of Object.entries(testResults.api)) {
    const status = result.accessible ? '✅ WORKING' : '❌ FAILED';
    console.log(`  ${endpoint.padEnd(25)}: ${status} (${result.statusCode})`);
  }

  console.log('\n🎯 SYSTEM STATUS:');
  const successRate = Math.round(testResults.overall.passedTests / testResults.overall.totalTests * 100);
  if (successRate >= 90) {
    console.log('🟢 EXCELLENT - System is fully operational');
  } else if (successRate >= 75) {
    console.log('🟡 GOOD - System is mostly working with minor issues');
  } else if (successRate >= 50) {
    console.log('🟠 FAIR - System has significant issues but core functionality works');
  } else {
    console.log('🔴 POOR - System has major issues and needs attention');
  }

  return testResults;
}

// Run the tests
runTests().catch(console.error);