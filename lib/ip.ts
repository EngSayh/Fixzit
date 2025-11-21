import { NextRequest } from 'next/server';
import { isPrivateIP, validateTrustedProxyCount } from '@/server/security/ip-utils';

/**
 * Hardened IP extraction with infrastructure-aware trusted proxy counting
 * 
 * SECURITY: Uses TRUSTED_PROXY_COUNT to skip known trusted proxy hops,
 * with fallback to leftmost public IP to prevent header spoofing attacks.
 * 
 * Shared by:
 * - lib/rateLimit.ts (getHardenedClientIp)
 * - server/security/headers.ts (getClientIP)
 * 
 * @param request - Next.js request object
 * @returns Client IP address or 'unknown' if not determinable
 */
export function extractClientIP(request: NextRequest): string {
  if (!request?.headers || typeof (request as any).headers.get !== 'function') {
    return 'unknown';
  }
  // 1) Cloudflare's CF-Connecting-IP is most trustworthy
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp && cfIp.trim()) return cfIp.trim();
  
  // 2) X-Forwarded-For with trusted proxy counting
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded && forwarded.trim()) {
    const ips = forwarded.split(',').map(ip => ip.trim()).filter(ip => ip);
    if (ips.length) {
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
      
      // SECURITY: Do not return private IPs - they can leak internal addresses or be spoofed
      // If no public IP found, return 'unknown' instead of exposing internal topology
    }
  }
  
  // 3) X-Real-IP only if explicitly trusted
  if (process.env.TRUST_X_REAL_IP === 'true') {
    const realIP = request.headers.get('x-real-ip');
    if (realIP && realIP.trim()) return realIP.trim();
  }
  
  // 4) Fallback
  return 'unknown';
}
