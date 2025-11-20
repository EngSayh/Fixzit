import { chromium, FullConfig, BrowserContext } from '@playwright/test';
import { mkdir, writeFile } from 'fs/promises';
import { URLSearchParams } from 'url';
import { encode as encodeJwt } from 'next-auth/jwt';
import { randomBytes } from 'crypto';

type RoleConfig = {
  name: string;
  identifierEnv: string;
  passwordEnv: string;
  phoneEnv?: string;
  statePath: string;
};

/**
 * AUTHENTICATION SETUP - OTP FLOW
 * Creates storage states for all user roles using OTP authentication
 * Mirrors the real OTP → verify → credentials callback flow so server-side
 * RBAC hooks and OTP session validation stay intact.
 */
async function globalSetup(config: FullConfig) {
  console.log('\n🔐 Setting up authentication states for all roles (OTP flow)...\n');

  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
  const offlineMode = process.env.ALLOW_OFFLINE_MONGODB === 'true';
  const nextAuthSecret =
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    'playwright-secret';
  const baseOrigin = (() => {
    try {
      return new URL(baseURL).origin;
    } catch {
      return 'http://localhost:3000';
    }
  })();
  const cookieName =
    baseOrigin.startsWith('https')
      ? '__Secure-authjs.session-token'
      : 'authjs.session-token';
  const legacyCookieName =
    baseOrigin.startsWith('https')
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token';
  const sessionSalt = cookieName;
  const offlineOrgId = 'ffffffffffffffffffffffff';

  const roles: RoleConfig[] = [
    {
      name: 'SuperAdmin',
      identifierEnv: 'TEST_SUPERADMIN_IDENTIFIER',
      passwordEnv: 'TEST_SUPERADMIN_PASSWORD',
      phoneEnv: 'TEST_SUPERADMIN_PHONE',
      statePath: 'tests/state/superadmin.json',
    },
    {
      name: 'Admin',
      identifierEnv: 'TEST_ADMIN_IDENTIFIER',
      passwordEnv: 'TEST_ADMIN_PASSWORD',
      phoneEnv: 'TEST_ADMIN_PHONE',
      statePath: 'tests/state/admin.json',
    },
    {
      name: 'Manager',
      identifierEnv: 'TEST_MANAGER_IDENTIFIER',
      passwordEnv: 'TEST_MANAGER_PASSWORD',
      phoneEnv: 'TEST_MANAGER_PHONE',
      statePath: 'tests/state/manager.json',
    },
    {
      name: 'Technician',
      identifierEnv: 'TEST_TECHNICIAN_IDENTIFIER',
      passwordEnv: 'TEST_TECHNICIAN_PASSWORD',
      phoneEnv: 'TEST_TECHNICIAN_PHONE',
      statePath: 'tests/state/technician.json',
    },
    {
      name: 'Tenant',
      identifierEnv: 'TEST_TENANT_IDENTIFIER',
      passwordEnv: 'TEST_TENANT_PASSWORD',
      phoneEnv: 'TEST_TENANT_PHONE',
      statePath: 'tests/state/tenant.json',
    },
    {
      name: 'Vendor',
      identifierEnv: 'TEST_VENDOR_IDENTIFIER',
      passwordEnv: 'TEST_VENDOR_PASSWORD',
      phoneEnv: 'TEST_VENDOR_PHONE',
      statePath: 'tests/state/vendor.json',
    },
  ];

  const missing = roles.flatMap(role => {
    const missingVars: string[] = [];
    if (!process.env[role.identifierEnv]) missingVars.push(role.identifierEnv);
    if (!process.env[role.passwordEnv]) missingVars.push(role.passwordEnv);
    return missingVars;
  });

  if (missing.length > 0) {
    console.error('\n❌ ERROR: Missing required login credentials for test roles:\n');
    missing.forEach(envVar => console.error(`   - ${envVar}`));
    console.error('\nPopulate these values in .env.test or your CI secrets store.');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  await mkdir('tests/state', { recursive: true });
  const browser = await chromium.launch();

  if (offlineMode) {
    console.warn('\n⚠️  Offline mode detected - creating signed NextAuth session cookies for each role.\n');
    for (const role of roles) {
      const context = await browser.newContext();
      try {
        const normalizedRole =
          role.name === 'SuperAdmin'
            ? 'SUPER_ADMIN'
            : role.name.toUpperCase();
        const userId = randomBytes(12).toString('hex');

        const token = await encodeJwt({
          secret: nextAuthSecret,
          maxAge: 30 * 24 * 60 * 60,
          salt: sessionSalt,
          token: {
            name: `${role.name} (Offline)`,
            email:
              process.env[role.identifierEnv] ||
              `${role.name.toLowerCase()}@offline.test`,
            id: userId,
            role: normalizedRole,
            roles: [normalizedRole],
            orgId: offlineOrgId,
            isSuperAdmin: role.name === 'SuperAdmin',
            permissions: [],
            sub: userId,
          },
        });

        const { hostname } = new URL(baseOrigin);
        await context.addCookies([
          {
            name: cookieName,
            value: token,
            domain: hostname,
            path: '/',
            httpOnly: true,
            sameSite: 'Lax',
            secure: baseOrigin.startsWith('https'),
          },
          {
            // Backwards compatibility for old NextAuth cookie name
            name: legacyCookieName,
            value: token,
            domain: hostname,
            path: '/',
            httpOnly: true,
            sameSite: 'Lax',
            secure: baseOrigin.startsWith('https'),
          },
        ]);

        const state = await context.storageState();
        const origins = Array.isArray(state.origins) ? state.origins : [];
        const filteredOrigins = origins.filter(origin => origin.origin !== baseOrigin);
        filteredOrigins.push({
          origin: baseOrigin,
          localStorage: [
            { name: 'fixzit-role', value: normalizedRole.toLowerCase() },
          ],
        });

        state.origins = filteredOrigins;
        await writeFile(role.statePath, JSON.stringify(state, null, 2), 'utf-8');
      } catch (err) {
        console.error(`❌ Failed to create offline session for ${role.name}:`, err);
      } finally {
        await context.close();
      }
    }
    await browser.close();
    console.log('\n✅ Offline auth states ready (signed JWT sessions)\n');
    return;
  }

  for (const role of roles) {
    const context = await browser.newContext();
    try {
      const identifier = process.env[role.identifierEnv]!;
      const password = process.env[role.passwordEnv]!;
      const phone = role.phoneEnv ? process.env[role.phoneEnv] : undefined;
      console.log(`🔑 Authenticating as ${role.name} (${identifier})...`);

      const page = await context.newPage();

      // Step 1: Send OTP (credentials provider requires identifier + password)
      const otpResponse = await page.request.post(`${baseURL}/api/auth/otp/send`, {
        headers: { 'Content-Type': 'application/json' },
        data: { identifier, password },
      });

      if (!otpResponse.ok()) {
        const body = await otpResponse.text();
        throw new Error(`Failed to send OTP (${otpResponse.status()}): ${body}`);
      }

      const otpPayload = await otpResponse.json();
      const otpCode =
        otpPayload?.data?.devCode ??
        otpPayload?.data?.otp ??
        otpPayload?.otp ??
        otpPayload?.code;

      if (!otpCode) {
        throw new Error('OTP code not returned from /otp/send (enable SMS dev mode)');
      }

      console.log(`  📱 OTP sent (dev code ${otpCode})${phone ? ` to ${phone}` : ''}`);

      // Step 2: Verify OTP to receive otpToken
      const verifyResponse = await page.request.post(`${baseURL}/api/auth/otp/verify`, {
        headers: { 'Content-Type': 'application/json' },
        data: { identifier, otp: otpCode },
      });

      if (!verifyResponse.ok()) {
        const body = await verifyResponse.text();
        throw new Error(`Failed to verify OTP (${verifyResponse.status()}): ${body}`);
      }

      const verifyPayload = await verifyResponse.json();
      const otpToken = verifyPayload?.data?.otpToken;
      if (!otpToken) {
        throw new Error('OTP verification succeeded but otpToken missing from response');
      }

      // Step 3: Obtain CSRF token (NextAuth requires the CSRF cookie + token)
      const csrfResponse = await page.goto(`${baseURL}/api/auth/csrf`);
      const csrfText = await csrfResponse?.text();
      const csrfToken = csrfText ? JSON.parse(csrfText).csrfToken : undefined;

      if (!csrfToken) {
        throw new Error('Failed to retrieve CSRF token');
      }

      // Step 4: Create a NextAuth session through the credentials callback
      const form = new URLSearchParams({
        identifier,
        password,
        otpToken,
        csrfToken,
        rememberMe: 'on',
        redirect: 'false',
        callbackUrl: `${baseURL}/dashboard`,
        json: 'true',
      });

      const sessionResponse = await page.request.post(`${baseURL}/api/auth/callback/credentials`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: form.toString(),
      });

      if (!sessionResponse.ok()) {
        const body = await sessionResponse.text();
        throw new Error(`Failed to create session (${sessionResponse.status()}): ${body}`);
      }

      // Step 5: Load dashboard to ensure cookies + session storage are populated
      await page.goto(`${baseURL}/dashboard`, { waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout(2000);

      await ensureSessionCookie(context, baseURL);

      await context.storageState({ path: role.statePath });
      console.log(`✅ ${role.name} authenticated successfully`);
    } catch (error) {
      console.error(`❌ Failed to authenticate ${role.name}:`, error);
    } finally {
      await context.close().catch(() => {});
    }
  }

  await browser.close();
  console.log('\n✅ Authentication setup complete\n');
}

export default globalSetup;
const SESSION_COOKIE_PATTERNS = ['session', 'next-auth'];

async function ensureSessionCookie(context: BrowserContext, baseURL: string, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const cookies = await context.cookies(baseURL);
    const hasSession = cookies.some((cookie) =>
      SESSION_COOKIE_PATTERNS.some((pattern) => cookie.name.includes(pattern))
    );
    if (hasSession) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Auth session cookie was not detected before timeout');
}
