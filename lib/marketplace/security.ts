import { NextResponse } from "next/server";

/**
 * Marketplace Security Headers Utility
 * Provides standardized security headers for marketplace API responses
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
 * Default security headers configuration for marketplace APIs
 */
const DEFAULT_SECURITY_CONFIG: Required<SecurityHeadersConfig> = {
  enableCORS: true,
  corsOrigin: "*", // Will be overridden by environment-specific values
  enableCSP: true,
  customCSP:
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https:; font-src 'self' https:;",
  enableHSTS: true,
  enableFrameOptions: true,
  enableContentTypeOptions: true,
  enableReferrerPolicy: true,
};

/**
 * Get CORS origins from environment or use defaults
 */
function getCORSOrigins(): string | string[] {
  const envOrigins = process.env.CORS_ORIGINS || process.env.ALLOWED_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(",").map((origin) => origin.trim());
  }
  if (process.env.NODE_ENV === "development") {
    return [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://localhost:3000",
      "https://localhost:3001",
    ];
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (baseUrl) {
    return [baseUrl];
  }
  return "*"; // Fallback, should be avoided in production
}

/**
 * Apply security headers to a NextResponse
 */
export function applySecurityHeaders(
  response: NextResponse,
  config: SecurityHeadersConfig = {},
): NextResponse {
  const finalConfig = { ...DEFAULT_SECURITY_CONFIG, ...config };
  // CORS Headers
  if (finalConfig.enableCORS) {
    const origins =
      finalConfig.corsOrigin === "*"
        ? getCORSOrigins()
        : finalConfig.corsOrigin;
    if (Array.isArray(origins)) {
      response.headers.set(
        "Access-Control-Allow-Origin",
        origins.length === 1 ? origins[0] : "*",
      );
    } else {
      response.headers.set("Access-Control-Allow-Origin", origins);
    }
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS, PATCH",
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, X-Correlation-ID, X-Request-Timestamp, X-Operation, X-User-ID, X-Tenant-ID",
    );
    response.headers.set(
      "Access-Control-Expose-Headers",
      "X-Correlation-ID, X-Request-Timestamp, X-RateLimit-Limit, X-RateLimit-Remaining",
    );
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours
  }
  // Content Security Policy
  if (finalConfig.enableCSP) {
    response.headers.set("Content-Security-Policy", finalConfig.customCSP);
  }
  // HTTP Strict Transport Security (HSTS)
  if (finalConfig.enableHSTS && process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
  }
  // X-Frame-Options (prevent clickjacking)
  if (finalConfig.enableFrameOptions) {
    response.headers.set("X-Frame-Options", "DENY");
  }
  // X-Content-Type-Options (prevent MIME sniffing)
  if (finalConfig.enableContentTypeOptions) {
    response.headers.set("X-Content-Type-Options", "nosniff");
  }
  // Referrer Policy
  if (finalConfig.enableReferrerPolicy) {
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  }
  // Additional security headers
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Download-Options", "noopen");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  // Cache control for sensitive data
  response.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, private",
  );
  response.headers.set("Pragma", "no-cache");
  return response;
}

/**
 * Create a new response with security headers applied
 */
export function createSecureResponse(
  data: unknown,
  init?: globalThis.ResponseInit,
  config?: SecurityHeadersConfig,
): NextResponse {
  const response = NextResponse.json(data, init);
  return applySecurityHeaders(response, config);
}

/**
 * Handle OPTIONS preflight requests for CORS
 */
export function handleCORSPreflight(
  config?: SecurityHeadersConfig,
): NextResponse {
  const response = new NextResponse(null, { status: 200 });
  return applySecurityHeaders(response, config);
}

/**
 * Middleware-style function to wrap API route handlers with security headers
 */
export function withSecurityHeaders<T extends unknown[]>(
  handler: (..._args: T) => Promise<NextResponse> | NextResponse,
  config?: SecurityHeadersConfig,
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      const response = await handler(...args);
      return applySecurityHeaders(response, config);
    } catch {
      // Even error responses should have security headers
      const errorResponse = NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
      return applySecurityHeaders(errorResponse, config);
    }
  };
}
