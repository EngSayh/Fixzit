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
 * - fc00::/7 (IPv6 private)
 */
export function isPrivateIP(ip: string): boolean {
  if (!ip || ip === 'unknown') return true;
  
  // IPv6 loopback and private ranges
  if (ip.includes(':')) {
    return ip === '::1' || ip.startsWith('fc') || ip.startsWith('fd') || ip.startsWith('fe80:');
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
    console.warn(
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
    
    console.log(`✅ Proxy configuration validated:`);
    console.log(`   - TRUSTED_PROXY_COUNT: ${trustedProxyCount}`);
    console.log(`   - TRUST_X_REAL_IP: ${process.env.TRUST_X_REAL_IP || 'false'}`);
    
    if (trustedProxyCount === 0) {
      console.warn(`⚠️  TRUSTED_PROXY_COUNT=0 means direct client connections (no proxy)`);
    }
    
    if (process.env.TRUST_X_REAL_IP === 'true' && trustedProxyCount > 0) {
      console.warn(`⚠️  Both TRUST_X_REAL_IP and TRUSTED_PROXY_COUNT set. X-Real-IP takes lower priority.`);
    }
    
  } catch (error) {
    console.error(`🔴 Proxy configuration error: ${error.message}`);
    console.error(`   Set TRUSTED_PROXY_COUNT to the number of trusted proxy hops in your infrastructure.`);
    console.error(`   Examples: 0 (direct), 1 (edge proxy), 2 (load balancer + edge proxy)`);
    throw error; // Fail-fast on invalid configuration
  }
}
