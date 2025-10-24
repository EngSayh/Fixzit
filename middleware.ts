import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { jwtVerify } from 'jose';

// Force Node.js runtime for middleware (required for jose JWT verification)
export const runtime = 'nodejs';

// Extend NextAuth session user type with role and orgId
interface SessionUser {
  id?: string;
  email?: string;
  role?: string;
  orgId?: string | null;
}

// Validate JWT secret at module load - fail fast if missing
// Require dedicated JWT_SECRET instead of falling back to NEXTAUTH_SECRET to prevent token confusion
const jwtSecretValue = process.env.JWT_SECRET;
if (!jwtSecretValue) {
  const errorMessage = 'FATAL: JWT_SECRET environment variable is not set. Application cannot start without a secure JWT secret. Please add JWT_SECRET to your .env.local file or environment configuration.';
  console.error(errorMessage);
  throw new Error(errorMessage);
}

// JWT secret for legacy token verification
const JWT_SECRET = new TextEncoder().encode(jwtSecretValue);

/**
 * Check if a pathname matches a route pattern
 * Uses exact matching or proper segment boundaries to avoid false positives
 * @param pathname - The request pathname
 * @param route - The route pattern to match against
 * @returns true if pathname matches the route pattern
 */
function matchesRoute(pathname: string, route: string): boolean {
  // Exact match
  if (pathname === route) return true;
  // Segment boundary match: route must be followed by / or end of string to avoid false positives
  // e.g., '/api/auth' matches '/api/auth/' or '/api/auth', but not '/api/authentication'
  if (pathname.startsWith(route)) {
    const nextChar = pathname[route.length];
    if (nextChar === '/' || nextChar === undefined) return true;
  }
  return false;
}

/**
 * Check if pathname matches any route in the array
 */
function matchesAnyRoute(pathname: string, routes: string[]): boolean {
  return routes.some(route => matchesRoute(pathname, route));
}

// Define public routes that don't require authentication
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
  '/marketplace'
];

// Define API routes that require authentication
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
  '/api/notifications'
];

// Define FM module routes (require authentication)
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
  '/fm/vendors'
];

// Define public marketplace routes (browsing allowed without login)
const publicMarketplaceRoutes = [
  '/souq',
  '/souq/catalog',
  '/souq/vendors',
  '/aqar',
  '/aqar/map',
  '/aqar/search',
  '/aqar/properties'
];

// Define protected marketplace actions (require login)
const protectedMarketplaceActions = [
  '/souq/cart',
  '/souq/checkout',
  '/souq/purchase',
  '/souq/my-orders',
  '/souq/my-rfqs',
  '/aqar/favorites',
  '/aqar/listings',
  '/aqar/my-properties',
  '/aqar/bookings'
];

/**
 * Middleware that enforces route-level access rules for public, protected, API, marketplace, FM, and admin routes.
 *
 * Applies these behaviors:
 * - Skips middleware for Next.js internals, static files, and obvious public assets.
 * - Allows listed public routes and public marketplace browsing routes without authentication.
 * - Supports both NextAuth.js sessions and legacy fixzit_auth JWT tokens.
 * - For /api/*:
 *   - Allows public API paths (auth, cms, help, assistant).
 *   - For protected API routes, requires authentication (NextAuth session or fixzit_auth cookie); on success attaches a JSON `x-user` header and continues; on failure responds 401.
 *   - For protected marketplace actions, requires authentication; on success attaches `x-user` and continues; on failure redirects to /login.
 * - For non-API protected routes:
 *   - If no authentication: redirects unauthenticated requests under /fm/ to /login; otherwise allows public access.
 *   - If authenticated: decodes user info (from NextAuth session or JWT payload), enforces admin RBAC for /admin/* (only SUPER_ADMIN, ADMIN, CORPORATE_ADMIN allowed), and:
 *     - Redirects root or /login to role-specific destinations (fm dashboard, properties, marketplace).
 *     - Attaches `x-user` header for FM routes and continues.
 *   - Invalid JWTs redirect /fm/, /aqar/, and /souq/ requests to /login; other paths continue.
 *
 * Side effects:
 * - May return NextResponse.next(), NextResponse.redirect(...) or NextResponse.json(...).
 * - Sets an `x-user` response header with the decoded user object for authenticated API/FM/marketplace requests.
 *
 * @param request - The incoming NextRequest to evaluate.
 * @returns A NextResponse that allows, redirects, or denies the request based on route rules and authentication.
 */
