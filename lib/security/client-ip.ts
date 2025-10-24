/**
 * Secure Client IP Extraction Utility
 * 
 * Provides safe methods to extract client IP addresses from HTTP requests
 * while preventing spoofing attacks via x-forwarded-for header manipulation.
 * 
 * @module lib/security/client-ip
 */

import { NextRequest } from 'next/server';
import { isIP } from 'net';

/**
 * Extract client IP address from request headers
 * 
 * Security considerations:
 * - x-forwarded-for can be spoofed by clients
 * - cf-connecting-ip is Cloudflare's trusted header (highest trust)
 * - Last IP in x-forwarded-for is added by our reverse proxy (trusted)
 * - x-real-ip requires explicit trust via TRUST_X_REAL_IP env variable
 * 
 * Priority order:
 * 1. cf-connecting-ip (Cloudflare) - Most trustworthy when behind Cloudflare
 * 2. Last IP in x-forwarded-for (proxy-appended) - Trusted reverse proxy
 * 3. x-real-ip (Nginx, most reverse proxies) - Only when TRUST_X_REAL_IP='true'
 * 4. 'unknown' (fallback) - Direct connections or missing headers
 * 
 * @param request - Next.js request object
 * @returns Client IP address or 'unknown'
 * 
 * @example
 * ```typescript
 * import { getClientIp } from '@/lib/security/client-ip';
 * 
 * export async function POST(request: NextRequest) {
 *   const clientIp = getClientIp(request);
 *   console.log('Request from:', clientIp);
 * }
 * ```
 */
export function getClientIp(request: NextRequest): string {
  // Priority 1: Cloudflare's CF-Connecting-IP (most trustworthy when behind Cloudflare)
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();
  
  // Priority 2: Last IP in x-forwarded-for (appended by our reverse proxy)
  // This prevents spoofing since client can add fake IPs to the beginning,
  // but cannot modify what the reverse proxy appends to the end
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    // Take the LAST IP (added by our trusted reverse proxy)
    return ips[ips.length - 1];
  }
  
  // Priority 3: x-real-ip (can be spoofed, use only as last resort)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    // Only honor x-real-ip when explicitly configured to do so
    if (process.env.TRUST_X_REAL_IP === 'true') {
      return realIp.trim();
    }
    // otherwise skip x-real-ip and continue to fallback
  }
  
  // Fallback for direct connections (development, testing)
  return 'unknown';
}

/**
 * Extract client IP with fallback value
 * 
 * @param request - Next.js request object
 * @param fallback - Fallback value if IP cannot be determined (default: 'unknown')
 * @returns Client IP address or fallback value
 * 
 * @example
 * ```typescript
 * const ip = getClientIpWithFallback(request, '0.0.0.0');
 * ```
 */
export function getClientIpWithFallback(request: NextRequest, fallback = 'unknown'): string {
  const ip = getClientIp(request);
  return ip === 'unknown' ? fallback : ip;
}

/**
 * Validate if string is a valid IPv4 address
 * 
 * @param ip - IP address string to validate
 * @returns true if valid IPv4, false otherwise
 */
export function isValidIPv4(ip: string): boolean {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;
  
  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part, 10);
    return num >= 0 && num <= 255;
  });
}

/**
 * Validates if a string is a valid IPv6 address using Node.js built-in validation.
 * 
 * Note: Production-security decisions rely on this robust check using Node's net.isIP().
 * This correctly handles all IPv6 edge cases including :: abbreviation and mixed notation.
 * 
 * @param ip - IP address string to validate
 * @returns true if valid IPv6, false otherwise
 */
export function isValidIPv6(ip: string): boolean {
  // Use Node.js built-in validation (isIP returns 6 for IPv6, 4 for IPv4, 0 for invalid)
  return isIP(ip) === 6;
}

/**
 * Check if IP is from a private network (RFC 1918)
 * 
 * @param ip - IP address to check
 * @returns true if private IP, false otherwise
 */
export function isPrivateIP(ip: string): boolean {
  if (!isValidIPv4(ip)) return false;
  
  const parts = ip.split('.').map(Number);
  const [first, second] = parts;
  
  // 10.0.0.0/8
  if (first === 10) return true;
  
  // 172.16.0.0/12
  if (first === 172 && second >= 16 && second <= 31) return true;
  
  // 192.168.0.0/16
  if (first === 192 && second === 168) return true;
  
  // 127.0.0.0/8 (localhost)
  if (first === 127) return true;
  
  return false;
}
