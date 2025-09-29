/**
 * Security headers configuration for marketplace APIs
 */

export interface SecurityConfig {
  cors?: {
    origin?: string | string[] | boolean;
    methods?: string[];
    allowedHeaders?: string[];
    credentials?: boolean;
  };
  csp?: {
    directives?: Record<string, string | string[]>;
  };
  hsts?: {
    maxAge?: number;
    includeSubDomains?: boolean;
    preload?: boolean;
  };
}

/**
 * Default security configuration
 */
const defaultSecurityConfig: SecurityConfig = {
  cors: {
    origin: process.env.NODE_ENV === 'development' ? true : false,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization', 
      'X-Tenant-ID',
      'X-Correlation-ID',
      'Accept-Language'
    ],
    credentials: true
  },
  csp: {
    directives: {
      'default-src': "'self'",
      'script-src': "'self' 'unsafe-inline' 'unsafe-eval'",
      'style-src': "'self' 'unsafe-inline'",
      'img-src': "'self' data: https:",
      'font-src': "'self' data:",
      'connect-src': "'self'",
      'frame-ancestors': "'none'",
    }
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
};

/**
 * Apply security headers to a response
 */
export function applySecurityHeaders(
  response: Response, 
  config: SecurityConfig = defaultSecurityConfig
): Response {
  const headers = new Headers(response.headers);

  // CORS headers
  if (config.cors) {
    const { origin, methods, allowedHeaders, credentials } = config.cors;
    
    if (origin === true) {
      if (credentials) {
        throw new Error(
          'Invalid CORS configuration: credentials=true cannot be combined with a wildcard origin. Provide an explicit origin string or array.'
        );
      }
      headers.set('Access-Control-Allow-Origin', '*');
    } else if (typeof origin === 'string') {
      headers.set('Access-Control-Allow-Origin', origin);
    } else if (Array.isArray(origin)) {
      // In a real implementation, you'd check the request origin
      headers.set('Access-Control-Allow-Origin', origin[0]);
    }

    if (methods?.length) {
      headers.set('Access-Control-Allow-Methods', methods.join(', '));
    }

    if (allowedHeaders?.length) {
      headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    }

    if (credentials && !(typeof origin === 'string' || Array.isArray(origin))) {
      throw new Error(
        'Invalid CORS configuration: credentials=true requires an explicit origin string or array.'
      );
    }

    if (credentials) {
      headers.set('Access-Control-Allow-Credentials', 'true');
    }
    }

    if (credentials && !(typeof origin === 'string' || Array.isArray(origin))) {
      throw new Error(
        'Invalid CORS configuration: credentials=true requires an explicit origin string or array.'
      );
    }

    if (credentials) {
      headers.set('Access-Control-Allow-Credentials', 'true');
    }
  }

  // Content Security Policy
  if (config.csp?.directives) {
    const cspValue = Object.entries(config.csp.directives)
      .map(([directive, value]) => 
        `${directive} ${Array.isArray(value) ? value.join(' ') : value}`
      )
      .join('; ');
    headers.set('Content-Security-Policy', cspValue);
  }

  // HSTS (only in production HTTPS)
  if (config.hsts && process.env.NODE_ENV === 'production') {
    const { maxAge, includeSubDomains, preload } = config.hsts;
    let hstsValue = `max-age=${maxAge}`;
    if (includeSubDomains) hstsValue += '; includeSubDomains';
    if (preload) hstsValue += '; preload';
    headers.set('Strict-Transport-Security', hstsValue);
  }

  // Additional security headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * Handle CORS preflight requests
 */
export function handleCORSPreflight(
  request: Request,
  config: SecurityConfig = defaultSecurityConfig
): Response {
  const headers = new Headers();

  if (config.cors) {
    const { origin, methods, allowedHeaders, credentials } = config.cors;
    
    const requestOrigin = request.headers.get('Origin');
    
    // Check origin
    if (origin === true || origin === requestOrigin) {
      headers.set('Access-Control-Allow-Origin', requestOrigin || '*');
    } else if (Array.isArray(origin) && requestOrigin && origin.includes(requestOrigin)) {
      headers.set('Access-Control-Allow-Origin', requestOrigin);
    }

    if (methods?.length) {
      headers.set('Access-Control-Allow-Methods', methods.join(', '));
    }

    if (allowedHeaders?.length) {
      headers.set('Access-Control-Allow-Headers', allowedHeaders.join(', '));
    }

    if (credentials) {
      headers.set('Access-Control-Allow-Credentials', 'true');
    }
  }

  headers.set('Access-Control-Max-Age', '86400'); // 24 hours

  return new Response(null, {
    status: 204,
    headers
  });
}

/**
 * Security middleware for marketplace routes
 */
export function securityMiddleware(config?: SecurityConfig) {
  return function(request: Request): Response | null {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return handleCORSPreflight(request, config);
    }

    // Continue with normal processing
    return null;
  };
}

/**
 * Create a secure response with proper headers
 */
export function createSecureResponse(
  body: any,
  init?: ResponseInit,
  config?: SecurityConfig
): Response {
  const response = new Response(
    typeof body === 'string' ? body : JSON.stringify(body),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers
      },
      ...init
    }
  );

  return applySecurityHeaders(response, config);
}