export default auth(async function middleware(request: NextRequest & { auth?: { user?: { id?: string; email?: string | null; name?: string | null; image?: string | null } } | null }) {
  const { pathname } = request.nextUrl;
  const session = request.auth;

  // Skip middleware for static files and API calls to Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public/') ||
    pathname.includes('.') ||
    pathname.startsWith('/api/_next/')
  ) {
    return NextResponse.next();
  }

  // Handle public routes (including public marketplace browsing)
  if (matchesAnyRoute(pathname, publicRoutes)) {
    return NextResponse.next();
  }

  // Handle public marketplace routes (browsing without login)
  if (matchesAnyRoute(pathname, publicMarketplaceRoutes)) {
    return NextResponse.next();
  }

  // Handle API routes - require authentication
  if (pathname.startsWith('/api/')) {
    // Allow public API routes
    if (matchesRoute(pathname, '/api/auth') ||
        matchesRoute(pathname, '/api/cms') ||
        matchesRoute(pathname, '/api/help') ||
        matchesRoute(pathname, '/api/assistant')) {
      return NextResponse.next();
    }

    // Check for authentication on protected API routes
    if (matchesAnyRoute(pathname, protectedApiRoutes)) {
      try {
        let user = null;

        // Check for NextAuth session first
        if (session?.user) {
          // Use session claims (enriched in auth.config.ts) - NO DB calls in Edge runtime
          user = {
            id: session.user.id || '',
            email: session.user.email || '',
            role: (session.user as SessionUser).role || 'USER',
            orgId: (session.user as SessionUser).orgId || null
          };
        } else {
          // Fall back to legacy JWT token with proper signature verification
          const authToken = request.cookies.get('fixzit_auth')?.value;
          if (!authToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }

          try {
            // Verify JWT signature and decode payload with security hardening
            const { payload } = await jwtVerify(authToken, JWT_SECRET, {
              algorithms: ['HS256'],
              clockTolerance: 5, // Allow 5 seconds clock skew
              // issuer: 'fixzit',      // Uncomment when issuer is set in token
              // audience: 'fixzit-app' // Uncomment when audience is set in token
            });
            user = {
              id: payload.id as string || '',
              email: payload.email as string || '',
              role: payload.role as string || 'USER',
              orgId: payload.orgId as string | null || null
            };
          } catch (_jwtError) {
            // JWT verification failed (expired, invalid signature, etc.)
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
          }
        }

        // Add user info to request headers for API routes
        const reqHeaders = new Headers(request.headers);
        reqHeaders.set('x-user', JSON.stringify(user));
        return NextResponse.next({ request: { headers: reqHeaders } });
      } catch (_error) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    return NextResponse.next();
  }

  // Handle protected routes
  try {
    // Check for NextAuth session first, then fall back to JWT token
    const authToken = request.cookies.get('fixzit_auth')?.value;
    const hasAuth = session?.user || authToken;

    if (!hasAuth) {
      // Redirect to login for unauthenticated users on protected routes
      if (
        matchesAnyRoute(pathname, fmRoutes) ||
        matchesAnyRoute(pathname, protectedMarketplaceActions)
      ) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      return NextResponse.next();
    }

    // Get user info from NextAuth session or JWT token
    let user = null;
    if (session?.user) {
      // Use session claims (enriched in auth.config.ts) - NO DB calls in Edge runtime
      user = {
        id: session.user.id || '',
        email: session.user.email || '',
        role: (session.user as SessionUser).role || 'USER',
        orgId: (session.user as SessionUser).orgId || null
      };
    } else if (authToken) {
      try {
        // Verify JWT signature and decode payload (secure method) with security hardening
        const { payload } = await jwtVerify(authToken, JWT_SECRET, {
          algorithms: ['HS256'],
          clockTolerance: 5, // Allow 5 seconds clock skew
          // issuer: 'fixzit',      // Uncomment when issuer is set in token
          // audience: 'fixzit-app' // Uncomment when audience is set in token
        });
        user = {
          id: payload.id as string || '',
          email: payload.email as string || '',
          role: payload.role as string || 'USER',
          orgId: payload.orgId as string | null || null
        };
      } catch (jwtError) {
        // JWT verification failed (expired, invalid signature, tampered token, etc.)
        console.error('JWT verification failed in middleware:', jwtError);
        
        // Clear invalid auth cookie
        const response = pathname.startsWith('/fm/') || pathname.startsWith('/aqar/') || pathname.startsWith('/souq/')
          ? NextResponse.redirect(new URL('/login', request.url))
          : NextResponse.next();
        
        // Attach cleared cookie to response
        response.cookies.set('fixzit_auth', '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 0, // Expire immediately
        });
        
        return response;
      }
    }

    if (!user) {
      return NextResponse.next();
    }

    // Protect admin UI with RBAC
    if (matchesRoute(pathname, '/admin')) {
      const adminRoles = new Set(['SUPER_ADMIN', 'ADMIN', 'CORPORATE_ADMIN']);
      if (!adminRoles.has(user.role)) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }

    // Redirect based on user role
    if (pathname === '/' || pathname === '/login') {
      // Redirect to appropriate dashboard based on role
      if (user.role === 'SUPER_ADMIN' || user.role === 'CORPORATE_ADMIN' || user.role === 'FM_MANAGER') {
        return NextResponse.redirect(new URL('/fm/dashboard', request.url));
      } else if (user.role === 'TENANT') {
        return NextResponse.redirect(new URL('/fm/properties', request.url));
      } else if (user.role === 'VENDOR') {
        return NextResponse.redirect(new URL('/fm/marketplace', request.url));
      } else {
        // Default for OAuth users without specific role
        return NextResponse.redirect(new URL('/fm/dashboard', request.url));
      }
    }

    // FM routes - check role-based access
    if (matchesAnyRoute(pathname, fmRoutes)) {
      const reqHeaders = new Headers(request.headers);
      reqHeaders.set('x-user', JSON.stringify(user));
      return NextResponse.next({ request: { headers: reqHeaders } });
    }

    // Protected marketplace actions - require auth and attach user
    if (matchesAnyRoute(pathname, protectedMarketplaceActions)) {
      const reqHeaders = new Headers(request.headers);
      reqHeaders.set('x-user', JSON.stringify(user));
      return NextResponse.next({ request: { headers: reqHeaders } });
    }

    return NextResponse.next();
  } catch (_error) {
    // Redirect to login for any errors
    if (pathname.startsWith('/fm/') || pathname.startsWith('/aqar/') || pathname.startsWith('/souq/')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
