/**
 * Secure error response utilities to prevent information leakage
 */

// Safe error patterns that can be shown to users
const SAFE_ERROR_PATTERNS = [
  /^Invalid input$/,
  /^Authentication required$/,
  /^Insufficient permissions$/,
  /^Resource not found$/,
  /^Too many requests$/,
  /^Validation failed$/,
  /^Network error$/,
  /^Connection timeout$/,
  /^Service unavailable$/
];

/**
 * Check if an error message is safe to display to users
 * Uses regex patterns with anchored matching to prevent partial matches
 */
export function isSafeErrorMessage(message: string): boolean {
  const trimmedMessage = message.trim();
  
  return SAFE_ERROR_PATTERNS.some(pattern => {
    return pattern.test(trimmedMessage);
  });
}

/**
 * Sanitize error message for client response
 * Returns the original message if safe, otherwise returns a generic message
 */
export function sanitizeErrorMessage(message: string, fallback = 'An error occurred'): string {
  if (isSafeErrorMessage(message)) {
    return message;
  }
  
  // Log the original message server-side for debugging
  console.error('Unsafe error message sanitized:', message);
  
  return fallback;
}

/**
 * Create a secure error response object
 */
export interface SecureErrorResponse {
  error: string;
  code?: string;
  timestamp: string;
  correlationId?: string;
}

export function createSecureErrorResponse(
  message: string,
  code?: string,
  correlationId?: string
): SecureErrorResponse {
  return {
    error: sanitizeErrorMessage(message),
    code,
    timestamp: new Date().toISOString(),
    correlationId
  };
}