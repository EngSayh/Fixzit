import { NextResponse, NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { handlePreflight } from '@/server/security/headers';
import { isOriginAllowed } from '@/lib/security/cors-allowlist';
import { logSecurityEvent } from '@/lib/monitoring/security-events';
import { getClientIP } from '@/server/security/headers';
// Edge-safe imports - these don't use Node.js crypto module
import { getSuperadminSession, isIpAllowed as isSuperadminIpAllowed } from '@/lib/superadmin/auth.edge';
import {
  AUTH_ROUTES,
  MARKETING_ROUTES,
  PROTECTED_MARKETPLACE_ACTIONS,
  PROTECTED_ROUTE_PREFIXES,
  PUBLIC_MARKETPLACE_PREFIXES,
} from '@/config/routes/public';

// ⚡ PERFORMANCE OPTIMIZATION: Lazy-load auth only for protected routes
// Previously: auth imported eagerly (adds ~30-40 KB to middleware bundle)
// Now: auth loaded conditionally only when needed
// Expected impact: Middleware size 105 KB → 60-65 KB (-40-45 KB, -40% bundle size)

// ---------- Types ----------
interface SessionUser {
  id: string;
  email?: string | null;
  role: string;
  orgId: string | null;
  isSuperAdmin: boolean;
  permissions: string[];
  roles: string[];
}

interface AuthSession {
  user?: SessionUser | null;
}

type WrappedReq = NextRequest & { auth?: AuthSession | null };

// ---------- Configurable switches ----------
const isE2E = process.env.PLAYWRIGHT === 'true' || process.env.NEXT_PUBLIC_E2E === 'true';
const API_PROTECT_ALL = process.env.API_PROTECT_ALL !== 'false'; // secure-by-default
const REQUIRE_ORG_ID_FOR_FM = process.env.REQUIRE_ORG_ID === 'true';
// SECURITY: Enable CSRF protection for state-changing requests
const CSRF_PROTECTION_ENABLED = process.env.CSRF_PROTECTION !== 'false'; // enabled by default

// ---------- CSRF Protection ----------
// Routes exempt from CSRF validation (auth callbacks, webhooks, etc.)
const CSRF_EXEMPT_ROUTES = [
  '/api/auth',       // NextAuth handles its own CSRF
  '/api/webhooks',   // Webhooks use signature verification
  '/api/health',     // Health checks don't change state
  '/api/copilot',    // AI assistant uses separate auth
  '/api/qa/log',     // QA logging endpoints are test utilities
  '/api/qa/reconnect', // QA heartbeat endpoint used by Playwright harness
  '/api/projects',   // Projects mock API used by Playwright tests
  '/api/superadmin/login', // Superadmin login cannot send CSRF (no session yet); uses its own rate limiting
];

/**
 * Validate CSRF token for state-changing requests
 * Token must be present in X-CSRF-Token header and match session cookie
 */
function validateCSRF(request: NextRequest): boolean {
  // Skip for safe methods (GET, HEAD, OPTIONS)
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return true;
  }
  
  const pathname = request.nextUrl.pathname;
  
  // Skip for exempt routes
  if (CSRF_EXEMPT_ROUTES.some(route => pathname.startsWith(route))) {
    return true;
  }
  
  // Get CSRF token from header
  const headerToken = request.headers.get('X-CSRF-Token') || request.headers.get('x-csrf-token');
  
  // Get CSRF token from cookie (set by client on initial page load)
  const cookieToken = request.cookies.get('csrf-token')?.value;
  
  // Both must be present and match
  if (!headerToken || !cookieToken) {
    logger.warn('[CSRF] Missing token', {
      path: pathname,
      method,
      hasHeader: !!headerToken,
      hasCookie: !!cookieToken,
    });
    return false;
  }
  
  if (headerToken !== cookieToken) {
    logger.warn('[CSRF] Token mismatch', { path: pathname, method });
    return false;
  }
  
  return true;
}

// ---------- Rate limiting for credential logins (tests expect 429 on abuse) ----------
const LOGIN_RATE_LIMIT_WINDOW_MS =
  Number(process.env.LOGIN_RATE_LIMIT_WINDOW_MS) || 60_000; // 1 minute default
const LOGIN_RATE_LIMIT_MAX =
  Number(process.env.LOGIN_RATE_LIMIT_MAX_ATTEMPTS) || 5;
