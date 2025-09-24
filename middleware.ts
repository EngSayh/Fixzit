import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
  '/test-simple'
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
  '/api/invoices',
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
  '/souq/rfqs',
  '/souq/orders',
  '/souq/shipping',
  '/souq/reviews',
  '/aqar',
  '/aqar/map',
  '/aqar/search',
  '/aqar/properties',
  '/aqar/filters',
  '/aqar/trends',
  '/aqar/premium'
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
 * - For /api/*:
 *   - Allows public API paths (auth, cms, help, assistant).
 *   - For protected API routes, requires `fixzit_auth` cookie; on success attaches a JSON `x-user` header and continues; on failure responds 401.
 *   - For protected marketplace actions, requires `fixzit_auth` cookie; on success attaches `x-user` and continues; on failure redirects to /login.
 * - For non-API protected routes:
 *   - If no `fixzit_auth` cookie: redirects unauthenticated requests under /fm/ to /login; otherwise allows public access.
 *   - If a token is present: decodes JWT payload (id, email, role, tenantId), enforces admin RBAC for /admin/* (only SUPER_ADMIN, ADMIN, CORPORATE_ADMIN allowed), and:
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
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next();
  }

  // Handle public marketplace routes (browsing without login)
  if (publicMarketplaceRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return NextResponse.next();
  }

  // Handle API routes - require authentication
  if (pathname.startsWith('/api/')) {
    // Allow public API routes
    if (pathname.startsWith('/api/auth/') ||
        pathname.startsWith('/api/cms/') ||
        pathname.startsWith('/api/help/') ||
        pathname.startsWith('/api/assistant/')) {
      return NextResponse.next();
    }

    // Check for authentication on protected API routes
    if (protectedApiRoutes.some(route => pathname.startsWith(route))) {
      try {
        const authToken = request.cookies.get('fixzit_auth')?.value;
        if (!authToken) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = JSON.parse(atob(authToken.split('.')[1]));
        const user = {
          id: payload.id,
          email: payload.email,
          role: payload.role,
          tenantId: payload.tenantId
        };

        // Add user info to request headers for API routes
        const response = NextResponse.next();
        response.headers.set('x-user', JSON.stringify(user));
        return response;
      } catch (error) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Check for authentication on protected marketplace actions
    if (protectedMarketplaceActions.some(route => pathname === route || pathname.startsWith(route + '/'))) {
      try {
        const authToken = request.cookies.get('fixzit_auth')?.value;
        if (!authToken) {
          return NextResponse.redirect(new URL('/login', request.url));
        }

        const payload = JSON.parse(atob(authToken.split('.')[1]));
        const user = {
          id: payload.id,
          email: payload.email,
          role: payload.role,
          tenantId: payload.tenantId
        };

        // Add user context to protected marketplace actions
        const response = NextResponse.next();
        response.headers.set('x-user', JSON.stringify(user));
        return response;
      } catch (error) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
    }

    return NextResponse.next();
  }

  // Handle protected routes
  try {
    // Check for authentication token in cookie
    const authToken = request.cookies.get('fixzit_auth')?.value;
    if (!authToken) {
      // Redirect to login for unauthenticated users on protected routes
      if (pathname.startsWith('/fm/')) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      return NextResponse.next();
    }

    // Basic JWT verification without database
    try {
      const payload = JSON.parse(atob(authToken.split('.')[1]));
      const user = {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        tenantId: payload.tenantId
      };

      // Protect admin UI with RBAC
      if (pathname === '/admin' || pathname.startsWith('/admin/')) {
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
          return NextResponse.redirect(new URL('/fm/dashboard', request.url));
        }
      }

      // FM routes - check role-based access
      if (fmRoutes.some(route => pathname.startsWith(route))) {
        // Add user context to FM routes
        const response = NextResponse.next();
        response.headers.set('x-user', JSON.stringify(user));
        return response;
      }

      return NextResponse.next();
    } catch (jwtError) {
      // Invalid token - redirect to login
      if (pathname.startsWith('/fm/') || pathname.startsWith('/aqar/') || pathname.startsWith('/souq/')) {
        return NextResponse.redirect(new URL('/login', request.url));
      }
      return NextResponse.next();
    }
  } catch (error) {
    // Redirect to login for any errors
    if (pathname.startsWith('/fm/') || pathname.startsWith('/aqar/') || pathname.startsWith('/souq/')) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
  }
}

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
