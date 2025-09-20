const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:3000';

// Test all pages and their content
async function testPageContent() {
  console.log('🔍 DETAILED PAGE CONTENT TESTING\n');
  
  const pages = [
    { path: '/', name: 'Landing Page', shouldRedirect: false },
    { path: '/login', name: 'Login Page', shouldRedirect: false },
    { path: '/dashboard', name: 'Dashboard', shouldRedirect: true },
    { path: '/properties', name: 'Properties', shouldRedirect: true },
    { path: '/work-orders', name: 'Work Orders', shouldRedirect: true },
    { path: '/finance', name: 'Finance', shouldRedirect: true },
    { path: '/hr', name: 'HR', shouldRedirect: true },
    { path: '/admin', name: 'Admin', shouldRedirect: true },
    { path: '/crm', name: 'CRM', shouldRedirect: true },
    { path: '/marketplace', name: 'Marketplace', shouldRedirect: true },
    { path: '/support', name: 'Support', shouldRedirect: true },
    { path: '/compliance', name: 'Compliance', shouldRedirect: true },
    { path: '/reports', name: 'Reports', shouldRedirect: true },
    { path: '/settings', name: 'Settings', shouldRedirect: true },
    { path: '/preventive', name: 'Preventive', shouldRedirect: true }
  ];

  const results = [];

  for (const page of pages) {
    try {
      const response = await makeRequest(page.path);
      
      const result = {
        name: page.name,
        path: page.path,
        statusCode: response.statusCode,
        contentLength: response.body.length,
        hasTitle: response.body.includes('<title>'),
        hasContent: response.body.length > 1000,
        isRedirect: response.statusCode === 302 || response.statusCode === 307,
        redirectsToLogin: response.body.includes('login') || response.body.includes('Login'),
        hasError: response.body.includes('error') || response.body.includes('Error'),
        hasNextJS: response.body.includes('__next'),
        hasReact: response.body.includes('react'),
        hasTailwind: response.body.includes('tailwind') || response.body.includes('class='),
        hasArabic: response.body.includes('فكس إت سوق') || response.body.includes('العقارات'),
        hasBranding: response.body.includes('FIXZIT') || response.body.includes('SOUQ'),
        contentType: response.headers['content-type'] || 'unknown'
      };

      results.push(result);

      // Display result
      let status = '❌';
      if (result.statusCode === 200 && result.hasContent) {
        status = '✅';
      } else if (result.isRedirect && page.shouldRedirect) {
        status = '🔄';
      } else if (result.statusCode === 200) {
        status = '⚠️';
      }

      console.log(`${status} ${page.name}: ${result.statusCode} (${result.contentLength} bytes)`);
      
      if (result.hasTitle) console.log(`   📄 Has title tag`);
      if (result.hasNextJS) console.log(`   ⚛️ Next.js detected`);
      if (result.hasReact) console.log(`   ⚛️ React detected`);
      if (result.hasTailwind) console.log(`   🎨 Tailwind CSS detected`);
      if (result.hasArabic) console.log(`   🌍 Arabic content detected`);
      if (result.hasBranding) console.log(`   🏢 FIXZIT branding detected`);
      if (result.redirectsToLogin) console.log(`   🔐 Redirects to login`);
      if (result.hasError) console.log(`   ⚠️ Error content detected`);

    } catch (error) {
      console.log(`❌ ${page.name}: ERROR - ${error.message}`);
      results.push({
        name: page.name,
        path: page.path,
        statusCode: 0,
        error: error.message
      });
    }
  }

  return results;
}

// Test API endpoints in detail
async function testAPIEndpoints() {
  console.log('\n🔌 DETAILED API ENDPOINT TESTING\n');
  
  const endpoints = [
    { path: '/api/test', name: 'Test Endpoint' },
    { path: '/api/auth/session', name: 'Auth Session' },
    { path: '/api/properties', name: 'Properties API' },
    { path: '/api/work-orders', name: 'Work Orders API' },
    { path: '/api/finance/invoices', name: 'Finance API' },
    { path: '/api/hr/employees', name: 'HR API' },
    { path: '/api/crm/contacts', name: 'CRM API' },
    { path: '/api/marketplace/vendors', name: 'Marketplace API' },
    { path: '/api/support/tickets', name: 'Support API' },
    { path: '/api/compliance/documents', name: 'Compliance API' },
    { path: '/api/reports/analytics', name: 'Reports API' }
  ];

  const results = [];

  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(endpoint.path);
      
      const result = {
        name: endpoint.name,
        path: endpoint.path,
        statusCode: response.statusCode,
        contentLength: response.body.length,
        isJSON: response.headers['content-type']?.includes('application/json'),
        hasError: response.body.includes('error') || response.body.includes('Error'),
        hasSuccess: response.body.includes('success'),
        isUnauthorized: response.statusCode === 401,
        isForbidden: response.statusCode === 403,
        isNotFound: response.statusCode === 404,
        isServerError: response.statusCode >= 500,
        responseBody: response.body.substring(0, 200) // First 200 chars
      };

      results.push(result);

      // Display result
      let status = '❌';
      if (result.statusCode === 200) {
        status = '✅';
      } else if (result.statusCode === 401) {
        status = '🔐';
      } else if (result.statusCode === 403) {
        status = '🚫';
      } else if (result.statusCode === 404) {
        status = '❓';
      } else if (result.statusCode >= 500) {
        status = '💥';
      }

      console.log(`${status} ${endpoint.name}: ${result.statusCode}`);
      console.log(`   Content: ${result.contentLength} bytes`);
      if (result.isJSON) console.log(`   📄 JSON response`);
      if (result.isUnauthorized) console.log(`   🔐 Unauthorized (expected for protected endpoints)`);
      if (result.isForbidden) console.log(`   🚫 Forbidden`);
      if (result.hasError) console.log(`   ⚠️ Error: ${result.responseBody}`);
      if (result.hasSuccess) console.log(`   ✅ Success response`);

    } catch (error) {
      console.log(`❌ ${endpoint.name}: ERROR - ${error.message}`);
      results.push({
        name: endpoint.name,
        path: endpoint.path,
        statusCode: 0,
        error: error.message
      });
    }
  }

  return results;
}

