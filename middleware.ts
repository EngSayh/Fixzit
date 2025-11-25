import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { handlePreflight } from '@/server/security/headers';
import { isOriginAllowed } from '@/lib/security/cors-allowlist';
import { logSecurityEvent } from '@/lib/monitoring/security-events';
import { getClientIP } from '@/server/security/headers';
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
const API_PROTECT_ALL = process.env.API_PROTECT_ALL !== 'false'; // secure-by-default
const REQUIRE_ORG_ID_FOR_FM = process.env.REQUIRE_ORG_ID === 'true';

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
  '/api/marketplace/categories',
  '/api/marketplace/products',
  '/api/marketplace/search',
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
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const isApiRequest = pathname.startsWith('/api');
  const isPlaywright = process.env.PLAYWRIGHT_TESTS === 'true';
  const clientIp = getClientIP(request) || 'unknown';

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

  if (isApiRequest) {
    if (method === 'OPTIONS') {
      const preflight = handlePreflight(request);
      if (preflight) return preflight;
    }

    const origin = request.headers.get('origin');
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
  }

  // Dev helpers hard gate (server-only check)
  const devEnabled = process.env.ENABLE_DEMO_LOGIN === 'true' || process.env.NODE_ENV === 'development';
  if (!devEnabled && isDevHelpersPath(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
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

    const user = await getAuthSession(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // RBAC: Admin and System endpoints require elevated privileges
    if (pathname.startsWith('/api/admin') || pathname.startsWith('/api/system')) {
      // Super Admin always has access
      if (user.isSuperAdmin) {
        return attachUserHeaders(request, user);
      }
      
      // Check for admin permissions
      const hasAdminAccess = hasAnyPermission(user, [
        'system:admin.access',
        'system:settings.write',
        '*',
      ]);
      
      if (!hasAdminAccess) {
        // Fallback to legacy role check
        const adminRoles = new Set(['SUPER_ADMIN', 'CORPORATE_ADMIN', 'ADMIN']);
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

    return attachUserHeaders(request, user);
  }

  // --------- Non-API protected areas ----------
  // Resolve user from NextAuth session only
  const hasSessionCookie =
    Boolean(request.cookies.get('authjs.session-token')) ||
    Boolean(request.cookies.get('next-auth.session-token'));
  const user = hasSessionCookie ? await getAuthSession(request) : null;

  // Unauthenticated flows → redirect for protected zones
  if (!user) {
    const isProtectedRoute =
      matchesAnyRoute(pathname, PROTECTED_ROUTE_PREFIXES) ||
      matchesAnyRoute(pathname, protectedMarketplaceActions);

    if (isProtectedRoute) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Admin RBAC for /admin and /admin/* (consistent with API RBAC)
  if (matchesRoute(pathname, '/admin')) {
    // Super Admin always has access
    if (user.isSuperAdmin) {
      return attachUserHeaders(request, user);
    }
    
    // Check for admin permissions
    const hasAdminAccess = hasAnyPermission(user, [
      'system:admin.access',
      'system:settings.write',
      '*',
    ]);
    
    if (!hasAdminAccess) {
      // Fallback to legacy role check
      const adminRoles = new Set(['SUPER_ADMIN', 'CORPORATE_ADMIN', 'ADMIN']);
      if (!adminRoles.has(user.role)) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }
  }

  // Authenticated users visiting /login should be redirected to dashboard
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Optional org requirement for FM
  if (REQUIRE_ORG_ID_FOR_FM && matchesAnyRoute(pathname, fmRoutes) && !user.orgId) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Attach x-user headers for FM and protected marketplace actions
  if (matchesAnyRoute(pathname, fmRoutes) || matchesAnyRoute(pathname, protectedMarketplaceActions)) {
    return attachUserHeaders(request, user);
  }

  return NextResponse.next();
}

// ---------- Matcher ----------
export const config = {
  matcher: [
    // Match everything except Next static/image and favicon; public/ isn't a real route but keep the guard.
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
