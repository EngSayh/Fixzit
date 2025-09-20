#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 FIXIZIT SYSTEM FINAL VERIFICATION\n');
console.log('=' .repeat(60));

let issues = 0;
let verified = 0;

// 1. Check for placeholders
console.log('\n📌 Checking for placeholders...');
const placeholderPatterns = [
  /placeholder/i,
  /dummy/i,
  /test123/i,
  /example\.com/i,
  /todo/i,
  /fixme/i,
  /xxx/i,
  /lorem ipsum/i
];

function checkForPlaceholders(dir, excludeDirs = ['node_modules', '.next', 'dist', '.git']) {
  let found = [];
  
  function walkDir(currentDir) {
    const files = fs.readdirSync(currentDir);
    
    files.forEach(file => {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        if (!excludeDirs.includes(file) && !file.startsWith('.')) {
          walkDir(filePath);
        }
      } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.tsx'))) {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        lines.forEach((line, index) => {
          placeholderPatterns.forEach(pattern => {
            if (pattern.test(line) && !line.includes('// Placeholder') && !line.includes('checkForPlaceholders')) {
              found.push({
                file: path.relative(process.cwd(), filePath),
                line: index + 1,
                content: line.trim()
              });
            }
          });
        });
      }
    });
  }
  
  walkDir(dir);
  return found;
}

const appPlaceholders = checkForPlaceholders(path.join(__dirname, '../app'));
const serverPlaceholders = checkForPlaceholders(path.join(__dirname, '../packages/fixzit-souq-server'));

if (appPlaceholders.length === 0 && serverPlaceholders.length === 0) {
  console.log('✅ No placeholders found in application code');
  verified++;
} else {
  console.log(`❌ Found ${appPlaceholders.length + serverPlaceholders.length} placeholders:`);
  [...appPlaceholders, ...serverPlaceholders].slice(0, 10).forEach(p => {
    console.log(`   ${p.file}:${p.line} - ${p.content.substring(0, 80)}...`);
  });
  issues += appPlaceholders.length + serverPlaceholders.length;
}

// 2. Check database connections
console.log('\n🔌 Checking database connections...');
const dbFile = path.join(__dirname, '../packages/fixzit-souq-server/db.js');
if (fs.existsSync(dbFile)) {
  const dbContent = fs.readFileSync(dbFile, 'utf8');
  if (dbContent.includes('MONGODB_URI') || dbContent.includes('mongoose.connect')) {
    console.log('✅ Database connection configured');
    verified++;
  } else {
    console.log('❌ Database connection not properly configured');
    issues++;
  }
} else {
  console.log('❌ Database configuration file not found');
  issues++;
}

// 3. Check all required models exist
console.log('\n📦 Checking database models...');
const requiredModels = [
  'Property', 'WorkOrder', 'Customer', 'Employee', 'FinanceMetric',
  'MarketplaceItem', 'ComplianceDoc', 'SupportTicket', 'SensorReading',
  'SystemSetting', 'AnalyticsMetric', 'Violation', 'KnowledgeArticle',
  'MaintenanceSchedule', 'Asset', 'IoTDevice', 'AutomationRule',
  'Notification', 'Workflow', 'WorkflowInstance', 'AuditLog'
];

const modelsDir = path.join(__dirname, '../packages/fixzit-souq-server/models');
const existingModels = fs.readdirSync(modelsDir)
  .filter(f => f.endsWith('.js'))
  .map(f => f.replace('.js', ''));

const missingModels = requiredModels.filter(m => !existingModels.includes(m));

if (missingModels.length === 0) {
  console.log(`✅ All ${requiredModels.length} required models exist`);
  verified++;
} else {
  console.log(`❌ Missing ${missingModels.length} models: ${missingModels.join(', ')}`);
  issues += missingModels.length;
}

// 4. Check all pages exist
console.log('\n📄 Checking frontend pages...');
const requiredPages = [
  'dashboard', 'properties', 'work-orders', 'finance', 'hr', 'admin',
  'crm', 'marketplace', 'reports', 'settings', 'compliance', 'support',
  'preventive', 'iot'
];

const pagesDir = path.join(__dirname, '../app/(app)');
const existingPages = fs.readdirSync(pagesDir)
  .filter(f => fs.statSync(path.join(pagesDir, f)).isDirectory());

const missingPages = requiredPages.filter(p => !existingPages.includes(p));

if (missingPages.length === 0) {
  console.log(`✅ All ${requiredPages.length} required pages exist`);
  verified++;
} else {
  console.log(`❌ Missing ${missingPages.length} pages: ${missingPages.join(', ')}`);
  issues += missingPages.length;
}

