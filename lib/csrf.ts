/**
 * @module lib/csrf
 * @description Client-side CSRF token utility for state-changing requests.
 *
 * Provides cryptographically secure CSRF token generation and cookie-based
 * token retrieval. Automatically includes tokens in mutation requests.
 *
 * @features
 * - Cryptographically secure token generation (crypto.randomUUID or Uint8Array)
 * - Cookie-based token storage (csrf-token cookie)
 * - Client-side and server-side support (environment detection)
 * - Fallback for older environments (Math.random if crypto unavailable)
 * - URL-decoded cookie values (handles special characters)
 *
 * @usage
 * ```typescript
 * import { generateCSRFToken, getCSRFToken } from '@/lib/csrf';
 * 
 * // Generate new token
 * const token = generateCSRFToken(); // '550e8400-e29b-41d4-a716-446655440000'
 * 
 * // Retrieve from cookies
 * const csrfToken = getCSRFToken(); // null if not set
 * 
 * // Include in fetch
 * await fetch('/api/resource', {
 *   method: 'POST',
 *   headers: { 'X-CSRF-Token': csrfToken },
 * });
 * ```
 */

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older environments
  const array = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Server-side or Node.js environment
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get the current CSRF token from cookies
 */
export function getCSRFToken(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrf-token') {
      return decodeURIComponent(value);
    }
  }
  
  return null;
}

/**
 * Set the CSRF token cookie
 */
export function setCSRFToken(token: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  
  const secure = window.location.protocol === 'https:';
  const sameSite = 'Lax';
  const maxAge = 86400; // 24 hours
  
  document.cookie = `csrf-token=${encodeURIComponent(token)}; Path=/; SameSite=${sameSite}; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

/**
 * Initialize CSRF token if not present
 */
export function initCSRFToken(): string {
  let token = getCSRFToken();
  
  if (!token) {
    token = generateCSRFToken();
    setCSRFToken(token);
  }
  
  return token;
}

/**
 * Create headers object with CSRF token for fetch requests
 */
export function getCSRFHeaders(): Record<string, string> {
  const token = getCSRFToken();
  
  if (token) {
    return {
      'X-CSRF-Token': token,
    };
  }
  
  return {};
}

/**
 * Enhanced fetch wrapper that automatically includes CSRF tokens
 * for state-changing requests (POST, PUT, PATCH, DELETE)
 */
export async function csrfFetch(
  url: string | URL,
  options: RequestInit = {}
): Promise<Response> {
  const method = (options.method || 'GET').toUpperCase();
  const needsCSRF = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  
  if (needsCSRF) {
    const csrfHeaders = getCSRFHeaders();
    options.headers = {
      ...options.headers,
      ...csrfHeaders,
    };
  }
  
  return fetch(url, options);
}

/**
 * Validate CSRF token on the server side
 * @param headerToken - Token from X-CSRF-Token header
 * @param cookieToken - Token from csrf-token cookie
 */
export function validateCSRFTokens(
  headerToken: string | null,
  cookieToken: string | null
): boolean {
  if (!headerToken || !cookieToken) {
    return false;
  }
  
  // Constant-time comparison to prevent timing attacks
  if (headerToken.length !== cookieToken.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < headerToken.length; i++) {
    result |= headerToken.charCodeAt(i) ^ cookieToken.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Express/Next.js middleware helper to extract CSRF tokens from request
 */
export function extractCSRFFromRequest(request: {
  headers: { get(name: string): string | null };
  cookies: { get(name: string): { value: string } | undefined };
}): { headerToken: string | null; cookieToken: string | null } {
  const headerToken = 
    request.headers.get('X-CSRF-Token') || 
    request.headers.get('x-csrf-token');
  
  const cookieToken = request.cookies.get('csrf-token')?.value || null;
  
  return { headerToken, cookieToken };
}
