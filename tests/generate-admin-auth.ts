#!/usr/bin/env tsx

/**
 * Simple authentication state generator for E2E tests
 * Creates only the admin auth state to avoid rate limiting
 */

import { chromium } from '@playwright/test';
import { mkdir } from 'fs/promises';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.test
config({ path: resolve(__dirname, '../.env.test') });

async function generateAuthState() {
  console.log('\n🔐 Generating admin authentication state...\n');

  const baseURL = 'http://localhost:3000';
  const phone = process.env.TEST_ADMIN_PHONE || '+966500000001';

  // Ensure state directory exists
  await mkdir('tests/state', { recursive: true });

  const browser = await chromium.launch({ headless: true });
  
  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log(`📱 Sending OTP...`);

    // Step 1: Send OTP (using identifier + password, not phone)
    const otpResponse = await page.request.post(`${baseURL}/api/auth/otp/send`, {
      data: { 
        identifier: 'admin@test.fixzit.co',
        password: 'Test@1234'
      }
    });

    if (!otpResponse.ok()) {
      const errorText = await otpResponse.text();
      throw new Error(`Failed to send OTP (${otpResponse.status()}): ${errorText}`);
    }

    const otpData = await otpResponse.json();
    const otpCode = otpData.data?.devCode || otpData.otp || otpData.code;

    if (!otpCode) {
      console.error('Response:', otpData);
      throw new Error('OTP code not in response (check if NODE_ENV allows test mode)');
    }

    console.log('✅ OTP received');

    // Step 2: Verify OTP to get otpToken
    console.log('🔑 Verifying OTP...');
    const verifyResponse = await page.request.post(`${baseURL}/api/auth/otp/verify`, {
      data: {
        identifier: 'admin@test.fixzit.co',
        otp: otpCode
      }
    });

    if (!verifyResponse.ok()) {
      const errorText = await verifyResponse.text();
      throw new Error(`Failed to verify OTP (${verifyResponse.status()}): ${errorText}`);
    }

    const verifyData = await verifyResponse.json();
    const otpToken = verifyData.data?.otpToken;

    if (!otpToken) {
      throw new Error('OTP token not returned from verify endpoint');
    }

    console.log('✅ OTP verified');

    // Step 3: Get CSRF token
    console.log('🔐 Getting CSRF token...');
    await page.goto(`${baseURL}/api/auth/csrf`);
    const csrfText = await page.textContent('body');
    const csrfToken = JSON.parse(csrfText!).csrfToken;
    console.log('✅ CSRF token retrieved');

    // Step 4: Create NextAuth session
    console.log('🔑 Creating NextAuth session...');
    const sessionResponse = await page.request.post(`${baseURL}/api/auth/callback/credentials`, {
      data: {
        otpToken,
        csrfToken,
        json: true
      }
    });

    if (!sessionResponse.ok()) {
      const errorText = await sessionResponse.text();
      throw new Error(`Failed to create session (${sessionResponse.status()}): ${errorText}`);
    }

    console.log('✅ Session created');

    // Step 5: Navigate to dashboard to ensure cookies are set
    console.log('🏠 Loading dashboard...');
    await page.goto(`${baseURL}/dashboard`, { waitUntil: 'load', timeout: 30000 }).catch(err => {
      console.warn('⚠️  Dashboard load timeout (expected with Turbopack), continuing...');
    });
    await page.waitForTimeout(3000);

    // Verify authentication
    const cookies = await context.cookies();
    const authCookie = cookies.find(c => 
      c.name.includes('session') || 
      c.name.includes('next-auth') ||
      c.name === 'authjs.session-token'
    );

    if (!authCookie) {
      console.warn('⚠️  Warning: No auth cookie found, authentication may have failed');
      console.log('Cookies:', cookies.map(c => c.name).join(', '));
    } else {
      console.log(`✅ Auth cookie found: ${authCookie.name}`);
    }

    // Step 6: Save state
    const statePath = 'tests/state/admin.json';
    await context.storageState({ path: statePath });
    console.log(`✅ Saved auth state to ${statePath}`);

    await context.close();

  } catch (error) {
    console.error('\n❌ Failed to generate auth state:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('\n✅ Authentication state generated successfully!\n');
}

// Run
generateAuthState()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
