import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateRequest, hasPermission } from './lib/edge-auth-middleware';
import type { EdgeAuthenticatedUser } from './lib/edge-auth-middleware';

// Production-ready RBAC enforcement with route protection
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and public assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/assets') ||
    pathname.startsWith('/public')
  ) {
    return NextResponse.next();
  }

  // Define public paths that don't require authentication
  const isPublicPath = 
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/verify-email") ||
    pathname.startsWith("/about") ||
    pathname.startsWith("/contact") ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/test-layout") ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/signup") ||
    pathname.startsWith("/api/auth/forgot-password") ||
    pathname.startsWith("/api/auth/reset-password") ||
    pathname.startsWith("/api/auth/verify-email") ||
    pathname.startsWith("/api/db-test") ||
    pathname.startsWith("/api/health");

  // Handle API routes differently
  if (pathname.startsWith('/api')) {
    return handleApiRoute(request, isPublicPath);
  }

  // Handle app routes with RBAC
  return handleAppRoute(request, isPublicPath);
}

async function handleApiRoute(request: NextRequest, isPublicPath: boolean): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  
  // Skip auth for public API routes
  if (isPublicPath) {
    return NextResponse.next();
  }

  // Authenticate API requests
  const authResult = await authenticateRequest(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { 
        success: false, 
        error: { 
          message: authResult.error,
          code: 'UNAUTHORIZED',
          timestamp: new Date().toISOString()
        } 
      },
      { status: authResult.statusCode }
    );
  }

  const user = authResult as EdgeAuthenticatedUser;
  
  // Check API permissions based on route and method
  const requiredPermissions = getApiPermissions(pathname, request.method);
  
  if (requiredPermissions.length > 0) {
    const hasRequiredPermission = requiredPermissions.some(permission => 
      hasPermission(user, permission)
    );
    
    if (!hasRequiredPermission) {
      return NextResponse.json(
        { 
          success: false, 
          error: { 
            message: 'Insufficient permissions for this operation',
            code: 'FORBIDDEN',
            timestamp: new Date().toISOString(),
            required_permissions: requiredPermissions
          } 
        },
        { status: 403 }
      );
    }
  }

  // Add user context to request headers for API handlers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', user.id);
  requestHeaders.set('x-user-role', user.roles?.[0]?.name || 'guest');
  requestHeaders.set('x-user-org', user.organizationId || '');
  requestHeaders.set('x-user-permissions', JSON.stringify(user.permissions));

  return NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });
}

async function handleAppRoute(request: NextRequest, isPublicPath: boolean): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  
  // Check for session cookies with fallback options
  const token = request.cookies.get("fz_session")?.value ||
                request.cookies.get("session")?.value ||
                request.cookies.get("auth_token")?.value ||
                request.cookies.get("next-auth.session-token")?.value ||
                request.cookies.get("fixzit_session")?.value;
  
  // Redirect to login if accessing protected route without token
  if (!isPublicPath && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", encodeURIComponent(pathname));
    return NextResponse.redirect(loginUrl);
  }
  
  // Redirect to dashboard if accessing login with valid token
  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If public path, allow access
  if (isPublicPath) {
    const response = NextResponse.next();
    addSecurityHeaders(response);
    return response;
  }

  // Authenticate user for protected routes
  const authResult = await authenticateRequest(request);
  
  if ('error' in authResult) {
    // Redirect to login with error message
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", encodeURIComponent(pathname));
    loginUrl.searchParams.set("error", "session_expired");
    return NextResponse.redirect(loginUrl);
  }

  const user = authResult as EdgeAuthenticatedUser;
  
  // Check role-based route access
  const userRole = user.roles?.[0]?.name || 'guest';
  const hasRouteAccess = checkRouteAccess(pathname, userRole);
  
  if (!hasRouteAccess) {
    // Redirect to dashboard with access denied error
    const dashboardUrl = new URL("/dashboard", request.url);
    dashboardUrl.searchParams.set("error", "access_denied");
    dashboardUrl.searchParams.set("message", "You do not have permission to access this page");
    return NextResponse.redirect(dashboardUrl);
  }

  // Check specific permissions for the route
  const requiredPermissions = getRoutePermissions(pathname);
  
  if (requiredPermissions.length > 0) {
    const hasRequiredPermission = requiredPermissions.some(permission => 
      hasPermission(user, permission)
    );
    
    if (!hasRequiredPermission) {
      // Redirect to dashboard with permission error
      const dashboardUrl = new URL("/dashboard", request.url);
      dashboardUrl.searchParams.set("error", "insufficient_permissions");
      dashboardUrl.searchParams.set("message", "You do not have the required permissions for this page");
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // Add user context to request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', user.id);
  requestHeaders.set('x-user-role', userRole);
  requestHeaders.set('x-user-org', user.organizationId || '');
  requestHeaders.set('x-user-permissions', JSON.stringify(user.permissions));

  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });

  addSecurityHeaders(response);
  return response;
}

