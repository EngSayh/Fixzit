import { NextResponse } from 'next/server';

/**
 * Marketplace Security Headers Utility
 * 
 * Provides standardized security headers for marketplace API responses
 * as requested in PR comments to improve security posture
 */

export interface SecurityHeadersConfig {
  enableCORS?: boolean;
  corsOrigin?: string | string[];
  enableCSP?: boolean;
  customCSP?: string;
  enableHSTS?: boolean;
  enableFrameOptions?: boolean;
  enableContentTypeOptions?: boolean;
  enableReferrerPolicy?: boolean;
}

/**
 * Apply security headers to a NextResponse
 */
export function applySecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = {}
): NextResponse {
  // CORS Headers
  if (config.enableCORS !== false) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Correlation-ID, X-Request-Timestamp, X-Operation, X-User-ID, X-Tenant-ID');
    response.headers.set('Access-Control-Expose-Headers', 'X-Correlation-ID, X-Request-Timestamp, X-RateLimit-Limit, X-RateLimit-Remaining');
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  }
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

/**
 * Create a new response with security headers applied
 */
export function createSecureResponse(
  data: unknown,
  init?: ResponseInit,
  config?: SecurityHeadersConfig
): NextResponse {
  const response = NextResponse.json(data, init);
  return applySecurityHeaders(response, config);
}

/**
 * Handle OPTIONS preflight requests for CORS
 */
export function handleCORSPreflight(config?: SecurityHeadersConfig): NextResponse {
  const response = new NextResponse(null, { status: 200 });
  return applySecurityHeaders(response, config);
}