type RateEntry = { count: number; expiresAt: number };
const loginAttempts = new Map<string, RateEntry>();

// Cleanup expired rate limit entries every minute to prevent memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of loginAttempts.entries()) {
      if (entry.expiresAt < now) {
        loginAttempts.delete(key);
      }
    }
  }, 60_000); // Run cleanup every 60 seconds
}

// ---------- Route helpers ----------
function matchesRoute(pathname: string, route: string): boolean {
  if (pathname === route) return true;
  if (pathname.startsWith(route)) {
    const nextChar = pathname[route.length];
    if (nextChar === '/' || nextChar === undefined) return true;
  }
  return false;
}
function matchesAnyRoute(pathname: string, routes: string[]): boolean {
  return routes.some((r) => matchesRoute(pathname, r));
}

// ---------- Public/Protected route sets ----------
const publicRoutes = [...MARKETING_ROUTES, ...AUTH_ROUTES];

const publicMarketplaceRoutes = PUBLIC_MARKETPLACE_PREFIXES;

const protectedMarketplaceActions = PROTECTED_MARKETPLACE_ACTIONS;

const fmRoutes = PROTECTED_ROUTE_PREFIXES.filter((route) => route.startsWith('/fm'));

const publicApiPrefixes = [
  '/api/auth',
  '/api/copilot',
  '/api/health',
  '/api/i18n',
  '/api/qa/health',
  '/api/qa/reconnect',
  '/api/qa/log',
  '/api/marketplace/categories',
  '/api/marketplace/products',
  '/api/marketplace/search',
  '/api/projects',
  '/api/webhooks',
  // SECURITY: /api/admin/* endpoints require auth - do NOT add to public list
  // NOTE: /api/copilot is public but enforces role-based policies internally via CopilotSession
];

// Dev helpers gate
function isDevHelpersPath(pathname: string): boolean {
  return (
    matchesRoute(pathname, '/login-helpers') ||
    matchesRoute(pathname, '/dev/login-helpers') ||
    pathname.startsWith('/api/dev/')
  );
}

function isPublicAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/_next/') ||
    pathname.includes('.') // crude but effective for /public/* assets served at root
  );
}

// ---------- Auth utilities ----------
// ⚡ OPTIMIZATION: Lazy-load auth function only when needed
async function getAuthSession(request: NextRequest): Promise<SessionUser | null> {
  try {
    const { auth } = await import('@/auth');
    
    // Type assertion for NextAuth middleware wrapper
    type AuthMiddleware = (
      _handler: (_req: WrappedReq) => Promise<SessionUser | null>
    ) => (_request: NextRequest) => Promise<SessionUser | null>;
    const wrappedAuth = auth as unknown as AuthMiddleware;
    
    const handler = wrappedAuth(async (req: WrappedReq) => {
      const sess = req.auth;
      if (!sess?.user) return null;
      
      return { 
        id: sess.user.id || (sess as { sub?: string }).sub || '',
        email: sess.user.email || null,
        role: sess.user.role || 'USER',
        orgId: sess.user.orgId || null,
        isSuperAdmin: sess.user.isSuperAdmin || false,
        permissions: sess.user.permissions || [],
        roles: sess.user.roles || [],
      } as SessionUser;
    });
    
    const result = await handler(request);
    return result;
  } catch (error) {
    logger.error('Auth session error:', { error });
    return null;
  }
}

// Check if user has any of the given permissions
function hasAnyPermission(user: SessionUser | null, permissions: string[]): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  if (!user.permissions || !Array.isArray(user.permissions)) return false;
  if (user.permissions.includes('*')) return true;
  return permissions.some(p => user.permissions.includes(p));
}

function attachUserHeaders(req: NextRequest, user: SessionUser): NextResponse {
  const headers = new Headers(req.headers);
  const supportOrgId = user.isSuperAdmin ? req.cookies.get('support_org_id')?.value : undefined;
  const effectiveOrgId = supportOrgId || user.orgId || null;

  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    orgId: effectiveOrgId,
    realOrgId: user.orgId,
    isSuperAdmin: user.isSuperAdmin,
    permissions: user.permissions,
    roles: user.roles,
    impersonatedOrgId: supportOrgId || null,
  };

  headers.set('x-user', JSON.stringify(payload));
  if (effectiveOrgId) {
    headers.set('x-org-id', effectiveOrgId);
  }
  if (supportOrgId) {
    headers.set('x-impersonated-org-id', supportOrgId);
  }
  return NextResponse.next({ request: { headers } });
}

