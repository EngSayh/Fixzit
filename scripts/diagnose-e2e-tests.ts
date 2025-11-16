#!/usr/bin/env tsx
/**
 * E2E Test Diagnostic Script
 * 
 * Diagnoses common E2E test failures:
 * - Server startup issues
 * - Environment configuration
 * - Database connectivity
 * - Test user seeding
 * 
 * Usage:
 *   tsx scripts/diagnose-e2e-tests.ts
 *   tsx scripts/diagnose-e2e-tests.ts --fix
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { spawn } from 'child_process';

const FIX_MODE = process.argv.includes('--fix');

interface DiagnosticResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  fix?: () => Promise<void>;
}

const results: DiagnosticResult[] = [];

function log(message: string, level: 'INFO' | 'SUCCESS' | 'ERROR' | 'WARN' = 'INFO') {
  const colors = {
    INFO: '\x1b[36m',
    SUCCESS: '\x1b[32m',
    ERROR: '\x1b[31m',
    WARN: '\x1b[33m',
  };
  const reset = '\x1b[0m';
  console.log(`${colors[level]}[${level}]${reset} ${message}`);
}

async function checkEnvironmentFile() {
  log('Checking environment configuration...', 'INFO');
  
  // Check .env.test exists
  if (!existsSync('.env.test')) {
    results.push({
      name: 'Environment File',
      status: 'FAIL',
      message: '.env.test file not found',
      fix: async () => {
        log('Creating .env.test from .env.test.example...', 'INFO');
        try {
          const template = await readFile('.env.test', 'utf-8');
          await writeFile('.env.test', template);
          log('.env.test created successfully', 'SUCCESS');
        } catch (error) {
          throw new Error('Failed to create .env.test: ' + error);
        }
      }
    });
    return;
  }

  // Check required variables
  const envContent = await readFile('.env.test', 'utf-8');
  const requiredVars = [
    'TEST_SUPERADMIN_EMAIL',
    'TEST_ADMIN_EMAIL',
    'TEST_MANAGER_EMAIL',
    'TEST_TECHNICIAN_EMAIL',
    'TEST_TENANT_EMAIL',
    'TEST_VENDOR_EMAIL',
  ];

  const missingVars = requiredVars.filter(varName => 
    !envContent.includes(`${varName}=`) || envContent.match(new RegExp(`${varName}=\\s*$`, 'm'))
  );

  if (missingVars.length > 0) {
    results.push({
      name: 'Environment Variables',
      status: 'FAIL',
      message: `Missing required variables: ${missingVars.join(', ')}`,
    });
  } else {
    results.push({
      name: 'Environment Variables',
      status: 'PASS',
      message: 'All required test environment variables are configured',
    });
  }
}

async function checkDatabaseConnection() {
  log('Checking database connectivity...', 'INFO');
  
  try {
    const { getDatabase } = await import('../lib/mongodb-unified');
    const db = await getDatabase();
    
    // Try to ping the database
    await db.admin().ping();
    
    results.push({
      name: 'Database Connection',
      status: 'PASS',
      message: 'MongoDB connection successful',
    });
  } catch (error) {
    results.push({
      name: 'Database Connection',
      status: 'FAIL',
      message: `Failed to connect to MongoDB: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function checkTestUsersSeeded() {
  log('Checking if test users are seeded...', 'INFO');
  
  try {
    const { getDatabase } = await import('../lib/mongodb-unified');
    const db = await getDatabase();
    
    const users = await db.collection('users').find({
      email: { $regex: '@test\\.fixzit\\.co$' }
    }).toArray();
    
    const requiredRoles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TECHNICIAN', 'TENANT', 'VENDOR'];
    const existingRoles = users.map(u => u.role || (u as any).professional?.role);
    const missingRoles = requiredRoles.filter(role => !existingRoles.includes(role));
    
    if (missingRoles.length > 0) {
      results.push({
        name: 'Test Users Seeded',
        status: 'FAIL',
        message: `Missing test users for roles: ${missingRoles.join(', ')}`,
        fix: async () => {
          log('Running test user seeding script...', 'INFO');
          await runCommand('pnpm', ['exec', 'tsx', 'scripts/seed-test-users.ts']);
        }
      });
    } else {
      results.push({
        name: 'Test Users Seeded',
        status: 'PASS',
        message: `All ${users.length} test users are seeded`,
      });
    }
  } catch (error) {
    results.push({
      name: 'Test Users Seeded',
      status: 'WARN',
      message: `Could not verify test users: ${error instanceof Error ? error.message : String(error)}`,
    });
  }
}

async function checkPlaywrightInstalled() {
  log('Checking Playwright installation...', 'INFO');
  
  const playwrightDir = 'node_modules/@playwright/test';
  
  if (!existsSync(playwrightDir)) {
    results.push({
      name: 'Playwright Installation',
      status: 'FAIL',
      message: 'Playwright not installed',
      fix: async () => {
        log('Installing Playwright...', 'INFO');
        await runCommand('pnpm', ['add', '-D', '@playwright/test']);
        await runCommand('pnpx', ['playwright', 'install']);
      }
    });
    return;
  }
  
  // Check if browsers are installed
  const browsersDir = existsSync(process.env.HOME + '/.cache/ms-playwright') ||
                       existsSync(process.env.HOME + '/Library/Caches/ms-playwright');
  
  if (!browsersDir) {
    results.push({
      name: 'Playwright Browsers',
      status: 'FAIL',
      message: 'Playwright browsers not installed',
      fix: async () => {
        log('Installing Playwright browsers...', 'INFO');
        await runCommand('pnpx', ['playwright', 'install']);
      }
    });
  } else {
    results.push({
      name: 'Playwright Installation',
      status: 'PASS',
      message: 'Playwright and browsers are installed',
    });
  }
}

async function checkAuthStateFiles() {
  log('Checking authentication state files...', 'INFO');
  
  const stateDir = 'tests/state';
  const requiredStates = [
    'superadmin.json',
    'admin.json',
    'manager.json',
    'technician.json',
    'tenant.json',
    'vendor.json',
  ];
  
  const missingStates = requiredStates.filter(state => !existsSync(`${stateDir}/${state}`));
  
  if (missingStates.length > 0) {
    results.push({
      name: 'Authentication States',
      status: 'FAIL',
      message: `Missing auth state files: ${missingStates.join(', ')}`,
      fix: async () => {
        log('Creating state directory...', 'INFO');
        await mkdir(stateDir, { recursive: true });
        log('Run: npx playwright test --project=chromium tests/setup-auth.ts', 'INFO');
      }
    });
  } else {
    results.push({
      name: 'Authentication States',
      status: 'PASS',
      message: 'All authentication state files exist',
    });
  }
}

async function checkServerStartup() {
  log('Checking if dev server can start...', 'INFO');
  
  return new Promise<void>((resolve) => {
    const server = spawn('pnpm', ['dev'], {
      env: { ...process.env, PORT: '3001' },
      stdio: 'pipe',
    });

    let output = '';
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        server.kill();
        results.push({
          name: 'Server Startup',
          status: 'FAIL',
          message: 'Server failed to start within 30 seconds',
        });
        resolve();
      }
    }, 30000);

    server.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('Ready') || output.includes('started server')) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          server.kill();
          results.push({
            name: 'Server Startup',
            status: 'PASS',
            message: 'Dev server starts successfully',
          });
          resolve();
        }
      }
    });

    server.stderr.on('data', (data) => {
      const error = data.toString();
      if (error.includes('Error') || error.includes('EADDRINUSE')) {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          server.kill();
          results.push({
            name: 'Server Startup',
            status: 'FAIL',
            message: `Server error: ${error.substring(0, 200)}`,
          });
          resolve();
        }
      }
    });

    server.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        results.push({
          name: 'Server Startup',
          status: 'FAIL',
          message: `Failed to start server: ${error.message}`,
        });
        resolve();
      }
    });
  });
}

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

async function main() {
  console.log('🔍 E2E Test Diagnostics\n');
  if (FIX_MODE) {
    log('Running in FIX mode - will attempt to fix issues', 'WARN');
  }
  console.log('');

  const startTime = Date.now();

  try {
    await checkEnvironmentFile();
    await checkPlaywrightInstalled();
    await checkAuthStateFiles();
    await checkDatabaseConnection();
    await checkTestUsersSeeded();
    // Skip server startup check in CI to save time
    if (!process.env.CI) {
      await checkServerStartup();
    }
  } catch (error) {
    log(`Fatal error: ${error instanceof Error ? error.message : String(error)}`, 'ERROR');
  }

  const duration = Date.now() - startTime;

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('📋 Diagnostic Results');
  console.log('='.repeat(80) + '\n');

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARN').length;

  for (const result of results) {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    const statusColor = result.status === 'PASS' ? '\x1b[32m' : result.status === 'FAIL' ? '\x1b[31m' : '\x1b[33m';
    const reset = '\x1b[0m';
    
    console.log(`${icon} ${result.name}`);
    console.log(`   Status: ${statusColor}${result.status}${reset}`);
    console.log(`   ${result.message}`);
    
    if (FIX_MODE && result.fix && result.status === 'FAIL') {
      log(`   Attempting to fix...`, 'INFO');
      try {
        await result.fix();
        log(`   Fixed successfully`, 'SUCCESS');
      } catch (error) {
        log(`   Fix failed: ${error instanceof Error ? error.message : String(error)}`, 'ERROR');
      }
    }
    console.log('');
  }

  console.log('='.repeat(80));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Warnings: ${warnings}`);
  console.log(`Duration: ${duration}ms (${(duration / 1000).toFixed(2)}s)`);
  console.log('='.repeat(80) + '\n');

  if (failed > 0) {
    log(`❌ ${failed} diagnostic(s) failed`, 'ERROR');
    if (!FIX_MODE) {
      log(`Run with --fix flag to attempt automatic fixes`, 'INFO');
    }
    process.exit(1);
  } else {
    log(`✅ All diagnostics passed!`, 'SUCCESS');
    process.exit(0);
  }
}

main().catch(error => {
  log(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`, 'ERROR');
  process.exit(1);
});