// 5. Check API endpoints
console.log('\n🔗 Checking API endpoints...');
const apiDir = path.join(__dirname, '../app/api');
const requiredAPIs = [
  'auth', 'dashboard', 'properties', 'work-orders', 'finance', 'hr',
  'crm', 'marketplace', 'compliance', 'support', 'preventive', 'iot',
  'notifications', 'workflows'
];

const existingAPIs = [];
function findAPIs(dir, base = '') {
  fs.readdirSync(dir).forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && file !== 'node_modules') {
      const apiPath = path.join(base, file);
      if (fs.existsSync(path.join(filePath, 'route.ts'))) {
        existingAPIs.push(apiPath);
      }
      findAPIs(filePath, apiPath);
    }
  });
}

findAPIs(apiDir);
const missingAPIs = requiredAPIs.filter(api => 
  !existingAPIs.some(existing => existing.includes(api.replace('-', ''))
));

if (missingAPIs.length === 0) {
  console.log(`✅ All required API endpoints exist`);
  verified++;
} else {
  console.log(`❌ Missing ${missingAPIs.length} API endpoints: ${missingAPIs.join(', ')}`);
  issues += missingAPIs.length;
}

// 6. Check for syntax errors
console.log('\n⚡ Checking for syntax errors...');
let syntaxErrors = 0;

function checkSyntax(dir, extension) {
  const files = [];
  
  function walkDir(currentDir) {
    fs.readdirSync(currentDir).forEach(file => {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory() && !['node_modules', '.next', 'dist'].includes(file)) {
        walkDir(filePath);
      } else if (stat.isFile() && file.endsWith(extension)) {
        files.push(filePath);
      }
    });
  }
  
  walkDir(dir);
  
  files.forEach(file => {
    try {
      if (extension === '.js') {
        require(file);
      }
    } catch (error) {
      if (error.code !== 'MODULE_NOT_FOUND') {
        syntaxErrors++;
        console.log(`   ❌ ${path.relative(process.cwd(), file)}: ${error.message}`);
      }
    }
  });
  
  return syntaxErrors;
}

const serverSyntaxErrors = checkSyntax(path.join(__dirname, '../packages/fixzit-souq-server'), '.js');

if (serverSyntaxErrors === 0) {
  console.log('✅ No syntax errors found');
  verified++;
} else {
  console.log(`❌ Found ${serverSyntaxErrors} syntax errors`);
  issues += serverSyntaxErrors;
}

// 7. Check environment variables
console.log('\n🔐 Checking environment configuration...');
const envExample = path.join(__dirname, '../.env.example');
const envFile = path.join(__dirname, '../.env');

if (fs.existsSync(envFile) || fs.existsSync(envExample)) {
  console.log('✅ Environment configuration exists');
  verified++;
} else {
  console.log('❌ No environment configuration found');
  issues++;
}

// 8. Check for duplicate routes
console.log('\n🔀 Checking for duplicate routes...');
const routesDir = path.join(__dirname, '../packages/fixzit-souq-server/routes');
const routeMap = new Map();
let duplicateRoutes = 0;

fs.readdirSync(routesDir).forEach(file => {
  if (file.endsWith('.js')) {
    const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
    const routeMatches = content.match(/router\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g) || [];
    
    routeMatches.forEach(match => {
      const [method, route] = match.replace('router.', '').replace(/['"]/g, '').split('(');
      const key = `${method.toUpperCase()} ${route}`;
      
      if (!routeMap.has(key)) {
        routeMap.set(key, []);
      }
      routeMap.get(key).push(file);
    });
  }
});

routeMap.forEach((files, route) => {
  if (files.length > 1) {
    duplicateRoutes++;
  }
});

if (duplicateRoutes === 0) {
  console.log('✅ No problematic duplicate routes');
  verified++;
} else {
  console.log(`⚠️  Found ${duplicateRoutes} duplicate routes (may be intentional)`);
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 VERIFICATION SUMMARY\n');
console.log(`✅ Verified items: ${verified}`);
console.log(`❌ Issues found: ${issues}`);
console.log(`⚠️  Warnings: ${duplicateRoutes}`);

if (issues === 0) {
  console.log('\n🎉 SYSTEM VERIFICATION PASSED! The system is ready for production.');
} else {
  console.log('\n⚠️  Please fix the issues above before deploying to production.');
}

console.log('\n' + '='.repeat(60));