function checkRouteAccess(pathname: string, userRole: string): boolean {
  // Role-based route restrictions
  const roleRestrictions: Record<string, string[]> = {
    'tenant': [
      '/dashboard',
      '/my-unit',
      '/my-requests',
      '/my-payments',
      '/profile',
      '/settings'
    ],
    'property_manager': [
      '/dashboard',
      '/work-orders',
      '/properties',
      '/tenants',
      '/maintenance',
      '/reports',
      '/profile',
      '/settings'
    ],
    'finance_manager': [
      '/dashboard',
      '/finance',
      '/properties',
      '/tenants',
      '/reports',
      '/profile',
      '/settings'
    ],
    'admin': [
      '/dashboard',
      '/work-orders',
      '/properties',
      '/finance',
      '/crm',
      '/marketplace',
      '/hr',
      '/support',
      '/compliance',
      '/reports',
      '/profile',
      '/settings'
    ],
    'super_admin': ['*']
  };

  const allowedRoutes = roleRestrictions[userRole] || ['/dashboard'];
  
  // Super admin has access to everything
  if (allowedRoutes.includes('*')) {
    return true;
  }
  
  return allowedRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
}

function getRoutePermissions(pathname: string): string[] {
  // Route permission mapping
  const routePermissions: Record<string, string[]> = {
    '/dashboard': ['dashboard.read'],
    '/work-orders': ['work-orders.read'],
    '/work-orders/create': ['work-orders.create'],
    '/work-orders/edit': ['work-orders.update'],
    '/properties': ['properties.read'],
    '/properties/create': ['properties.create'],
    '/finance': ['finance.read'],
    '/finance/invoices': ['finance.invoices.read'],
    '/crm': ['crm.read'],
    '/marketplace': ['marketplace.read'],
    '/hr': ['hr.read'],
    '/admin': ['admin.read'],
    '/system': ['system.read'],
    '/reports': ['reports.read'],
    '/compliance': ['compliance.read'],
    '/support': ['support.read']
  };
  
  // Find the most specific route match
  const routes = Object.keys(routePermissions).sort((a, b) => b.length - a.length);
  
  for (const route of routes) {
    if (pathname === route || pathname.startsWith(route + '/')) {
      return routePermissions[route];
    }
  }
  
  return [];
}

function getApiPermissions(pathname: string, method: string): string[] {
  // API endpoint permission mapping
  const apiPermissions: Record<string, Record<string, string[]>> = {
    '/api/work-orders': {
      'GET': ['work-orders.read'],
      'POST': ['work-orders.create'],
      'PUT': ['work-orders.update'],
      'DELETE': ['work-orders.delete']
    },
    '/api/properties': {
      'GET': ['properties.read'],
      'POST': ['properties.create'],
      'PUT': ['properties.update'],
      'DELETE': ['properties.delete']
    },
    '/api/finance': {
      'GET': ['finance.read'],
      'POST': ['finance.create'],
      'PUT': ['finance.update'],
      'DELETE': ['finance.delete']
    },
    '/api/users': {
      'GET': ['users.read'],
      'POST': ['users.create'],
      'PUT': ['users.update'],
      'DELETE': ['users.delete']
    },
    '/api/system': {
      'GET': ['system.read'],
      'POST': ['system.create'],
      'PUT': ['system.update'],
      'DELETE': ['system.delete']
    },
    '/api/audit': {
      'GET': ['audit.read'],
      'POST': ['audit.create']
    }
  };

  // Find matching API route
  for (const route of Object.keys(apiPermissions)) {
    if (pathname.startsWith(route)) {
      return apiPermissions[route][method] || [];
    }
  }

  return [];
}

function addSecurityHeaders(response: NextResponse): void {
  // Enhanced security headers for production
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'"
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};