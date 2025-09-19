import { NextRequest } from 'next/server';

// Simple in-memory rate limiter for demonstration
// In production, use Redis or a dedicated rate limiting service
class InMemoryRateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (now > data.resetTime) {
        this.requests.delete(key);
      }
    }
  }

  public checkLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    let requestData = this.requests.get(identifier);
    
    // Reset if window has expired
    if (!requestData || now > requestData.resetTime) {
      requestData = {
        count: 0,
        resetTime: now + this.windowMs
      };
      this.requests.set(identifier, requestData);
    }

    // Check if limit exceeded
    if (requestData.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: requestData.resetTime
      };
    }

    // Increment counter
    requestData.count++;
    
    return {
      allowed: true,
      remaining: this.maxRequests - requestData.count,
      resetTime: requestData.resetTime
    };
  }
}

// Create rate limiter instances for different endpoint types
const marketplaceRateLimiter = new InMemoryRateLimiter(60000, 100); // 100 requests per minute
const authRateLimiter = new InMemoryRateLimiter(60000, 20); // 20 requests per minute for auth endpoints

/**
 * Rate limiting middleware for marketplace endpoints
 */
export function checkMarketplaceRateLimit(request: NextRequest): { 
  allowed: boolean; 
  remaining: number; 
  resetTime: number;
  error?: string;
} {
  try {
    // Use IP address as identifier (could also use user ID if authenticated)
    const identifier = getClientIdentifier(request);
    const result = marketplaceRateLimiter.checkLimit(`marketplace:${identifier}`);
    
    if (!result.allowed) {
      return {
        ...result,
        error: 'Rate limit exceeded. Too many requests to marketplace endpoints.'
      };
    }
    
    return result;
  } catch (error) {
    console.error('Rate limiter error:', error);
    // Allow request on rate limiter error to avoid breaking functionality
    return {
      allowed: true,
      remaining: 50,
      resetTime: Date.now() + 60000
    };
  }
}

/**
 * Rate limiting middleware for authentication endpoints
 */
export function checkAuthRateLimit(request: NextRequest): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  error?: string;
} {
  try {
    const identifier = getClientIdentifier(request);
    const result = authRateLimiter.checkLimit(`auth:${identifier}`);
    
    if (!result.allowed) {
      return {
        ...result,
        error: 'Rate limit exceeded. Too many authentication attempts.'
      };
    }
    
    return result;
  } catch (error) {
    console.error('Auth rate limiter error:', error);
    // Be more restrictive on auth endpoint errors
    return {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + 60000,
      error: 'Rate limiting service temporarily unavailable'
    };
  }
}

/**
 * Extract client identifier for rate limiting
 * Priority: User ID > IP Address > Default
 */
function getClientIdentifier(request: NextRequest): string {
  // Try to get user ID from session cookie for authenticated requests
  const sessionCookie = request.cookies.get('fz_session')?.value;
  if (sessionCookie) {
    try {
      const tokenParts = sessionCookie.split('-');
      if (tokenParts.length >= 3) {
        return `user:${tokenParts[1]}:${tokenParts[2]}`;
      }
    } catch (error) {
      // Fall back to IP if session parsing fails
    }
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             request.headers.get('x-real-ip') || 
             'unknown';
             
  return `ip:${ip}`;
}

/**
 * Convert rate limit result to HTTP headers
 */
export function getRateLimitHeaders(result: { remaining: number; resetTime: number }): Record<string, string> {
  return {
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
    'X-RateLimit-Limit': '100'
  };
}