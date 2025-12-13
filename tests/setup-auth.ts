import { chromium, FullConfig, BrowserContext } from '@playwright/test';
import { mkdir, writeFile } from 'fs/promises';
import { encode as encodeJwt } from 'next-auth/jwt';
import { randomBytes } from 'crypto';
import type { ObjectId } from 'mongodb';
import fetch from 'node-fetch';
import { isTruthy } from '@/lib/utils/env';
import { buildSessionClaims, resolveOrgId } from './e2e/utils/session-claims';

/**
 * Playwright global auth setup
 * - Prefers real API session minting via /api/auth/test/session
 * - Falls back to minting a JWT directly from MongoDB user data
 * - Keeps offline/test shortcuts for CI flexibility
 */
type RoleConfig = {
  name: string;
  identifierEnv: string;
  passwordEnv: string;
  phoneEnv?: string;
  companyCodeEnv?: string;
  statePath: string;
};

const SESSION_COOKIE_PATTERNS = ['session', 'next-auth'];
const OFFLINE_ORG_ID = resolveOrgId();
const resolvedNextAuthSecret = (() => {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      'NEXTAUTH_SECRET or AUTH_SECRET is required for Playwright auth setup (no insecure fallback).',
    );
  }
  process.env.NEXTAUTH_SECRET = secret;
  process.env.AUTH_SECRET = secret;
  return secret;
})();