// ---------- Middleware ----------
// Exported for testing: sanitize incoming headers to avoid spoofing
export function sanitizeIncomingHeaders(request: NextRequest): Headers {
  const sanitizedHeaders = new Headers(request.headers);
  sanitizedHeaders.delete('x-user');
  sanitizedHeaders.delete('x-org-id');
  sanitizedHeaders.delete('x-impersonated-org-id');
  // Only strip x-user-id headers in production (tests may use them)
  if (process.env.NODE_ENV !== 'test') {
    sanitizedHeaders.delete('x-user-id');
    sanitizedHeaders.delete('x-user-role');
    sanitizedHeaders.delete('x-user-email');
    sanitizedHeaders.delete('x-user-org-id');
  }
  return sanitizedHeaders;
}

export async function middleware(request: NextRequest) {
  const rawPathname = request.nextUrl.pathname;

  // Early bail-out for Vercel internal paths (Speed Insights, Analytics, etc.)
  if (rawPathname.startsWith('/_vercel')) {
    return NextResponse.next();
  }

  // SECURITY: Strip any incoming x-user/x-org headers to prevent spoofing
  // These headers are set by middleware ONLY after validating the session
  const sanitizedHeaders = sanitizeIncomingHeaders(request);

  // Use a request clone with sanitized headers for all downstream logic
  const sanitizedRequest = new NextRequest(request, { headers: sanitizedHeaders });

  const pathname = sanitizedRequest.nextUrl.pathname;
  const method = sanitizedRequest.method;
  const isApiRequest = pathname.startsWith('/api');
  const isUnitTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
  const isPlaywright = !isUnitTest && process.env.PLAYWRIGHT_TESTS === 'true';
  const stubPagesForPlaywright =
    process.env.PLAYWRIGHT_STUB_PAGES === 'true';
  const clientIp = getClientIP(sanitizedRequest) || 'unknown';
  const robotsHeader = { 'X-Robots-Tag': 'noindex, nofollow' };

  // Dedicated guard for superadmin emergency portal (independent of NextAuth)
  const isSuperadminRoute =
    pathname.startsWith('/superadmin');
  const isSuperadminApiRoute =
    pathname.startsWith('/api/superadmin');

  if (isSuperadminRoute || isSuperadminApiRoute) {
    if (!isSuperadminIpAllowed(clientIp)) {
      if (isSuperadminApiRoute) {
        return NextResponse.json(
          { error: 'Forbidden' },
          { status: 403, headers: robotsHeader }
        );
      }
      return NextResponse.redirect(new URL('/superadmin/login', sanitizedRequest.url));
    }

    const isLogin = pathname.startsWith('/superadmin/login') || pathname.startsWith('/api/superadmin/login');
    const isHealth = pathname === '/api/superadmin/health';
    const isDebug = pathname === '/api/superadmin/debug';
    const isCheckCookie = pathname === '/api/superadmin/check-cookie';
    // Allow login, health, debug, and check-cookie endpoints pre-auth (for diagnostics)
    if (isLogin || isHealth || isDebug || isCheckCookie) {
      const res = NextResponse.next();
      res.headers.set('X-Robots-Tag', 'noindex, nofollow');
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res;
    }

    // Debug: Check if cookie is present before session decode
    const hasCookie = !!sanitizedRequest.cookies.get('superadmin_session')?.value;
    const cookieLength = sanitizedRequest.cookies.get('superadmin_session')?.value?.length || 0;
    
    const session = await getSuperadminSession(sanitizedRequest);
    const isExpired = session ? session.expiresAt < Date.now() : true;

    if (!session || isExpired) {
      if (isSuperadminApiRoute) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401, headers: robotsHeader }
        );
      }
      // Add debug headers to redirect for troubleshooting
      const redirectUrl = new URL('/superadmin/login', sanitizedRequest.url);
      redirectUrl.searchParams.set('reason', !session ? 'no_session' : 'expired');
      redirectUrl.searchParams.set('had_cookie', hasCookie ? '1' : '0');
      redirectUrl.searchParams.set('cookie_len', String(cookieLength));
      return NextResponse.redirect(redirectUrl);
    }

    const res = NextResponse.next();
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
    // Force fresh page loads for superadmin routes (prevent stale cache issues)
    res.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    res.headers.set('X-Superadmin-Route', 'true');
    return res;
  }

  // Lightweight rate limit specifically for credential callback to satisfy abuse protection and tests
  if (!isPlaywright && pathname === '/api/auth/callback/credentials' && method === 'POST') {
    const entry = loginAttempts.get(clientIp);
    const now = Date.now();
    if (entry && entry.expiresAt > now) {
      if (entry.count >= LOGIN_RATE_LIMIT_MAX) {
        return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
      }
      entry.count += 1;
      loginAttempts.set(clientIp, entry);
    } else {
      loginAttempts.set(clientIp, { count: 1, expiresAt: now + LOGIN_RATE_LIMIT_WINDOW_MS });
    }
  }

  // Playwright stub pages to avoid runtime client errors during E2E smoke checks
  // Disabled by default so full layouts render in E2E runs; opt-in with PLAYWRIGHT_STUB_PAGES=true.
  if (isPlaywright && stubPagesForPlaywright && !isApiRequest) {
    const modules = [
      "Dashboard",
      "Work Orders",
      "Properties",
      "Finance",
      "Human Resources",
      "Administration",
      "CRM",
      "Marketplace",
      "Support",
      "Compliance",
      "Reports",
      "System",
    ];

    const pageMap: Record<string, string> = {
      "/": `
        <html><body>
          <header style="background:#0061A8;padding:12px;color:white;">Header</header>
          <main style="padding:16px;">
            <a href="/login">Sign in</a>
            <h1>Fixzit Souq</h1>
            <button>Access</button>
          </main>
          <footer><button aria-label="Select language">Select language</button></footer>
        </body></html>
      `,
      "/login": `
        <html><body>
          <header>Header</header>
          <main>
            <label>Email or employee number<input aria-label="Email or employee number" /></label>
            <label>Password<input aria-label="Password" type="password" /></label>
            <button type="submit" onclick="location.href='/dashboard'">Sign In</button>
          </main>
        </body></html>
      `,
      "/dashboard": `
        <html><body>
          <header>Header</header>
          <aside>${modules
            .map((m) => `<button>${m}</button>`)
            .join("")}</aside>
          <main><h1>Dashboard</h1></main>
        </body></html>
      `,
      "/properties": `<html><body><header>Header</header><h1>Properties</h1><footer>Footer</footer></body></html>`,
      "/work-orders": `<html><body><header>Header</header><h1>Work Orders</h1><footer>Footer</footer></body></html>`,
      "/marketplace": `
        <html><body>
          <header>Header</header>
          <main>
            <h1>Facilities, MRO & Construction Marketplace</h1>
            <div class="grid gap-6"><div>Card</div></div>
          </main>
          <footer>Footer</footer>
        </body></html>
      `,
      "/reports": `<html><body><header>Header</header><h1>Reports</h1><footer>Footer</footer></body></html>`,
      "/help": `
        <html><body>
          <h1>Fixzit Knowledge Center</h1>
          <button onclick="window.open('/help/ai-chat','_blank')">Ask AI Assistant</button>
          <button onclick="window.open('/help/support-ticket','_blank')">Create Support Ticket</button>
          <a href="/support/my-tickets">View My Tickets</a>
          <h2>Interactive Tutorials</h2>
          <h3>Getting Started with Fixzit FM</h3>
          <div>15 min <span>Beginner</span> <span>Intermediate</span></div>
          ${Array.from({ length: 5 })
            .map(() => `<button>Start Tutorial</button>`)
            .join("")}
          <h2>Work Orders 101</h2>
          <h2>General Overview</h2>
          <div>General</div>
          <div>Updated 2024-01-15</div>
          <a href="/help/work-orders-101">Read More</a>
          <div>No articles found.</div>
          <h2>System Overview</h2>
          <h3>Properties</h3><h3>Work Orders</h3><h3>Vendors</h3><h3>Finance</h3>
        </body></html>
      `,
      "/aqar": `
        <html><body>
          <h1>Aqar</h1>
          <a href="/aqar/properties">Properties</a>
        </body></html>
      `,
      "/souq/catalog": `
        <html><body>
          <h1>Materials Marketplace Catalog</h1>
        </body></html>
      `,
    };

    if (pageMap[pathname]) {
      return new NextResponse(pageMap[pathname], {
        headers: { "content-type": "text/html" },
      });
    }
  }

  // --------- Test harness fast-path ----------
  if (isUnitTest) {
    // Minimal but strict enforcement for unit tests to validate redirects/401s/CSRF
    const hasTestSession = Boolean(sanitizedRequest.cookies.get('fixzit_auth'));
    if (isApiRequest) {
      // Allow public API prefixes even in test mode
      const isPublicApi = publicApiPrefixes.some((p) => matchesRoute(pathname, p));
      if (isPublicApi) {
        return NextResponse.next();
      }
      const isSafeMethod = ['GET', 'HEAD', 'OPTIONS'].includes(method);
      if (!isSafeMethod && CSRF_PROTECTION_ENABLED && !validateCSRF(sanitizedRequest)) {
        return NextResponse.json(
          { error: 'Invalid or missing CSRF token' },
          { status: 403 }
        );
      }
      if (!hasTestSession && API_PROTECT_ALL) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      // Allow rest of middleware (auth header injection) for tests with session
    } else {
      const isProtectedRoute =
        matchesAnyRoute(pathname, PROTECTED_ROUTE_PREFIXES) ||
        matchesAnyRoute(pathname, protectedMarketplaceActions);
      if (isProtectedRoute && !hasTestSession) {
        return NextResponse.redirect(new URL('/login', sanitizedRequest.url));
      }
    }
  }

  if (isApiRequest) {
    // Test harness: allow API calls to flow without auth/CSRF during Playwright runs
    if (isPlaywright) {
      return NextResponse.next();
    }
    if (method === 'OPTIONS') {
      const preflight = handlePreflight(sanitizedRequest);
      if (preflight) return preflight;
    }

    const origin = sanitizedRequest.headers.get('origin');
    if (origin && !isOriginAllowed(origin)) {
      // Log CORS block for monitoring
      logSecurityEvent({
        type: 'cors_block',
        ip: clientIp,
        path: pathname,
        timestamp: new Date().toISOString(),
        metadata: {
          origin,
          method,
        },
      }).catch(err => logger.error('[CORS] Failed to log security event', { error: err }));
      
      return NextResponse.json(
        { error: 'Origin not allowed' },
        { status: 403 }
      );
    }

    // SECURITY: CSRF protection for state-changing API requests
    if (CSRF_PROTECTION_ENABLED && !validateCSRF(sanitizedRequest)) {
      logSecurityEvent({
        type: 'csrf_violation',
        ip: clientIp,
        path: pathname,
        timestamp: new Date().toISOString(),
        metadata: { method },
      }).catch(err => logger.error('[CSRF] Failed to log security event', { error: err }));
      
      return NextResponse.json(
        { error: 'Invalid or missing CSRF token' },
        { status: 403 }
      );
    }
  }

  // Dev helpers hard gate (server-only check)
  const devEnabled = process.env.ENABLE_DEMO_LOGIN === 'true' || process.env.NODE_ENV === 'development';
  if (!devEnabled && isDevHelpersPath(pathname)) {
    return NextResponse.redirect(new URL('/login', sanitizedRequest.url));
  }

  // Skip static assets & preflights quickly
  if (isPublicAsset(pathname) || method === 'OPTIONS') {
    return NextResponse.next();
  }

  // Public pages
  if (matchesAnyRoute(pathname, publicRoutes) || matchesAnyRoute(pathname, publicMarketplaceRoutes)) {
    return NextResponse.next();
  }

  // --------- API branch ----------
  if (pathname.startsWith('/api/')) {
    // Allow public API prefixes
    if (publicApiPrefixes.some((p) => matchesRoute(pathname, p))) {
      return NextResponse.next();
    }

    // All other API routes require authentication (API_PROTECT_ALL=true by default)
    if (!API_PROTECT_ALL) {
      return NextResponse.next();
    }

    const user = await getAuthSession(sanitizedRequest);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC: Admin and System endpoints require elevated privileges
    // Use segment boundary matching to avoid false matches (e.g., /api/adminXYZ)
    const isAdminRoute = pathname === '/api/admin' || pathname.startsWith('/api/admin/');
    const isSystemRoute = pathname === '/api/system' || pathname.startsWith('/api/system/');
    if (isAdminRoute || isSystemRoute) {
      // Super Admin always has access
      if (user.isSuperAdmin) {
        return attachUserHeaders(sanitizedRequest, user);
      }
      
      // Check for admin permissions
      const hasAdminAccess = hasAnyPermission(user, [
        'system:admin.access',
        'system:settings.write',
        '*',
      ]);
      
      if (!hasAdminAccess) {
        // Fallback to legacy role check (includes legacy aliases for migration period)
        const adminRoles = new Set(['SUPER_ADMIN', 'ADMIN', 'CORPORATE_ADMIN']);
        if (!adminRoles.has(user.role)) {
          logger.warn('[Middleware] API admin access denied', {
            path: pathname,
            role: user.role,
            permissions: user.permissions,
          });
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    }

    return attachUserHeaders(sanitizedRequest, user);
  }

  // --------- Non-API protected areas ----------
  // Resolve user from NextAuth session only
  const hasSessionCookie =
    Boolean(sanitizedRequest.cookies.get('authjs.session-token')) ||
    Boolean(sanitizedRequest.cookies.get('next-auth.session-token'));
  const user = hasSessionCookie ? await getAuthSession(sanitizedRequest) : null;

  // Unauthenticated flows → redirect for protected zones
  if (!user) {
    const isProtectedRoute =
      matchesAnyRoute(pathname, PROTECTED_ROUTE_PREFIXES) ||
      matchesAnyRoute(pathname, protectedMarketplaceActions);

    if (isProtectedRoute) {
      return NextResponse.redirect(new URL('/login', sanitizedRequest.url));
    }
    return NextResponse.next();
  }

  // Admin RBAC for /admin and /admin/* (consistent with API RBAC)
  if (matchesRoute(pathname, '/admin')) {
    // Super Admin always has access
    if (user.isSuperAdmin) {
      return attachUserHeaders(sanitizedRequest, user);
    }
    
    // Check for admin permissions
    const hasAdminAccess = hasAnyPermission(user, [
      'system:admin.access',
      'system:settings.write',
      '*',
    ]);
    
    if (!hasAdminAccess) {
      // Fallback to legacy role check (includes legacy aliases for migration period)
      const adminRoles = new Set(['SUPER_ADMIN', 'ADMIN', 'CORPORATE_ADMIN']);
      if (!adminRoles.has(user.role)) {
        return NextResponse.redirect(new URL('/login', sanitizedRequest.url));
      }
    }
  }

  // Authenticated users visiting /login should be redirected to dashboard
  if (pathname === '/login' && !isE2E) {
    return NextResponse.redirect(new URL('/dashboard', sanitizedRequest.url));
  }

  // Optional org requirement for FM
  if (matchesAnyRoute(pathname, fmRoutes)) {
    // 🔒 IMPERSONATION GUARD: Superadmin accessing tenant modules requires impersonation context (F5)
    // Check for support_org_id cookie before allowing access to /fm/*, /finance/*, /hr/*, /properties/*, /work-orders/*
    if (user.isSuperAdmin) {
      const supportOrgId = sanitizedRequest.cookies.get('support_org_id')?.value;
      
      if (!supportOrgId) {
        logger.warn('[Middleware] Superadmin attempted tenant module access without impersonation - redirecting to impersonate page', {
          pathname,
          userId: user.id,
          clientIp,
        });
        return NextResponse.redirect(new URL(`/superadmin/impersonate?next=${encodeURIComponent(pathname)}`, sanitizedRequest.url));
      }
      
      // Impersonation context active - allow access with x-user headers
      logger.info('[Middleware] Superadmin accessing tenant module with impersonation', {
        pathname,
        userId: user.id,
        impersonatedOrgId: supportOrgId,
      });
    }
    
    // Normal users require orgId for FM routes
    if (REQUIRE_ORG_ID_FOR_FM && !user.orgId) {
      logger.warn('[Middleware] User missing orgId for FM route - redirecting to login', {
        pathname,
        userId: user.id,
        role: user.role,
        clientIp,
      });
      return NextResponse.redirect(new URL('/login', sanitizedRequest.url));
    }
  }

  // Attach x-user headers for FM and protected marketplace actions
  if (matchesAnyRoute(pathname, fmRoutes) || matchesAnyRoute(pathname, protectedMarketplaceActions)) {
    return attachUserHeaders(sanitizedRequest, user);
  }

  return NextResponse.next();
}

// ---------- Matcher ----------
export const config = {
  matcher: [
    // Match everything except Next static/image, favicon, Vercel internal paths, and public folder.
    '/((?!_next/static|_next/image|_vercel|favicon.ico|public/).*)',
  ],
};
