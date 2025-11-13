import { logger } from '@/lib/logger';
/**
 * IP utility functions for secure client IP extraction
 */

/**
 * Check if an IP address is in a private/reserved range
 * 
 * Private ranges:
 * - 10.0.0.0/8 (Class A private)
 * - 172.16.0.0/12 (Class B private) 
 * - 192.168.0.0/16 (Class C private)
 * - 127.0.0.0/8 (Loopback)
 * - 169.254.0.0/16 (Link-local)
 * - ::1/128 (IPv6 loopback)
 * - fe80::/10 (IPv6 link-local)
 * - fc00::/7 (IPv6 ULA - Unique Local Address)
 * - ff00::/8 (IPv6 multicast)
 * - 2001:db8::/32 (IPv6 documentation)
 * - ::ffff:0:0/96 (IPv4-mapped IPv6)
 */
export function isPrivateIP(ip: string): boolean {
  if (!ip || ip === 'unknown') return true;
  
  // IPv6 ranges with proper CIDR-aware matching
  if (ip.includes(':')) {
    const normalized = ip.toLowerCase();
    
    // ::1/128 - IPv6 loopback
    if (normalized === '::1') return true;
    
    // fe80::/10 - Link-local (fe80 to febf)
    // Extract first 4 hex characters after any leading colons and check range 0xfe80-0xfebf
    const stripped = normalized.replace(/^:+/, '');
    const firstFourHex = stripped.slice(0, 4);
    
    if (/^fe[89ab][0-9a-f]$/i.test(firstFourHex)) {
      // Valid fe8x, fe9x, feax, or febx prefix (fe80::/10 range)
      return true;
    }
    
    // fc00::/7 - Unique Local Address (fc00 to fdff)
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) {
      return true;
    }
    
    // ff00::/8 - Multicast
    if (normalized.startsWith('ff')) {
      return true;
    }
    
    // 2001:db8::/32 - Documentation
    if (normalized.startsWith('2001:db8:') || normalized.startsWith('2001:0db8:')) {
      return true;
    }
    
    // ::ffff:0:0/96 - IPv4-mapped IPv6 addresses
    if (normalized.startsWith('::ffff:')) {
      // Extract the IPv4 part and check it
      const ipv4Match = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)/);
      if (ipv4Match) {
        return isPrivateIP(ipv4Match[1]); // Recursive check on IPv4 part
      }
      return true;
    }
    
    // SECURITY: Fail-safe approach - treat unparsable/unknown IPv6 as private
    // This prevents accidentally treating malformed IPs as public/trusted
    return true;
  }
  
  // IPv4 private and reserved ranges
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return true; // Invalid IP is considered private
  }
  
  const [a, b] = parts;
  
  // 10.0.0.0/8
  if (a === 10) return true;
  
  // 172.16.0.0/12
  if (a === 172 && b >= 16 && b <= 31) return true;
  
  // 192.168.0.0/16
  if (a === 192 && b === 168) return true;
  
  // 127.0.0.0/8 (loopback)
  if (a === 127) return true;
  
  // 169.254.0.0/16 (link-local)
  if (a === 169 && b === 254) return true;
  
  return false;
}

/**
 * Validate and parse TRUSTED_PROXY_COUNT environment variable
 * 
 * @returns {number} Number of trusted proxy hops (default: 1)
 * @throws {Error} If TRUSTED_PROXY_COUNT is invalid
 */
export function validateTrustedProxyCount(): number {
  const envValue = process.env.TRUSTED_PROXY_COUNT;
  
  if (!envValue) {
    // Default: assume 1 trusted proxy hop (typical edge proxy setup)
    return 1;
  }
  
  const count = parseInt(envValue, 10);
  
  if (isNaN(count) || count < 0) {
    throw new Error(
      `Invalid TRUSTED_PROXY_COUNT: "${envValue}". Must be a non-negative integer.`
    );
  }
  
  if (count > 10) {
    logger.warn(
      `⚠️  High TRUSTED_PROXY_COUNT (${count}). Verify your proxy chain configuration.`
    );
  }
  
  return count;
}

/**
 * Validate proxy configuration at startup
 * Call this during app initialization to fail-fast on misconfiguration
 */
export function validateProxyConfiguration(): void {
  try {
    const trustedProxyCount = validateTrustedProxyCount();
    
    logger.info(`✅ Proxy configuration validated:`);
    logger.info(`   - TRUSTED_PROXY_COUNT: ${trustedProxyCount}`);
    logger.info(`   - TRUST_X_REAL_IP: ${process.env.TRUST_X_REAL_IP || 'false'}`);
    
    if (trustedProxyCount === 0) {
      logger.warn(`⚠️  TRUSTED_PROXY_COUNT=0 means direct client connections (no proxy)`);
    }
    
    if (process.env.TRUST_X_REAL_IP === 'true' && trustedProxyCount > 0) {
      logger.warn(`⚠️  Both TRUST_X_REAL_IP and TRUSTED_PROXY_COUNT set. X-Real-IP takes lower priority.`);
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`🔴 Proxy configuration error: ${errorMessage}`);
    logger.error(`   Set TRUSTED_PROXY_COUNT to the number of trusted proxy hops in your infrastructure.`);
    logger.error(`   Examples: 0 (direct), 1 (edge proxy), 2 (load balancer + edge proxy)`);
    throw error; // Fail-fast on invalid configuration
  }
}