async function globalSetup(config: FullConfig) {
  console.log('\n🔐 Setting up authentication states for all roles (OTP flow)...\n');

  const baseURL = config.projects[0].use.baseURL || process.env.BASE_URL || 'http://localhost:3000';
  const normalizedBaseUrl = baseURL.replace(/\/$/, '');
  let offlineMode = isTruthy(process.env.ALLOW_OFFLINE_MONGODB);
  const testModeDirect = process.env.PLAYWRIGHT_TESTS === 'true';
  const nextAuthSecret = resolvedNextAuthSecret;

  // Force-align Auth.js/NextAuth URLs with the Playwright base URL to avoid 401s from origin drift
  const prevAuthUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL;
  if (prevAuthUrl && prevAuthUrl !== normalizedBaseUrl) {
    console.warn(`⚠️  NEXTAUTH_URL/AUTH_URL (${prevAuthUrl}) did not match Playwright baseURL (${normalizedBaseUrl}). Overriding for fixtures.`);
  }
  process.env.NEXTAUTH_URL = normalizedBaseUrl;
  process.env.AUTH_URL = normalizedBaseUrl;
  process.env.BASE_URL = normalizedBaseUrl;
  process.env.PW_WEB_URL = normalizedBaseUrl;

  console.log(`📍 Base URL: ${normalizedBaseUrl}`);
  console.log(`🗄️  Database Mode: ${offlineMode ? 'Offline (Mock Sessions)' : 'Online (Real MongoDB)'}`);
  console.log(`🔑 Using NextAuth Secret: ${nextAuthSecret.substring(0, 10)}...`);

  const baseOrigin = (() => {
    try {
      return new URL(baseURL).origin;
    } catch {
      return 'http://localhost:3000';
    }
  })();
  const cookieName = baseOrigin.startsWith('https') ? '__Secure-authjs.session-token' : 'authjs.session-token';
  const legacyCookieName = baseOrigin.startsWith('https') ? '__Secure-next-auth.session-token' : 'next-auth.session-token';
  const sessionSalt = cookieName;

  const roles: RoleConfig[] = [
    { name: 'SuperAdmin', identifierEnv: 'TEST_SUPERADMIN_IDENTIFIER', passwordEnv: 'TEST_SUPERADMIN_PASSWORD', phoneEnv: 'TEST_SUPERADMIN_PHONE', statePath: 'tests/state/superadmin.json' },
    { name: 'Admin', identifierEnv: 'TEST_ADMIN_IDENTIFIER', passwordEnv: 'TEST_ADMIN_PASSWORD', phoneEnv: 'TEST_ADMIN_PHONE', statePath: 'tests/state/admin.json' },
    { name: 'Manager', identifierEnv: 'TEST_MANAGER_IDENTIFIER', passwordEnv: 'TEST_MANAGER_PASSWORD', phoneEnv: 'TEST_MANAGER_PHONE', statePath: 'tests/state/manager.json' },
    { name: 'Technician', identifierEnv: 'TEST_TECHNICIAN_IDENTIFIER', passwordEnv: 'TEST_TECHNICIAN_PASSWORD', phoneEnv: 'TEST_TECHNICIAN_PHONE', statePath: 'tests/state/technician.json' },
    { name: 'Tenant', identifierEnv: 'TEST_TENANT_IDENTIFIER', passwordEnv: 'TEST_TENANT_PASSWORD', phoneEnv: 'TEST_TENANT_PHONE', statePath: 'tests/state/tenant.json' },
    { name: 'Vendor', identifierEnv: 'TEST_VENDOR_IDENTIFIER', passwordEnv: 'TEST_VENDOR_PASSWORD', phoneEnv: 'TEST_VENDOR_PHONE', statePath: 'tests/state/vendor.json' },
  ];

  const missing = roles.flatMap(role => {
    const missingVars: string[] = [];
    if (!process.env[role.identifierEnv]) missingVars.push(role.identifierEnv);
    if (!process.env[role.passwordEnv]) missingVars.push(role.passwordEnv);
    return missingVars;
  });

  if (missing.length > 0 && !offlineMode) {
    console.warn('\n⚠️  Missing required login credentials; falling back to OFFLINE MODE.\n');
    console.warn('Missing vars:\n' + missing.map(v => `   - ${v}`).join('\n'));
    console.warn('Set ALLOW_OFFLINE_MONGODB=true to silence this warning, or provide credentials in .env.test.');
    offlineMode = true;
  }

  await mkdir('tests/state', { recursive: true });
  const browser = await chromium.launch();

  if (offlineMode) {
    console.warn('\n⚠️  OFFLINE MODE - Creating mock JWT session cookies (for CI/CD without database)\n');
    console.warn('⚠️  These sessions bypass real authentication and should NOT be used in production!\n');

    for (const role of roles) {
      const context = await browser.newContext();
      try {
        const normalizedRole = role.name === 'SuperAdmin' ? 'SUPER_ADMIN' : role.name.toUpperCase();
        const claims = buildSessionClaims({
          role: normalizedRole,
          email: process.env[role.identifierEnv] || `${role.name.toLowerCase()}@offline.test`,
          orgId: OFFLINE_ORG_ID,
          userId: randomBytes(12).toString('hex'),
        });

        const token = await encodeJwt({
          secret: nextAuthSecret,
          maxAge: 30 * 24 * 60 * 60,
          salt: sessionSalt,
          token: claims,
        });

        const { hostname } = new URL(baseOrigin);
        await context.addCookies([
          { name: cookieName, value: token, domain: hostname, path: '/', httpOnly: true, sameSite: 'Lax', secure: baseOrigin.startsWith('https') },
          { name: legacyCookieName, value: token, domain: hostname, path: '/', httpOnly: true, sameSite: 'Lax', secure: baseOrigin.startsWith('https') },
        ]);

        const state = await context.storageState();
        const origins = Array.isArray(state.origins) ? state.origins : [];
        const filteredOrigins = origins.filter(origin => origin.origin !== baseOrigin);
        filteredOrigins.push({ origin: baseOrigin, localStorage: [{ name: 'fixzit-role', value: normalizedRole.toLowerCase() }] });
        state.origins = filteredOrigins;
        await writeFile(role.statePath, JSON.stringify(state, null, 2), 'utf-8');
        console.log(`  ✅ ${role.name} - Offline session created`);
      } catch (err) {
        console.error(`❌ Failed to create offline session for ${role.name}:`, err);
      } finally {
        await context.close();
      }
    }
    await browser.close();
    console.log('\n✅ Offline auth states ready (mock JWT sessions for CI/CD)\n');
    return;
  }

  if (testModeDirect) {
    console.warn('\n⚠️  PLAYWRIGHT_TESTS=true - Creating direct session cookies (bypass OTP) for E2E stability\n');
    for (const role of roles) {
      const context = await browser.newContext();
      try {
        const normalizedRole = role.name === 'SuperAdmin' ? 'SUPER_ADMIN' : role.name.toUpperCase();
        const isSuperAdmin = normalizedRole === 'SUPER_ADMIN';
        const userId = randomBytes(12).toString('hex');

        const token = await encodeJwt({
          secret: nextAuthSecret,
          maxAge: 30 * 24 * 60 * 60,
          salt: sessionSalt,
          token: {
            name: `${role.name} (E2E)`,
            email: process.env[role.identifierEnv] || `${role.name.toLowerCase()}@e2e.test`,
            id: userId,
            role: normalizedRole,
            roles: [normalizedRole],
            orgId: OFFLINE_ORG_ID,
            org_id: OFFLINE_ORG_ID,
            tenantId: OFFLINE_ORG_ID,
            isSuperAdmin,
            sub: userId,
          },
        });

        const { hostname } = new URL(baseOrigin);
        await context.addCookies([
          { name: cookieName, value: token, domain: hostname, path: '/', httpOnly: true, sameSite: 'Lax', secure: baseOrigin.startsWith('https') },
          { name: legacyCookieName, value: token, domain: hostname, path: '/', httpOnly: true, sameSite: 'Lax', secure: baseOrigin.startsWith('https') },
        ]);

        const state = await context.storageState();
        const origins = Array.isArray(state.origins) ? state.origins : [];
        const filteredOrigins = origins.filter(origin => origin.origin !== baseOrigin);
        filteredOrigins.push({ origin: baseOrigin, localStorage: [{ name: 'fixzit-role', value: normalizedRole.toLowerCase() }] });
        state.origins = filteredOrigins;
        await writeFile(role.statePath, JSON.stringify(state, null, 2), 'utf-8');
        console.log(`  ✅ ${role.name} - Direct session created (test mode)`);
      } catch (err) {
        console.error(`❌ Failed to create test session for ${role.name}:`, err);
      } finally {
        await context.close();
      }
    }
    await browser.close();
    console.log('\n✅ Test-mode auth states ready (direct session cookies)\n');
    return;
  }

  console.log('🗄️  PRODUCTION MODE - Authenticating with real MongoDB and OTP flow (short-circuited to session minting)\n');
  // Fail fast if app/DB are not reachable. Allow opt-out via PLAYWRIGHT_SKIP_SERVICE_CHECK for intentional offline runs.
  const skipChecks = process.env.PLAYWRIGHT_SKIP_SERVICE_CHECK === 'true';
  if (!skipChecks) {
    await ensureServices({ baseURL, requireServer: true });
  }
  const mongo = await getMongo();
  if (!skipChecks) {
    await ensureServices({ baseURL, requireServer: true, requireDb: true, mongo });
  }

  for (const role of roles) {
    const context = await browser.newContext();
    try {
      const identifier = process.env[role.identifierEnv]!;
      const normalizedRole = role.name === 'SuperAdmin' ? 'SUPER_ADMIN' : role.name.toUpperCase();
      let sessionToken: string | undefined;
      let appliedOrgId: string | undefined;

      // First try the test/session API to mirror real Auth.js cookie issuance
      try {
        const resp = await context.request.post(`${baseURL}/api/auth/test/session`, {
          headers: { 'Content-Type': 'application/json' },
          data: {
            email: identifier,
            orgId: process.env.PUBLIC_ORG_ID || process.env.DEFAULT_ORG_ID || process.env.TEST_ORG_ID,
          },
          timeout: 20000,
        });
        if (resp.ok()) {
          const json = await resp.json().catch(() => ({}));
          sessionToken = (json as { sessionToken?: string }).sessionToken;
          appliedOrgId = (json as { appliedOrgId?: string }).appliedOrgId;
        } else {
          console.warn(`⚠️  ${role.name} test/session returned ${resp.status()}; falling back to DB minting`);
        }
      } catch (err) {
        console.warn(`⚠️  ${role.name} test/session request failed; falling back to DB minting`, err);
      }

      // Fallback: mint directly from MongoDB user
      if (!sessionToken) {
        const minted = await mintSessionFromDb(identifier, nextAuthSecret, sessionSalt, mongo, {
          fallbackOrgId: process.env.PUBLIC_ORG_ID || process.env.DEFAULT_ORG_ID || process.env.TEST_ORG_ID,
        });
        sessionToken = minted.sessionToken;
        appliedOrgId = minted.orgId;
      }

      if (!sessionToken) {
        throw new Error(`Failed to mint session for ${role.name}: missing sessionToken`);
      }

      const { hostname } = new URL(baseOrigin);
      await context.addCookies([
        { name: cookieName, value: sessionToken, domain: hostname, path: '/', httpOnly: true, sameSite: 'Lax', secure: baseOrigin.startsWith('https') },
        { name: legacyCookieName, value: sessionToken, domain: hostname, path: '/', httpOnly: true, sameSite: 'Lax', secure: baseOrigin.startsWith('https') },
      ]);

      await ensureSessionCookie(context, baseURL);

      const state = await context.storageState();
      const origins = Array.isArray(state.origins) ? state.origins : [];
      const filteredOrigins = origins.filter(origin => origin.origin !== baseOrigin);
      filteredOrigins.push({
        origin: baseOrigin,
        localStorage: [
          { name: 'fixzit-role', value: normalizedRole.toLowerCase() },
          ...(appliedOrgId ? [{ name: 'fixzit-org', value: appliedOrgId }] : []),
        ],
      });
      state.origins = filteredOrigins;
      await writeFile(role.statePath, JSON.stringify(state, null, 2), 'utf-8');
      console.log(`✅ ${role.name} - Session prepared (state saved to ${role.statePath})`);
    } catch (error) {
      console.error(`❌ Failed to authenticate ${role.name}:`, error);
    } finally {
      await context.close().catch(() => {});
    }
  }

  await browser.close();
  if (cachedMongo) {
    await cachedMongo.disconnect().catch(() => {});
    cachedMongo = null;
  }
  console.log('\n✅ Authentication setup complete\n');
}