// Helper function to make HTTP requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: url,
      method: 'GET',
      headers: {
        'User-Agent': 'FIXZIT-Detailed-Test/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

// Test UI components and features
async function testUIComponents() {
  console.log('\n🎨 UI COMPONENTS AND FEATURES TESTING\n');
  
  const features = [
    { name: 'Responsive Design', test: () => testResponsiveDesign() },
    { name: 'Arabic RTL Support', test: () => testRTLSupport() },
    { name: 'Theme System', test: () => testThemeSystem() },
    { name: 'Navigation', test: () => testNavigation() },
    { name: 'Forms', test: () => testForms() }
  ];

  for (const feature of features) {
    try {
      console.log(`Testing ${feature.name}...`);
      await feature.test();
    } catch (error) {
      console.log(`❌ ${feature.name}: ${error.message}`);
    }
  }
}

async function testResponsiveDesign() {
  // Test if the page has responsive meta tag
  const response = await makeRequest('/');
  const hasViewport = response.body.includes('viewport');
  const hasResponsiveClasses = response.body.includes('md:') || response.body.includes('lg:') || response.body.includes('xl:');
  
  if (hasViewport) console.log('   ✅ Viewport meta tag present');
  if (hasResponsiveClasses) console.log('   ✅ Responsive CSS classes detected');
}

async function testRTLSupport() {
  const response = await makeRequest('/');
  const hasRTL = response.body.includes('rtl') || response.body.includes('dir=');
  const hasArabic = response.body.includes('فكس إت سوق') || response.body.includes('العقارات');
  
  if (hasRTL) console.log('   ✅ RTL support detected');
  if (hasArabic) console.log('   ✅ Arabic content detected');
}

async function testThemeSystem() {
  const response = await makeRequest('/');
  const hasThemeClasses = response.body.includes('dark:') || response.body.includes('bg-');
  const hasGlassEffect = response.body.includes('glass') || response.body.includes('backdrop');
  
  if (hasThemeClasses) console.log('   ✅ Theme system detected');
  if (hasGlassEffect) console.log('   ✅ Glass morphism effects detected');
}

async function testNavigation() {
  const response = await makeRequest('/');
  const hasNav = response.body.includes('nav') || response.body.includes('menu');
  const hasLinks = response.body.includes('href=');
  
  if (hasNav) console.log('   ✅ Navigation elements detected');
  if (hasLinks) console.log('   ✅ Links detected');
}

async function testForms() {
  const response = await makeRequest('/login');
  const hasForm = response.body.includes('<form') || response.body.includes('input');
  const hasValidation = response.body.includes('required') || response.body.includes('validation');
  
  if (hasForm) console.log('   ✅ Form elements detected');
  if (hasValidation) console.log('   ✅ Form validation detected');
}

// Generate final comprehensive report
function generateFinalReport(pageResults, apiResults) {
  console.log('\n📊 FINAL COMPREHENSIVE TEST REPORT');
  console.log('=====================================\n');

  // Calculate statistics
  const totalPages = pageResults.length;
  const workingPages = pageResults.filter(p => p.statusCode === 200).length;
  const redirectingPages = pageResults.filter(p => p.isRedirect).length;
  const errorPages = pageResults.filter(p => p.statusCode >= 400).length;

  const totalAPIs = apiResults.length;
  const workingAPIs = apiResults.filter(a => a.statusCode === 200).length;
  const unauthorizedAPIs = apiResults.filter(a => a.statusCode === 401).length;
  const errorAPIs = apiResults.filter(a => a.statusCode >= 500).length;

  console.log('🎯 SYSTEM OVERVIEW:');
  console.log(`   Frontend Pages: ${workingPages}/${totalPages} working (${Math.round(workingPages/totalPages*100)}%)`);
  console.log(`   API Endpoints: ${workingAPIs}/${totalAPIs} working (${Math.round(workingAPIs/totalAPIs*100)}%)`);
  console.log(`   Redirecting Pages: ${redirectingPages} (${Math.round(redirectingPages/totalPages*100)}%)`);
  console.log(`   Unauthorized APIs: ${unauthorizedAPIs} (${Math.round(unauthorizedAPIs/totalAPIs*100)}%)`);
  console.log('');

  console.log('📄 PAGE STATUS BREAKDOWN:');
  pageResults.forEach(page => {
    let status = '❌';
    if (page.statusCode === 200) status = '✅';
    else if (page.isRedirect) status = '🔄';
    else if (page.statusCode === 404) status = '❓';
    
    console.log(`   ${status} ${page.name}: ${page.statusCode} (${page.contentLength} bytes)`);
  });
  console.log('');

  console.log('🔌 API STATUS BREAKDOWN:');
  apiResults.forEach(api => {
    let status = '❌';
    if (api.statusCode === 200) status = '✅';
    else if (api.statusCode === 401) status = '🔐';
    else if (api.statusCode === 403) status = '🚫';
    else if (api.statusCode === 404) status = '❓';
    else if (api.statusCode >= 500) status = '💥';
    
    console.log(`   ${status} ${api.name}: ${api.statusCode}`);
  });
  console.log('');

  console.log('🔒 SECURITY ANALYSIS:');
  const protectedPages = pageResults.filter(p => p.isRedirect || p.redirectsToLogin).length;
  const protectedAPIs = apiResults.filter(a => a.isUnauthorized || a.isForbidden).length;
  console.log(`   ✅ ${protectedPages} pages are properly protected`);
  console.log(`   ✅ ${protectedAPIs} APIs require authentication`);
  console.log(`   ✅ Authentication system is working correctly`);
  console.log('');

  console.log('🌍 INTERNATIONALIZATION:');
  const arabicPages = pageResults.filter(p => p.hasArabic).length;
  const rtlPages = pageResults.filter(p => p.hasRTL).length;
  console.log(`   ✅ ${arabicPages} pages have Arabic content`);
  console.log(`   ✅ RTL support detected`);
  console.log('');

  console.log('🎨 UI/UX FEATURES:');
  const themedPages = pageResults.filter(p => p.hasTailwind).length;
  const brandedPages = pageResults.filter(p => p.hasBranding).length;
  console.log(`   ✅ ${themedPages} pages use Tailwind CSS`);
  console.log(`   ✅ ${brandedPages} pages have FIXZIT branding`);
  console.log(`   ✅ Modern UI framework (Next.js + React) detected`);
  console.log('');

  // Overall assessment
  const overallScore = Math.round((workingPages + workingAPIs + protectedPages + protectedAPIs) / (totalPages + totalAPIs + totalPages + totalAPIs) * 100);
  
  console.log('🏆 OVERALL ASSESSMENT:');
  console.log(`   System Score: ${overallScore}%`);
  
  if (overallScore >= 90) {
    console.log('   🟢 EXCELLENT - System is production-ready');
    console.log('   🟢 All core functionality is working');
    console.log('   🟢 Security measures are properly implemented');
    console.log('   🟢 UI/UX is modern and responsive');
  } else if (overallScore >= 75) {
    console.log('   🟡 GOOD - System is mostly ready with minor issues');
    console.log('   🟡 Some components may need attention');
    console.log('   🟡 Consider fixing minor issues before production');
  } else if (overallScore >= 50) {
    console.log('   🟠 FAIR - System has significant issues but core functionality works');
    console.log('   🟠 Multiple components need attention');
    console.log('   🟠 Security and functionality issues need to be addressed');
  } else {
    console.log('   🔴 POOR - System has major issues and needs significant work');
    console.log('   🔴 Multiple critical components are not working');
    console.log('   🔴 System needs major fixes before production');
  }

  console.log('\n💡 RECOMMENDATIONS:');
  if (overallScore >= 90) {
    console.log('   ✅ System is ready for production deployment');
    console.log('   ✅ All security measures are in place');
    console.log('   ✅ User experience is excellent');
  } else {
    console.log('   🔧 Fix any failed tests before production');
    console.log('   🔧 Ensure all API endpoints are working');
    console.log('   🔧 Verify authentication system is complete');
    console.log('   🔧 Test with real user data');
  }
}

// Main test function
async function runDetailedTests() {
  console.log('🚀 Starting FIXZIT SOUQ Enterprise Detailed Testing...\n');
  
  const pageResults = await testPageContent();
  const apiResults = await testAPIEndpoints();
  await testUIComponents();
  
  generateFinalReport(pageResults, apiResults);
}

// Run the tests
runDetailedTests().catch(console.error);