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
import { validateTrustedProxyCount } from '@/server/security/ip-utils';

/**
 * Extract client IP with trusted proxy counting strategy
 * 
 * @param request - Next.js request object
 * @returns Client IP address or 'unknown' if not determinable
 * 
 * @security
 * - Uses TRUSTED_PROXY_COUNT to skip known trusted proxy hops from the right
 * - Consistent with lib/ip.ts extractClientIP implementation
 * - Falls back to leftmost public IP, cf-connecting-ip, and x-real-ip (when trusted)
 * 
 * @example
 * ```typescript
 * // With TRUSTED_PROXY_COUNT=1:
 * // x-forwarded-for: "client-ip, proxy1-ip, proxy2-ip"
 * // Returns: "proxy1-ip" (skip 1 from right: proxy2-ip)
 * ```
 */
export function getClientIp(request: NextRequest): string {
  // Priority 1: Cloudflare's CF-Connecting-IP (most trustworthy when behind Cloudflare)
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp && cfIp.trim()) return cfIp.trim();
  
  // Priority 2: X-Forwarded-For with trusted proxy counting
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    const trimmed = forwardedFor.trim();
    // Treat empty or whitespace-only header as absent
    if (trimmed) {
      const ips = trimmed.split(',').map(ip => ip.trim()).filter(ip => ip.length > 0);
      if (ips.length > 0) {
        const trustedProxyCount = validateTrustedProxyCount();
        
        // Skip trusted proxy hops from the right
        const clientIPIndex = Math.max(0, ips.length - 1 - trustedProxyCount);
        const hopSkippedIP = ips[clientIPIndex];
        
        // If hop-skipped IP is valid and public, use it
        if (hopSkippedIP && !isPrivateIP(hopSkippedIP)) {
          return hopSkippedIP;
        }
        
        // Fallback: find leftmost public IP
        for (const ip of ips) {
          if (!isPrivateIP(ip)) {
            return ip;
          }
        }
        
        // If no public IP found, continue to fallback (don't expose private IPs)
      }
    }
    // Fall through if header was empty or no valid public IPs
  }
  
  // Priority 3: x-real-ip (only when explicitly trusted)
  if (process.env.TRUST_X_REAL_IP === 'true') {
    const realIp = request.headers.get('x-real-ip');
    if (realIp && realIp.trim()) {
      return realIp.trim();
    }
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
 * Fail-closed behavior: Invalid or non-IPv4 addresses are treated as private
 * to prevent security bypasses.
 * 
 * @param ip - IP address to check
 * @returns true if private IP or invalid, false if public IPv4
 */
export function isPrivateIP(ip: string): boolean {
  // Fail-closed: treat invalid/non-IPv4 input as private to prevent security bypass
  if (!isValidIPv4(ip)) return true;
  
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
