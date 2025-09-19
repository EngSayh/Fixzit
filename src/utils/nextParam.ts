/**
 * Safe next parameter handling to avoid double-encoding and open redirects
 */

/**
 * Build a properly encoded next parameter
 * @param path - The path to encode (e.g., '/dashboard')
 * @returns Properly encoded next parameter (e.g., '%2Fdashboard')
 */
export function buildNextParam(path: string): string {
  // Normalize path
  const normalized = path.startsWith('/') ? path : '/' + path;
  // Single encode only
  return encodeURIComponent(normalized);
}

/**
 * Parse and normalize next parameter safely
 * @param rawNext - Raw next parameter from URL
 * @returns Normalized internal path or null if invalid
 */
export function parseNextParam(rawNext: string | null): string | null {
  if (!rawNext) return null;
  
  try {
    // Decode the parameter
    let decoded = decodeURIComponent(rawNext);
    
    // Handle double-encoding (e.g., %252Fdashboard -> %2Fdashboard -> /dashboard)
    if (decoded.includes('%')) {
      decoded = decodeURIComponent(decoded);
    }
    
    // Security: Only allow internal paths
    if (!decoded.startsWith('/')) {
      return null;
    }
    
    // Block external URLs and protocol schemes
    if (decoded.includes('://') || decoded.startsWith('//')) {
      return null;
    }
    
    // Normalize path
    return decoded;
  } catch (error) {
    console.warn('Invalid next parameter:', rawNext, error);
    return null;
  }
}

/**
 * Get the next redirect path from search params
 * @param searchParams - URLSearchParams object
 * @param fallback - Fallback path if next is invalid (default: '/app/dashboard')
 * @returns Safe redirect path
 */
export function getNextPath(searchParams: URLSearchParams, fallback: string = '/app/dashboard'): string {
  const next = parseNextParam(searchParams.get('next'));
  return next || fallback;
}