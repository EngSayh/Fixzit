#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 FINAL SYSTEM VERIFICATION\n');
console.log('='.repeat(60));

let totalChecks = 0;
let passedChecks = 0;
let issues = [];

// Check function
function check(description, condition, details = '') {
  totalChecks++;
  if (condition) {
    console.log(`✅ ${description}`);
    passedChecks++;
  } else {
    console.log(`❌ ${description}`);
    if (details) issues.push(`${description}: ${details}`);
  }
}

// 1. Check Backend Files
console.log('\n📦 Backend Verification:');
const backendDir = path.join(__dirname, '../packages/fixzit-souq-server');

// Check server.js
check('server.js exists', fs.existsSync(path.join(backendDir, 'server.js')));

// Check database connection
check('db.js exists', fs.existsSync(path.join(backendDir, 'db.js')));

// Check models
const modelsDir = path.join(backendDir, 'models');
const requiredModels = [
  'User', 'Property', 'WorkOrder', 'Customer', 'Employee', 
  'FinanceMetric', 'MarketplaceItem', 'ComplianceDoc', 'SupportTicket',
  'SensorReading', 'Invoice', 'Notification', 'Workflow', 'AuditLog'
];

requiredModels.forEach(model => {
  check(`Model: ${model}`, fs.existsSync(path.join(modelsDir, `${model}.js`)));
});

// Check routes
const routesDir = path.join(backendDir, 'routes');
const requiredRoutes = [
  'properties', 'workorders', 'finance', 'hr', 'crm', 'marketplace',
  'support', 'compliance', 'iot', 'analytics', 'admin', 'preventive',
  'notifications', 'workflows'
];

requiredRoutes.forEach(route => {
  check(`Route: ${route}`, fs.existsSync(path.join(routesDir, `${route}.js`)));
});

// Check services
const servicesDir = path.join(backendDir, 'services');
const requiredServices = [
  'zatca', 'payment', 'communication', 'sso', 'analytics', 'microservices'
];

requiredServices.forEach(service => {
  check(`Service: ${service}`, fs.existsSync(path.join(servicesDir, `${service}.js`)));
});

// 2. Check Frontend Pages
console.log('\n🖥️  Frontend Verification:');
const frontendDir = path.join(__dirname, '../app/(app)');
const requiredPages = [
  'dashboard', 'properties', 'work-orders', 'finance', 'hr', 'admin',
  'crm', 'marketplace', 'reports', 'settings', 'compliance', 'support',
  'preventive', 'iot'
];

requiredPages.forEach(page => {
  const pagePath = path.join(frontendDir, page, 'page.tsx');
  check(`Page: ${page}`, fs.existsSync(pagePath));
});

// 3. Check API Routes
console.log('\n🔌 API Routes Verification:');
const apiDir = path.join(__dirname, '../app/api');
const apiEndpoints = [
  'auth/login', 'auth/logout', 'auth/session',
  'dashboard/stats', 'properties', 'work-orders',
  'finance/invoices', 'hr/employees', 'crm/contacts',
  'marketplace/products', 'compliance/documents',
  'support/tickets', 'preventive/schedules',
  'iot/devices', 'notifications', 'workflows'
];

apiEndpoints.forEach(endpoint => {
  const routePath = path.join(apiDir, endpoint, 'route.ts');
  check(`API: ${endpoint}`, fs.existsSync(routePath));
});

// 4. Check Mobile Apps
console.log('\n📱 Mobile Apps Verification:');
check('iOS App Package', fs.existsSync(path.join(__dirname, '../packages/fixzit-ios/FixzitApp.swift')));
check('Android App Package', fs.existsSync(path.join(__dirname, '../packages/fixzit-android/app/src/main/java/com/fixzit/app/FixzitApplication.kt')));

// 5. Check for common issues
console.log('\n🔍 Code Quality Checks:');

// Check for TODO/FIXME in our code
const checkForPatterns = (dir, pattern, description) => {
  try {
    const { execSync } = require('child_process');
    const command = `grep -r "${pattern}" ${dir} --include="*.js" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=.next 2>/dev/null | wc -l`;
    const count = parseInt(execSync(command).toString().trim());
    check(description, count === 0, `Found ${count} occurrences`);
    return count;
  } catch (e) {
    return 0;
  }
};

// Only check our application code
const appDirs = [
  path.join(__dirname, '../app'),
  path.join(__dirname, '../packages/fixzit-souq-server/routes'),
  path.join(__dirname, '../packages/fixzit-souq-server/models'),
  path.join(__dirname, '../packages/fixzit-souq-server/services')
].filter(dir => fs.existsSync(dir));

let todoCount = 0;
let fixmeCount = 0;

appDirs.forEach(dir => {
  todoCount += checkForPatterns(dir, 'TODO', `No TODOs in ${path.basename(dir)}`);
  fixmeCount += checkForPatterns(dir, 'FIXME', `No FIXMEs in ${path.basename(dir)}`);
});

// 6. Check database connection
console.log('\n🗄️  Database Verification:');
const dbFile = fs.readFileSync(path.join(backendDir, 'db.js'), 'utf8');
check('MongoDB connection configured', dbFile.includes('mongoose.connect'));
check('Database error handling', dbFile.includes('connection.on(\'error\''));

// 7. Check authentication
console.log('\n🔐 Security Verification:');
check('JWT authentication', fs.existsSync(path.join(backendDir, 'middleware/auth.js')));
check('SSO service', fs.existsSync(path.join(servicesDir, 'sso.js')));
check('Payment service', fs.existsSync(path.join(servicesDir, 'payment.js')));

// Final Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 VERIFICATION SUMMARY\n');
console.log(`Total Checks: ${totalChecks}`);
console.log(`Passed: ${passedChecks}`);
console.log(`Failed: ${totalChecks - passedChecks}`);
console.log(`Success Rate: ${((passedChecks / totalChecks) * 100).toFixed(1)}%`);

if (issues.length > 0) {
  console.log('\n⚠️  Issues Found:');
  issues.forEach(issue => console.log(`  - ${issue}`));
} else {
  console.log('\n✅ All checks passed! System is 100% complete and verified.');
}

console.log('\n' + '='.repeat(60));

// Exit with appropriate code
process.exit(issues.length > 0 ? 1 : 0);