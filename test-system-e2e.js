#!/usr/bin/env node

const http = require('http');

async function testEndpoint(path, description) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {

      resolve({ success: true, status: res.statusCode, path });
    });

    req.on('error', (err) => {

      resolve({ success: false, error: err.message, path });
    });

    req.on('timeout', () => {

      req.destroy();
      resolve({ success: false, error: 'Timeout', path });
    });

    req.end();
  });
}

async function runE2ETests() {

  const testRoutes = [
    ['/', 'Homepage'],
    ['/login', 'Login Page'],
    ['/dashboard', 'Dashboard'],
    ['/marketplace', 'Marketplace'],
    ['/aqar', 'Aqar (Real Estate)'],
    ['/fm', 'Facility Management'],
    ['/finance', 'Finance Module'],
    ['/hr', 'HR Module'],
    ['/crm', 'CRM Module'],
    ['/admin', 'Admin (should redirect to /system)'],
    ['/system', 'System Admin'],
    ['/compliance', 'Compliance Module'],
    ['/careers', 'Careers Page'],
    ['/help', 'Help Center'],
    ['/notifications', 'Notifications'],
    ['/api/health', 'Health Check API'],
    ['/api/auth/me', 'Auth API']
  ];

  const results = [];
  
  for (const [path, description] of testRoutes) {
    const result = await testEndpoint(path, description);
    results.push(result);
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const successful = results.filter(r => r.success && r.status < 500).length;
  const total = results.length;}%)`);
  
  if (successful < total) {

    results.filter(r => !r.success || r.status >= 500).forEach(r => {

    });
  }}%`);
  
  return successful / total;
}

runE2ETests().catch(console.error);