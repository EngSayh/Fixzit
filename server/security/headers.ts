import { NextRequest, NextResponse } from 'next/server';

/**
 * Security headers middleware to add common security headers to API responses
 */
export function withSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy for API endpoints
  response.headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
  
  // Hide server information
  response.headers.set('Server', 'Fixzit-API');
  
  // Prevent caching of sensitive data
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  return response;
}

/**
 * CORS configuration for API endpoints
 */
export function withCORS(request: NextRequest, response: NextResponse): NextResponse {
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
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  } else if (process.env.NODE_ENV === 'development') {
    // In development, use first allowed origin instead of '*' to avoid CORS violation
    // when Access-Control-Allow-Credentials is 'true'
    response.headers.set('Access-Control-Allow-Origin', 'http://localhost:3000');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours

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
 * Hardened IP extraction with security-first priority order
 * 
 * SECURITY: Uses LAST IP from X-Forwarded-For (appended by trusted proxy)
 * to prevent header spoofing attacks where client controls first IP.
 * 
 * Priority order:
 * 1. CF-Connecting-IP (Cloudflare) - most trustworthy
 * 2. X-Forwarded-For LAST IP - appended by our infrastructure
 * 3. X-Real-IP - only if TRUST_X_REAL_IP=true
 * 4. Fallback to 'unknown'
 */
export function getClientIP(request: NextRequest): string {
  // 1) Cloudflare's CF-Connecting-IP is most trustworthy
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp && cfIp.trim()) return cfIp.trim();
  
  // 2) X-Forwarded-For: take LAST IP (appended by our trusted proxy)
  // SECURITY: Never use [0] as that's client-controlled
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded && forwarded.trim()) {
    const ips = forwarded.split(',').map(ip => ip.trim()).filter(ip => ip);
    if (ips.length) return ips[ips.length - 1]; // LAST IP is from our proxy
  }
  
  // 3) X-Real-IP only if explicitly trusted (client-settable unless infra strips it)
  if (process.env.TRUST_X_REAL_IP === 'true') {
    const realIP = request.headers.get('x-real-ip');
    if (realIP && realIP.trim()) return realIP.trim();
  }
  
  // 4) Fallback
  return 'unknown';
}

/**
 * Enhanced security response helper
 */
export function createSecureResponse(data: unknown, status: number = 200, request?: NextRequest): NextResponse {
  const response = NextResponse.json(data, { status });
  
  if (request) {
    withCORS(request, response);
  }
  
  return withSecurityHeaders(response);
}