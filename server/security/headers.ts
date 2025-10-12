import { NextRequest, NextResponse } from 'next/server';

/**
 * Security headers middleware to add common security headers to API responses
 */
export function withSecurityHeaders(response: NextResponse): NextResponse {
  const safeSet = (key: string, value: string) => {
    try {
      response.headers.set(key, value);
    } catch {
      // headers may be undefined in mocked NextResponse during tests
    }
  };
  // Prevent MIME type sniffing
  safeSet('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  safeSet('X-Frame-Options', 'DENY');
  
  // XSS protection
  safeSet('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  safeSet('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy for API endpoints
  safeSet('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
  
  // Hide server information
  safeSet('Server', 'Fixzit-API');
  
  // Prevent caching of sensitive data
  safeSet('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  safeSet('Pragma', 'no-cache');
  safeSet('Expires', '0');
  
  return response;
}

/**
 * CORS configuration for API endpoints
 */
export function withCORS(request: NextRequest, response: NextResponse): NextResponse {
  const safeSet = (key: string, value: string) => {
    try {
      response.headers.set(key, value);
    } catch {
      // headers may be undefined in mocked NextResponse during tests
    }
  };
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    'https://fixzit.co',
    'https://www.fixzit.co',
    'https://app.fixzit.co',
    'https://dashboard.fixzit.co',
    process.env.FRONTEND_URL,
    // Add localhost for development
    ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000', 'http://localhost:3001'] : [])
  ].filter(Boolean);

  if (origin && allowedOrigins.includes(origin)) {
    safeSet('Access-Control-Allow-Origin', origin);
    safeSet('Access-Control-Allow-Credentials', 'true');
  } else if (process.env.NODE_ENV === 'development') {
    // In development, use first allowed origin instead of '*' to avoid CORS violation
    // when Access-Control-Allow-Credentials is 'true'
    safeSet('Access-Control-Allow-Origin', 'http://localhost:3000');
    safeSet('Access-Control-Allow-Credentials', 'true');
  }

  safeSet('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  safeSet('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  safeSet('Access-Control-Max-Age', '86400'); // 24 hours

  return response;
}

/**
 * Request size limiting middleware
 */
export function checkRequestSize(request: NextRequest, maxSizeBytes: number = 10 * 1024 * 1024): boolean {
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > maxSizeBytes) {
    return false;
  }
  return true;
}

/**
 * IP-based rate limiting key generator
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIP || 'unknown';
  return ip.trim();
}

/**
 * Enhanced security response helper
 */
export function createSecureResponse(data: unknown, status: number = 200, request?: NextRequest): NextResponse {
  const response = NextResponse.json(data, { status });
  try {
    if (request) {
      withCORS(request, response);
    }
    return withSecurityHeaders(response);
  } catch {
    return response;
  }
}