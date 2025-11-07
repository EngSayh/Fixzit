import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
}

interface AuthSession {
  user?: SessionUser | null;
}

type WrappedReq = NextRequest & { auth?: AuthSession | null };

// ---------- Configurable switches ----------
const API_PROTECT_ALL = process.env.API_PROTECT_ALL !== 'false'; // secure-by-default
const REQUIRE_ORG_ID_FOR_FM = process.env.REQUIRE_ORG_ID === 'true';

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
const publicRoutes = [
  '/',
  '/login',
  '/forgot-password',
  '/help',
  '/cms/privacy',
  '/cms/terms',
  '/cms/about',
  '/careers',
  '/test',
  '/test-simple',
  // Public marketplaces (guest browse)
  '/aqar',
  '/souq',
  '/marketplace',
];

const publicMarketplaceRoutes = [
  '/souq',
  '/souq/catalog',
  '/souq/vendors',
  '/aqar',
  '/aqar/map',
  '/aqar/search',
  '/aqar/properties',
];

const protectedMarketplaceActions = [
  '/souq/cart',
  '/souq/checkout',
  '/souq/purchase',
  '/souq/my-orders',
  '/souq/my-rfqs',
  '/aqar/favorites',
  '/aqar/listings',
  '/aqar/my-properties',
  '/aqar/bookings',
];

const fmRoutes = [
  '/fm/dashboard',
  '/fm/work-orders',
  '/fm/properties',
  '/fm/finance',
  '/fm/hr',
  '/fm/crm',
  '/fm/marketplace',
  '/fm/support',
  '/fm/compliance',
  '/fm/reports',
  '/fm/system',
  '/fm/assets',
  '/fm/tenants',
  '/fm/vendors',
];

const publicApiPrefixes = [
  '/api/auth',
  '/api/health',
  '/api/i18n',
  '/api/qa/health',
  '/api/qa/reconnect',
  '/api/marketplace/categories',
  '/api/marketplace/products',
  '/api/marketplace/search',
  '/api/webhooks',
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
      return sess?.user ? { 
        ...sess.user, 
        id: sess.user.id || (sess as { sub?: string }).sub || '' 
      } as SessionUser : null;
    });
    
    const result = await handler(request);
    return result;
  } catch (error) {
    console.error('Auth session error:', error);
    return null;
  }
}

function attachUserHeaders(req: NextRequest, user: SessionUser): NextResponse {
  const headers = new Headers(req.headers);
  headers.set('x-user', JSON.stringify({ id: user.id, email: user.email, role: user.role, orgId: user.orgId }));
  if (user.orgId) headers.set('x-org-id', user.orgId);
  return NextResponse.next({ request: { headers } });
}

// ---------- Middleware ----------
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;

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
      const adminRoles = new Set(['SUPER_ADMIN', 'CORPORATE_ADMIN']);
      if (!adminRoles.has(user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    return attachUserHeaders(request, user);
  }

  // --------- Non-API protected areas ----------
  // Resolve user from NextAuth session only
  const user = await getAuthSession(request);

  // Unauthenticated flows → redirect for protected zones
  if (!user) {
    if (
      matchesAnyRoute(pathname, fmRoutes) ||
      matchesAnyRoute(pathname, protectedMarketplaceActions)
    ) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // Admin RBAC for /admin and /admin/* (consistent with API RBAC)
  if (matchesRoute(pathname, '/admin')) {
    const adminRoles = new Set(['SUPER_ADMIN', 'CORPORATE_ADMIN']);
    if (!adminRoles.has(user.role)) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Authenticated users visiting /login should be redirected to dashboard
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/fm/dashboard', request.url));
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
