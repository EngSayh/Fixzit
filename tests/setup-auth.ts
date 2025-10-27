import { chromium, FullConfig } from '@playwright/test';
import { mkdir } from 'fs/promises';

/**
 * AUTHENTICATION SETUP
 * Creates storage states for all user roles before E2E tests run
 * Roles: SuperAdmin, Admin, Manager, Technician, Tenant, Vendor
 */

async function globalSetup(config: FullConfig) {
  console.log('\n🔐 Setting up authentication states for all roles...\n');

  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
  
  // Validate all required environment variables are present (fail fast)
  const requiredEnvVars = [
    'TEST_SUPERADMIN_EMAIL',
    'TEST_SUPERADMIN_PASSWORD',
    'TEST_ADMIN_EMAIL',
    'TEST_ADMIN_PASSWORD',
    'TEST_MANAGER_EMAIL',
    'TEST_MANAGER_PASSWORD',
    'TEST_TECHNICIAN_EMAIL',
    'TEST_TECHNICIAN_PASSWORD',
    'TEST_TENANT_EMAIL',
    'TEST_TENANT_PASSWORD',
    'TEST_VENDOR_EMAIL',
    'TEST_VENDOR_PASSWORD'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('\n❌ ERROR: Missing required test environment variables:\n');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nCreate a .env.test file or set these variables in your CI environment.');
    console.error('See .env.test.example for required format.\n');
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Ensure state directory exists
  await mkdir('tests/state', { recursive: true });

  const browser = await chromium.launch();

  const roles = [
    {
      name: 'SuperAdmin',
      email: process.env.TEST_SUPERADMIN_EMAIL!,
      password: process.env.TEST_SUPERADMIN_PASSWORD!,
      statePath: 'tests/state/superadmin.json'
    },
    {
      name: 'Admin',
      email: process.env.TEST_ADMIN_EMAIL!,
      password: process.env.TEST_ADMIN_PASSWORD!,
      statePath: 'tests/state/admin.json'
    },
    {
      name: 'Manager',
      email: process.env.TEST_MANAGER_EMAIL!,
      password: process.env.TEST_MANAGER_PASSWORD!,
      statePath: 'tests/state/manager.json'
    },
    {
      name: 'Technician',
      email: process.env.TEST_TECHNICIAN_EMAIL!,
      password: process.env.TEST_TECHNICIAN_PASSWORD!,
      statePath: 'tests/state/technician.json'
    },
    {
      name: 'Tenant',
      email: process.env.TEST_TENANT_EMAIL!,
      password: process.env.TEST_TENANT_PASSWORD!,
      statePath: 'tests/state/tenant.json'
    },
    {
      name: 'Vendor',
      email: process.env.TEST_VENDOR_EMAIL!,
      password: process.env.TEST_VENDOR_PASSWORD!,
      statePath: 'tests/state/vendor.json'
    }
  ];

  for (const role of roles) {
    try {
      console.log(`🔑 Authenticating as ${role.name}...`);
      
      const context = await browser.newContext();
      const page = await context.newPage();

      // Navigate to login
      await page.goto(`${baseURL}/login`, { waitUntil: 'networkidle' });

      // Fill login form
      await page.fill('input[name="email"], input[type="email"]', role.email);
      await page.fill('input[name="password"], input[type="password"]', role.password);

      // Submit login
      await page.click('button[type="submit"]');

      // Wait for redirect after successful login
      await page.waitForURL(/\/(dashboard|app|home)/, { timeout: 15000 });

      // Save authenticated state
      await context.storageState({ path: role.statePath });

      console.log(`✅ ${role.name} authenticated successfully`);

      await context.close();
    } catch (error) {
      console.error(`❌ Failed to authenticate ${role.name}:`, error);
      // Continue with other roles even if one fails
    }
  }

  await browser.close();
  
  console.log('\n✅ Authentication setup complete\n');
}

export default globalSetup;
