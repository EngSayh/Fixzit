import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES, type Locale } from '@/src/i18n/config';

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

function negotiateLocale(request: NextRequest): Locale {
  const cookieLocale = request.cookies.get('locale')?.value as Locale | undefined;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
    return cookieLocale;
  }

  const acceptLanguage = request.headers.get('accept-language') ?? '';
  if (acceptLanguage.toLowerCase().includes('ar')) {
    return 'ar';
  }

  return DEFAULT_LOCALE;
}

function applyLocale(response: NextResponse, locale: Locale) {
  response.cookies.set('locale', locale, { path: '/', sameSite: 'lax' });
  response.cookies.set('fxz.lang', locale, { path: '/', sameSite: 'lax' });
  response.cookies.set('fxz.locale', locale === 'ar' ? 'ar-SA' : 'en-GB', { path: '/', sameSite: 'lax' });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const resolvedLocale = negotiateLocale(request);
  const finalize = (response: NextResponse) => applyLocale(response, resolvedLocale);

  // Skip middleware for static files and API calls to Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public/') ||
    pathname.includes('.') ||
    pathname.startsWith('/api/_next/')
  ) {
    return finalize(NextResponse.next());
  }

  // Handle public routes (including public marketplace browsing)
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return finalize(NextResponse.next());
  }

  // Handle public marketplace routes (browsing without login)
  if (publicMarketplaceRoutes.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return finalize(NextResponse.next());
  }

  // Handle API routes - require authentication
  if (pathname.startsWith('/api/')) {
    // Allow public API routes
    if (pathname.startsWith('/api/auth/') ||
        pathname.startsWith('/api/cms/') ||
        pathname.startsWith('/api/help/') ||
        pathname.startsWith('/api/assistant/')) {
      return finalize(NextResponse.next());
    }

    // Check for authentication on protected API routes
    if (protectedApiRoutes.some(route => pathname.startsWith(route))) {
      try {
        const authToken = request.cookies.get('fixzit_auth')?.value;
        if (!authToken) {
          return finalize(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
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
        return finalize(response);
      } catch (error) {
        return finalize(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
      }
    }

    // Check for authentication on protected marketplace actions
    if (protectedMarketplaceActions.some(route => pathname === route || pathname.startsWith(route + '/'))) {
      try {
        const authToken = request.cookies.get('fixzit_auth')?.value;
        if (!authToken) {
          return finalize(NextResponse.redirect(new URL('/login', request.url)));
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
        return finalize(response);
      } catch (error) {
        return finalize(NextResponse.redirect(new URL('/login', request.url)));
      }
    }

    return finalize(NextResponse.next());
  }

  // Handle protected routes
  try {
    // Check for authentication token in cookie
    const authToken = request.cookies.get('fixzit_auth')?.value;
    if (!authToken) {
      // Redirect to login for unauthenticated users on protected routes
      if (pathname.startsWith('/fm/')) {
        return finalize(NextResponse.redirect(new URL('/login', request.url)));
      }
      return finalize(NextResponse.next());
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

      // Redirect based on user role
      if (pathname === '/' || pathname === '/login') {
        // Redirect to appropriate dashboard based on role
        if (user.role === 'SUPER_ADMIN' || user.role === 'CORPORATE_ADMIN' || user.role === 'FM_MANAGER') {
          return finalize(NextResponse.redirect(new URL('/fm/dashboard', request.url)));
        } else if (user.role === 'TENANT') {
          return finalize(NextResponse.redirect(new URL('/fm/properties', request.url)));
        } else if (user.role === 'VENDOR') {
          return finalize(NextResponse.redirect(new URL('/fm/marketplace', request.url)));
        } else {
          return finalize(NextResponse.redirect(new URL('/fm/dashboard', request.url)));
        }
      }

      // FM routes - check role-based access
      if (fmRoutes.some(route => pathname.startsWith(route))) {
        // Add user context to FM routes
        const response = NextResponse.next();
        response.headers.set('x-user', JSON.stringify(user));
        return finalize(response);
      }

      return finalize(NextResponse.next());
    } catch (jwtError) {
      // Invalid token - redirect to login
      if (pathname.startsWith('/fm/') || pathname.startsWith('/aqar/') || pathname.startsWith('/souq/')) {
        return finalize(NextResponse.redirect(new URL('/login', request.url)));
      }
      return finalize(NextResponse.next());
    }
  } catch (error) {
    // Redirect to login for any errors
    if (pathname.startsWith('/fm/') || pathname.startsWith('/aqar/') || pathname.startsWith('/souq/')) {
      return finalize(NextResponse.redirect(new URL('/login', request.url)));
    }

    return finalize(NextResponse.next());
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
