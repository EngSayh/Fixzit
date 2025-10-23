/**
 * Secure Client IP Extraction Utility
 * 
 * Provides safe methods to extract client IP addresses from HTTP requests
 * while preventing spoofing attacks via x-forwarded-for header manipulation.
 * 
 * @module lib/security/client-ip
 */

import { NextRequest } from 'next/server';

/**
 * Extract client IP address from request headers
 * 
 * Security considerations:
 * - x-forwarded-for can be spoofed by clients
 * - x-real-ip is more trustworthy (set by reverse proxy)
 * - cf-connecting-ip is Cloudflare's trusted header
 * - Last IP in x-forwarded-for is added by our reverse proxy (trusted)
 * 
 * Priority order:
 * 1. x-real-ip (Nginx, most reverse proxies)
 * 2. cf-connecting-ip (Cloudflare)
 * 3. Last IP in x-forwarded-for (proxy-appended)
 * 4. 'unknown' (fallback)
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
  if (realIp) return realIp.trim();
  
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
 * Validate if string is a valid IPv6 address (basic check)
 * 
 * @param ip - IP address string to validate
 * @returns true if likely valid IPv6, false otherwise
 */
export function isValidIPv6(ip: string): boolean {
  // Basic IPv6 regex (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return ipv6Regex.test(ip);
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
