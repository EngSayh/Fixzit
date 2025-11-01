import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';

// ---------- Types ----------
interface SessionUser {
  id?: string;
  email?: string | null;
  role?: string;
  orgId?: string | null;
}
type WrappedReq = NextRequest & { auth?: { user?: SessionUser | null } | null };

// ---------- Configurable switches ----------
const API_PROTECT_ALL = process.env.API_PROTECT_ALL !== 'false'; // secure-by-default
const REQUIRE_ORG_ID = process.env.REQUIRE_ORG_ID === 'true';

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

const protectedApiRoutes = [
  '/api/assets',
  '/api/properties',
  '/api/tenants',
  '/api/vendors',
  '/api/projects',
  '/api/rfqs',
  '/api/slas',
  '/api/finance/invoices',
  '/api/users',
  '/api/work-orders',
  '/api/finance',
  '/api/support',
  '/api/admin',
  '/api/notifications',
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
  '/api/cms', 
  '/api/help', 
  '/api/assistant', 
  '/api/health',
  '/api/i18n',                    // Allow translations for all users
  '/api/qa/health',               // Telemetry/health checks
  '/api/qa/reconnect',            // Telemetry reconnect
  '/api/marketplace/categories',  // Public marketplace browsing
  '/api/marketplace/products',    // Public product listing
  '/api/marketplace/search',      // Public search
  '/api/copilot/profile',         // Copilot widget (returns guest session if not authenticated)
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
async function getUserFromRequest(req: WrappedReq): Promise<SessionUser | null> {
  const sess = req.auth;
  if (sess?.user) {
    const u = sess.user as SessionUser;
    return {
      id: u.id || '',
      email: u.email || '',
      role: u.role || 'USER',
      orgId: u.orgId ?? null,
    };
  }
  return null;
}

function attachUserHeaders(req: NextRequest, user: SessionUser): NextResponse {
  const headers = new Headers(req.headers);
  headers.set('x-user', JSON.stringify({ id: user.id, email: user.email, role: user.role, orgId: user.orgId }));
  if (user.orgId) headers.set('x-org-id', user.orgId);
  return NextResponse.next({ request: { headers } });
}

// ---------- Middleware ----------
export default auth(async function middleware(request: WrappedReq) {
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

    const needsAuth = API_PROTECT_ALL || matchesAnyRoute(pathname, protectedApiRoutes);
    if (!needsAuth) {
      return NextResponse.next();
    }

    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return attachUserHeaders(request, user);
  }

  // --------- Non-API protected areas ----------
  // Resolve user from NextAuth session only
  const user = await getUserFromRequest(request);

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

  // Admin RBAC for /admin and /admin/*
  if (matchesRoute(pathname, '/admin')) {
    const adminRoles = new Set(['SUPER_ADMIN', 'ADMIN', 'CORPORATE_ADMIN']);
    if (!adminRoles.has(user.role || 'USER')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Role-based post-login redirect (only from /login)
  if (pathname === '/login') {
    if (user.role === 'SUPER_ADMIN' || user.role === 'CORPORATE_ADMIN' || user.role === 'FM_MANAGER') {
      return NextResponse.redirect(new URL('/fm/dashboard', request.url));
    } else if (user.role === 'TENANT') {
      return NextResponse.redirect(new URL('/fm/properties', request.url));
    } else if (user.role === 'VENDOR') {
      return NextResponse.redirect(new URL('/fm/marketplace', request.url));
    } else {
      return NextResponse.redirect(new URL('/fm/dashboard', request.url));
    }
  }

  // Optional org requirement for FM
  if (REQUIRE_ORG_ID && matchesAnyRoute(pathname, fmRoutes) && !user.orgId) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Attach x-user headers for FM and protected marketplace actions
  if (matchesAnyRoute(pathname, fmRoutes) || matchesAnyRoute(pathname, protectedMarketplaceActions)) {
    return attachUserHeaders(request, user);
  }

  return NextResponse.next();
});

// ---------- Matcher ----------
export const config = {
  matcher: [
    // Match everything except Next static/image and favicon; public/ isn't a real route but keep the guard.
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