export default globalSetup;

type EnsureServicesOpts = { baseURL: string; requireServer?: boolean; requireDb?: boolean; mongo?: MongoModule };

async function ensureServices(opts: EnsureServicesOpts) {
  const { baseURL, requireServer, requireDb, mongo } = opts;

  if (requireServer) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);
    try {
      const resp = await fetch(baseURL, { method: 'HEAD', signal: controller.signal });
      if (!resp.ok) {
        throw new Error(`Server responded with status ${resp.status} ${resp.statusText}`);
      }
    } catch (err) {
      throw new Error(
        `App server not reachable at ${baseURL}. Start the Next.js server before running e2e. Underlying error: ${String(err)}`
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  if (requireDb) {
    const connectionReady = mongo?.connection?.readyState === 1;
    if (!connectionReady) {
      throw new Error(
        "MongoDB connection is not established. Ensure MONGODB_URI/MONGODB_DB are configured and the database is reachable before running e2e."
      );
    }
  }
}

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

let cachedMongo: MongoModule | null = null;
type MongoModule = typeof import('mongoose');

async function getMongo(): Promise<MongoModule> {
  if (cachedMongo && cachedMongo.connection?.readyState !== 0) {
    return cachedMongo;
  }
  const mongooseImport = await import('mongoose');
  const mongoose = (mongooseImport as unknown as { default?: MongoModule }).default || (mongooseImport as MongoModule);
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/fixzit_test';
  const dbName = process.env.MONGODB_DB || 'fixzit_test';
  await mongoose.connect(uri, { dbName });
  cachedMongo = mongoose;
  return mongoose;
}

async function mintSessionFromDb(
  email: string,
  secret: string,
  sessionSalt: string,
  mongo: MongoModule,
  opts: { fallbackOrgId?: string },
) {
  const db = mongo.connection?.db;
  if (!db) {
    throw new Error('MongoDB connection is not established for test session minting');
  }

  const user = await db.collection('users').findOne<{ 
    _id: ObjectId;
    email: string;
    orgId?: ObjectId | string;
    professional?: { role?: string | null; subRole?: string | null };
    isSuperAdmin?: boolean;
    permissions?: string[];
    roles?: Array<string | ObjectId>;
  }>({ email: email.toLowerCase() });

  if (!user) {
    throw new Error(`User ${email} not found in MongoDB for test session minting`);
  }

  const orgId = (user.orgId as ObjectId | undefined)?.toString?.() || opts.fallbackOrgId || '000000000000000000000001';
  const role = user.professional?.role || 'ADMIN';
  const isSuperAdmin = Boolean(user.isSuperAdmin);
  const permissions = Array.isArray(user.permissions) ? user.permissions.filter(Boolean) : [];
  const roles = Array.isArray(user.roles) && user.roles.length > 0
    ? user.roles.map(r => (typeof r === 'string' ? r : r?.toString?.() || '')).filter(Boolean)
    : (isSuperAdmin ? ['SUPER_ADMIN', role] : [role]);

  const userId = (user._id as ObjectId).toString();

  const sessionToken = await encodeJwt({
    secret,
    maxAge: 30 * 24 * 60 * 60,
    salt: sessionSalt,
    token: {
      id: userId,
      sub: userId,
      email: user.email,
      role,
      roles,
      orgId,
      org_id: orgId,
      isSuperAdmin,
      permissions,
    },
  });

  return { sessionToken, orgId, role, roles, permissions };
}
