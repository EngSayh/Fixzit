import { chromium, FullConfig } from '@playwright/test';
import { mkdir } from 'fs/promises';

/**
 * AUTHENTICATION SETUP - OTP FLOW
 * Creates storage states for all user roles using OTP authentication
 * Uses direct API calls to bypass OTP code requirement
 * Roles: SuperAdmin, Admin, Manager, Technician, Tenant, Vendor
 */

async function globalSetup(config: FullConfig) {
  console.log('\n🔐 Setting up authentication states for all roles (OTP flow)...\n');

  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
  
  // Validate all required environment variables are present (fail fast)
  const requiredEnvVars = [
    'TEST_SUPERADMIN_PHONE',
    'TEST_ADMIN_PHONE',
    'TEST_MANAGER_PHONE',
    'TEST_TECHNICIAN_PHONE',
    'TEST_TENANT_PHONE',
    'TEST_VENDOR_PHONE'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error('\n❌ ERROR: Missing required test environment variables:\n');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nCreate a .env.test file or set these variables in your CI environment.');
    console.error('Example: TEST_ADMIN_PHONE=+966500000001\n');
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Ensure state directory exists
  await mkdir('tests/state', { recursive: true });

  const browser = await chromium.launch();

  const roles = [
    {
      name: 'SuperAdmin',
      phone: process.env.TEST_SUPERADMIN_PHONE!,
      statePath: 'tests/state/superadmin.json'
    },
    {
      name: 'Admin',
      phone: process.env.TEST_ADMIN_PHONE!,
      statePath: 'tests/state/admin.json'
    },
    {
      name: 'Manager',
      phone: process.env.TEST_MANAGER_PHONE!,
      statePath: 'tests/state/manager.json'
    },
    {
      name: 'Technician',
      phone: process.env.TEST_TECHNICIAN_PHONE!,
      statePath: 'tests/state/technician.json'
    },
    {
      name: 'Tenant',
      phone: process.env.TEST_TENANT_PHONE!,
      statePath: 'tests/state/tenant.json'
    },
    {
      name: 'Vendor',
      phone: process.env.TEST_VENDOR_PHONE!,
      statePath: 'tests/state/vendor.json'
    }
  ];

  for (const role of roles) {
    try {
      console.log(`🔑 Authenticating as ${role.name} (${role.phone})...`);
      
      const context = await browser.newContext();
      const page = await context.newPage();

      // Step 1: Request OTP via API
      const otpResponse = await page.request.post(`${baseURL}/api/auth/otp/send`, {
        data: { phone: role.phone }
      });

      if (!otpResponse.ok()) {
        throw new Error(`Failed to send OTP: ${otpResponse.status()}`);
      }

      const otpData = await otpResponse.json();
      const otpCode = otpData.otp || otpData.code;
      
      if (!otpCode) {
        throw new Error('OTP code not returned from API (may need test mode enabled)');
      }

      console.log(`  📱 OTP sent: ${otpCode}`);

      // Step 2: Get CSRF token
      await page.goto(`${baseURL}/api/auth/csrf`);
      const csrfData = await page.evaluate(() => document.body.textContent);
      const csrfToken = JSON.parse(csrfData!).csrfToken;

      // Step 3: Verify OTP and create NextAuth session
      const verifyResponse = await page.request.post(`${baseURL}/api/auth/callback/credentials`, {
        data: {
          phone: role.phone,
          otp: otpCode,
          csrfToken,
          json: true
        }
      });

      if (!verifyResponse.ok()) {
        throw new Error(`Failed to verify OTP: ${verifyResponse.status()}`);
      }

      // Step 4: Navigate to dashboard to ensure cookies are set
      await page.goto(`${baseURL}/dashboard`, { waitUntil: 'networkidle' });

      // Wait for authentication to complete
      await page.waitForTimeout(2000);

      // Verify authentication by checking for user session
      const cookies = await context.cookies();
      const hasAuthCookie = cookies.some(c => 
        c.name.includes('session') || 
        c.name.includes('next-auth') ||
        c.name === 'authjs.session-token'
      );

      if (!hasAuthCookie) {
        console.warn(`  ⚠️  No auth cookie found for ${role.name}, may not be fully authenticated`);
      }

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
