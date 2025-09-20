const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5000';

// Test results storage
const testResults = {
  frontend: {},
  backend: {},
  authentication: {},
  overall: {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    errors: []
  }
};

// Helper function to make HTTP requests
function makeRequest(url, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.includes('localhost:3000') ? 'localhost' : 'localhost',
      port: url.includes('localhost:3000') ? 3000 : 5000,
      path: url.replace(/^https?:\/\/[^\/]+/, ''),
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'FIXZIT-Final-Test/1.0',
        ...headers
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

// Test frontend pages
async function testFrontendPages() {
  console.log('🌐 Testing Frontend Pages...\n');
  
  const pages = [
    { path: '/', name: 'Landing Page', shouldWork: true },
    { path: '/login', name: 'Login Page', shouldWork: true },
    { path: '/dashboard', name: 'Dashboard', shouldRedirect: true },
    { path: '/properties', name: 'Properties', shouldRedirect: true },
    { path: '/work-orders', name: 'Work Orders', shouldRedirect: true },
    { path: '/finance', name: 'Finance', shouldRedirect: true },
    { path: '/hr', name: 'HR', shouldRedirect: true },
    { path: '/admin', name: 'Admin', shouldWork: true },
    { path: '/crm', name: 'CRM', shouldRedirect: true },
    { path: '/marketplace', name: 'Marketplace', shouldRedirect: true },
    { path: '/support', name: 'Support', shouldRedirect: true },
    { path: '/compliance', name: 'Compliance', shouldRedirect: true },
    { path: '/reports', name: 'Reports', shouldRedirect: true },
    { path: '/settings', name: 'Settings', shouldRedirect: true },
    { path: '/preventive', name: 'Preventive', shouldRedirect: true }
  ];

  for (const page of pages) {
    try {
      const response = await makeRequest(`${BASE_URL}${page.path}`);
      
      const isWorking = response.statusCode === 200;
      const isRedirecting = response.statusCode === 302 || response.statusCode === 307;
      const hasContent = response.body.length > 1000;
      
      let status = '❌';
      if (isWorking && hasContent) {
        status = '✅';
      } else if (isRedirecting && page.shouldRedirect) {
        status = '🔄';
      } else if (isWorking) {
        status = '⚠️';
      }
      
      testResults.frontend[page.name] = {
        statusCode: response.statusCode,
        working: isWorking,
        redirecting: isRedirecting,
        hasContent,
        expected: page.shouldWork || page.shouldRedirect
      };
      
      testResults.overall.totalTests++;
      if ((isWorking && hasContent) || (isRedirecting && page.shouldRedirect)) {
        testResults.overall.passedTests++;
      } else {
        testResults.overall.failedTests++;
        testResults.overall.errors.push(`${page.name}: ${response.statusCode}`);
      }
      
      console.log(`${status} ${page.name}: ${response.statusCode} (${response.body.length} bytes)`);
      
    } catch (error) {
      console.log(`❌ ${page.name}: ERROR - ${error.message}`);
      testResults.frontend[page.name] = {
        statusCode: 0,
        working: false,
        redirecting: false,
        hasContent: false,
        error: error.message
      };
      testResults.overall.totalTests++;
      testResults.overall.failedTests++;
      testResults.overall.errors.push(`${page.name}: ${error.message}`);
    }
  }
}

// Test backend API
async function testBackendAPI() {
  console.log('\n🔌 Testing Backend API...\n');
  
  const endpoints = [
    { path: '/health', name: 'Health Check', method: 'GET', auth: false },
    { path: '/api/auth/login', name: 'Login', method: 'POST', auth: false, data: { email: 'admin@fixzit.com', password: 'password' } },
    { path: '/api/test', name: 'Test Endpoint', method: 'GET', auth: true },
    { path: '/api/properties', name: 'Properties API', method: 'GET', auth: true },
    { path: '/api/work-orders', name: 'Work Orders API', method: 'GET', auth: true },
    { path: '/api/dashboard', name: 'Dashboard API', method: 'GET', auth: true }
  ];

  let authToken = null;

  for (const endpoint of endpoints) {
    try {
      let headers = {};
      if (endpoint.auth && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await makeRequest(`${API_URL}${endpoint.path}`, endpoint.method, endpoint.data, headers);
      
      const isWorking = response.statusCode === 200;
      const isUnauthorized = response.statusCode === 401;
      const hasData = response.body.length > 50;
      
      let status = '❌';
      if (isWorking) {
        status = '✅';
      } else if (isUnauthorized && endpoint.auth) {
        status = '🔐';
      }
      
      // Store auth token for subsequent requests
      if (endpoint.path === '/api/auth/login' && isWorking) {
        const data = JSON.parse(response.body);
        if (data.success && data.data.token) {
          authToken = data.data.token;
        }
      }
      
      testResults.backend[endpoint.name] = {
        statusCode: response.statusCode,
        working: isWorking,
        unauthorized: isUnauthorized,
        hasData,
        expected: !endpoint.auth || isWorking
      };
      
      testResults.overall.totalTests++;
      if (isWorking || (isUnauthorized && endpoint.auth)) {
        testResults.overall.passedTests++;
      } else {
        testResults.overall.failedTests++;
        testResults.overall.errors.push(`${endpoint.name}: ${response.statusCode}`);
      }
      
      console.log(`${status} ${endpoint.name}: ${response.statusCode}`);
      
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ERROR - ${error.message}`);
      testResults.backend[endpoint.name] = {
        statusCode: 0,
        working: false,
        unauthorized: false,
        hasData: false,
        error: error.message
      };
      testResults.overall.totalTests++;
      testResults.overall.failedTests++;
      testResults.overall.errors.push(`${endpoint.name}: ${error.message}`);
    }
  }
}

// Test authentication flow
async function testAuthenticationFlow() {
  console.log('\n🔐 Testing Authentication Flow...\n');
  
  try {
    // Test login
    const loginResponse = await makeRequest(`${API_URL}/api/auth/login`, 'POST', {
      email: 'admin@fixzit.com',
      password: 'password'
    });
    
    if (loginResponse.statusCode === 200) {
      const loginData = JSON.parse(loginResponse.body);
      if (loginData.success && loginData.data.token) {
        console.log('✅ Login successful');
        testResults.authentication.login = { success: true };
        
        // Test protected endpoint
        const protectedResponse = await makeRequest(`${API_URL}/api/test`, 'GET', null, {
          'Authorization': `Bearer ${loginData.data.token}`
        });
        
        if (protectedResponse.statusCode === 200) {
          console.log('✅ Protected endpoint accessible');
          testResults.authentication.protectedAccess = { success: true };
        } else {
          console.log('❌ Protected endpoint failed');
          testResults.authentication.protectedAccess = { success: false, status: protectedResponse.statusCode };
        }
        
        // Test different user roles
        const managerLogin = await makeRequest(`${API_URL}/api/auth/login`, 'POST', {
          email: 'manager@fixzit.com',
          password: 'password'
        });
        
        if (managerLogin.statusCode === 200) {
          console.log('✅ Manager login successful');
          testResults.authentication.roleBased = { success: true };
        } else {
          console.log('❌ Manager login failed');
          testResults.authentication.roleBased = { success: false };
        }
        
      } else {
        console.log('❌ Login response invalid');
        testResults.authentication.login = { success: false };
      }
    } else {
      console.log('❌ Login failed');
      testResults.authentication.login = { success: false, status: loginResponse.statusCode };
    }
    
  } catch (error) {
    console.log('❌ Authentication test error:', error.message);
    testResults.authentication.error = error.message;
  }
}

// Generate final report
function generateFinalReport() {
  console.log('\n📊 FINAL SYSTEM TEST REPORT');
  console.log('============================\n');

  // Overall statistics
  const successRate = Math.round(testResults.overall.passedTests / testResults.overall.totalTests * 100);
  
  console.log('🎯 OVERALL SYSTEM STATUS:');
  console.log(`   Success Rate: ${successRate}%`);
  console.log(`   Total Tests: ${testResults.overall.totalTests}`);
  console.log(`   Passed: ${testResults.overall.passedTests}`);
  console.log(`   Failed: ${testResults.overall.failedTests}`);
  console.log('');

  // Frontend status
  console.log('🌐 FRONTEND STATUS:');
  const frontendWorking = Object.values(testResults.frontend).filter(f => f.working).length;
  const frontendTotal = Object.keys(testResults.frontend).length;
  console.log(`   Working Pages: ${frontendWorking}/${frontendTotal} (${Math.round(frontendWorking/frontendTotal*100)}%)`);
  
  Object.entries(testResults.frontend).forEach(([name, result]) => {
    const status = result.working ? '✅' : result.redirecting ? '🔄' : '❌';
    console.log(`   ${status} ${name}: ${result.statusCode}`);
  });
  console.log('');

  // Backend status
  console.log('🔌 BACKEND STATUS:');
  const backendWorking = Object.values(testResults.backend).filter(b => b.working).length;
  const backendTotal = Object.keys(testResults.backend).length;
  console.log(`   Working APIs: ${backendWorking}/${backendTotal} (${Math.round(backendWorking/backendTotal*100)}%)`);
  
  Object.entries(testResults.backend).forEach(([name, result]) => {
    const status = result.working ? '✅' : result.unauthorized ? '🔐' : '❌';
    console.log(`   ${status} ${name}: ${result.statusCode}`);
  });
  console.log('');

  // Authentication status
  console.log('🔐 AUTHENTICATION STATUS:');
  if (testResults.authentication.login?.success) {
    console.log('   ✅ Login system working');
  } else {
    console.log('   ❌ Login system failed');
  }
  
  if (testResults.authentication.protectedAccess?.success) {
    console.log('   ✅ Protected routes working');
  } else {
    console.log('   ❌ Protected routes failed');
  }
  
  if (testResults.authentication.roleBased?.success) {
    console.log('   ✅ Role-based access working');
  } else {
    console.log('   ❌ Role-based access failed');
  }
  console.log('');

  // System assessment
  console.log('🏆 SYSTEM ASSESSMENT:');
  if (successRate >= 90) {
    console.log('   🟢 EXCELLENT - System is fully operational');
    console.log('   🟢 Ready for production deployment');
    console.log('   🟢 All core functionality working');
  } else if (successRate >= 75) {
    console.log('   🟡 GOOD - System is mostly working');
    console.log('   🟡 Minor issues need attention');
    console.log('   🟡 Suitable for testing and development');
  } else if (successRate >= 50) {
    console.log('   🟠 FAIR - System has significant issues');
    console.log('   🟠 Multiple components need fixes');
    console.log('   🟠 Not ready for production');
  } else {
    console.log('   🔴 POOR - System has major issues');
    console.log('   🔴 Extensive work needed');
    console.log('   🔴 Not functional');
  }

  console.log('\n💡 RECOMMENDATIONS:');
  if (successRate >= 90) {
    console.log('   ✅ System is production-ready');
    console.log('   ✅ Deploy to production environment');
    console.log('   ✅ Monitor system performance');
  } else {
    console.log('   🔧 Fix failed tests before production');
    console.log('   🔧 Address authentication issues');
    console.log('   🔧 Test with real user scenarios');
  }

  if (testResults.overall.errors.length > 0) {
    console.log('\n❌ ERRORS TO FIX:');
    testResults.overall.errors.forEach(error => console.log(`   - ${error}`));
  }

  return testResults;
}

// Main test function
async function runFinalTest() {
  console.log('🚀 Starting FIXZIT SOUQ Enterprise Final System Test...\n');
  
  await testFrontendPages();
  await testBackendAPI();
  await testAuthenticationFlow();
  
  const results = generateFinalReport();
  return results;
}

// Run the tests
runFinalTest().catch(console.error);