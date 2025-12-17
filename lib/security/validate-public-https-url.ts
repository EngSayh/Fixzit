/**
 * SSRF Protection: Validate Public HTTPS URLs
 * 
 * Prevents Server-Side Request Forgery by:
 * - Enforcing HTTPS-only
 * - Blocking localhost/loopback
 * - Blocking private IP ranges (10.*, 192.168.*, 172.16-31.*)
 * - Blocking link-local (169.254.* - AWS metadata)
 * - Blocking internal TLDs (.local, .internal)
 * 
 * @module lib/security/validate-public-https-url
 */

export class URLValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'URLValidationError';
  }
}

/**
 * Validates that a URL is a public HTTPS URL safe for server-side fetching
 * @throws {URLValidationError} if URL is unsafe
 */
export function validatePublicHttpsUrl(urlString: string): URL {
  let url: URL;
  
  // Parse URL
  try {
    url = new URL(urlString);
  } catch {
    throw new URLValidationError('Invalid URL format');
  }

  // Enforce HTTPS
  if (url.protocol !== 'https:') {
    throw new URLValidationError('Only HTTPS URLs are allowed');
  }

  const hostname = url.hostname.toLowerCase();

  // Block localhost variants (including IPv6 brackets)
  const localhostPatterns = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '::',
    '[::1]',
    '[::]',
  ];
  
  if (localhostPatterns.includes(hostname) || hostname.startsWith('[::')) {
    throw new URLValidationError('Localhost URLs are not allowed');
  }

  // Block private IP ranges
  if (isPrivateIP(hostname)) {
    throw new URLValidationError('Private IP addresses are not allowed');
  }

  // Block link-local (AWS metadata endpoint)
  if (hostname.startsWith('169.254.')) {
    throw new URLValidationError('Link-local addresses are not allowed');
  }

  // Block internal TLDs
  if (hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new URLValidationError('Internal TLDs are not allowed');
  }

  // Additional check: disallow IP address hostnames (prefer domains)
  // This is optional but recommended for production
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    throw new URLValidationError('Direct IP addresses are discouraged. Use domain names.');
  }

  return url;
}

/**
 * Check if hostname is a private IP address
 */
function isPrivateIP(hostname: string): boolean {
  // IPv4 private ranges:
  // 10.0.0.0/8
  // 172.16.0.0/12
  // 192.168.0.0/16
  
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);
  
  if (!match) {
    return false; // Not an IPv4 address
  }

  const [, a, b, c, d] = match.map(Number);
  
  // Validate octets
  if (a > 255 || b > 255 || c > 255 || d > 255) {
    return false;
  }

  // Check private ranges
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16

  return false;
}

/**
 * Safe wrapper that returns validation result without throwing
 */
export function isValidPublicHttpsUrl(urlString: string): boolean {
  try {
    validatePublicHttpsUrl(urlString);
    return true;
  } catch {
    return false;
  }
}
