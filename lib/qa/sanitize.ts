/**
 * QA Payload Sanitization Utilities
 * 
 * Provides data sanitization for QA logs/alerts to:
 * - Prevent PII/credential leakage (both key-based and value-based)
 * - Limit field sizes
 * - Enforce consistent schema structure
 * 
 * SECURITY: This module protects against storing sensitive data in QA collections.
 * TTL (90d logs, 30d alerts) means any leaked credentials remain accessible for weeks.
 */

// ============================================================================
// SENSITIVE KEY PATTERNS - Word-boundary matching to avoid false positives
// ============================================================================

/**
 * Patterns that indicate sensitive field names.
 * Uses word boundaries (\b) to avoid matching substrings like "author" or "authority".
 * 
 * IMPORTANT: We use GENERALIZED patterns for camelCase/snake_case token fields
 * to catch ALL variants like csrfToken, deviceToken, serviceToken, etc.
 * without needing to enumerate each one explicitly.
 */
const SENSITIVE_KEY_PATTERNS = [
  /\bpassword\b/i,
  /\bpasswd\b/i,
  /\bsecret\b/i,
  /\btoken\b/i,
  /\bauthentication\b/i,
  /\bauthorization\b/i,
  /\bbearer\b/i,
  /\bapi[_-]?key\b/i,
  /\bsession[_-]?id\b/i,
  /\bsession[_-]?token\b/i,
  /\bcookie\b/i,
  /\bcredential\b/i,
  /\bcredentials\b/i,
  /\bssn\b/i,
  /\bcredit[_-]?card\b/i,
  /\bcard[_-]?number\b/i,
  /\bcvv\b/i,
  /\bpin\b/i,
  /\bprivate[_-]?key\b/i,
  /\baccess[_-]?token\b/i,
  /\brefresh[_-]?token\b/i,
  /\bid[_-]?token\b/i,
  /\bauth[_-]?code\b/i,
  /\bclient[_-]?secret\b/i,
  /\bsigning[_-]?key\b/i,
  /\bencryption[_-]?key\b/i,
  // GENERALIZED camelCase token pattern: catches ANY field ending in "Token"
  // Examples: authToken, bearerToken, csrfToken, deviceToken, serviceToken, xToken, etc.
  // This pattern matches: lowercase letters/digits followed by capital T and "oken"
  /[a-z0-9]Token$/i,
  // GENERALIZED snake_case token pattern: catches ANY field ending in "_token"
  // Examples: auth_token, csrf_token, device_token, service_token, etc.
  /[a-z0-9]_token$/i,
];

// ============================================================================
// VALUE-BASED SENSITIVE PATTERNS - Detect secrets in string values
// ============================================================================

/**
 * Patterns to detect sensitive data IN VALUES (not just key names).
 * These catch bearer tokens, API keys, JWTs, etc. that might appear
 * in generic fields like "message", "error", "details".
 * 
 * IMPORTANT: Character classes include base64 alphabet (+, /, =) and URL-safe
 * variants (~, _) to catch real-world OAuth2/API tokens.
 */
const SENSITIVE_VALUE_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  // Bearer tokens: "Bearer abc123..." or "bearer abc123..."
  // Includes base64 chars (+/=) and URL-safe variants (~_) for OAuth2 tokens
  { pattern: /\bbearer\s+[A-Za-z0-9._~+/=-]+/gi, replacement: '[REDACTED_BEARER_TOKEN]' },
  
  // API key patterns: "api_key=xxx", "apiKey: xxx", "x-api-key: xxx"
  // Includes base64 chars for API keys that use base64 encoding
  { pattern: /\b(api[_-]?key|x-api-key)\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]+["']?/gi, replacement: '[REDACTED_API_KEY]' },
  
  // JWT tokens (header.payload.signature format)
  // JWT uses base64url encoding (A-Za-z0-9_-) without padding
  { pattern: /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, replacement: '[REDACTED_JWT]' },
  
  // Basic auth header: "Basic base64string"
  { pattern: /\bbasic\s+[A-Za-z0-9+/=]+/gi, replacement: '[REDACTED_BASIC_AUTH]' },
  
  // AWS-style access key IDs: AKIA...
  { pattern: /\bAKIA[A-Z0-9]{16}\b/g, replacement: '[REDACTED_AWS_KEY_ID]' },
  
  // MongoDB connection strings
  { pattern: /mongodb(\+srv)?:\/\/[^@\s]+@[^\s]+/gi, replacement: '[REDACTED_MONGO_URI]' },
  
  // Generic connection strings with passwords
  { pattern: /:\/\/[^:]+:[^@]+@/gi, replacement: '://[REDACTED_CREDENTIALS]@' },
  
  // Password patterns in URLs or key-value pairs
  { pattern: /\b(password|passwd|pwd)\s*[:=]\s*["']?[^\s"',}]+["']?/gi, replacement: '[REDACTED_PASSWORD]' },
  
  // Session/cookie values that look like tokens (20+ chars)
  // Includes base64 chars for session tokens
  { pattern: /\b(session|sess|sid)\s*[:=]\s*["']?[A-Za-z0-9._~+/=-]{20,}["']?/gi, replacement: '[REDACTED_SESSION]' },
];

// Email pattern for redaction
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Max string length to store (truncate longer values)
const MAX_STRING_LENGTH = 500;

// Max depth for nested objects
const MAX_DEPTH = 5;

// Max array length
const MAX_ARRAY_LENGTH = 50;

// Max number of keys in an object
const MAX_OBJECT_KEYS = 100;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if a key name suggests sensitive data.
 * Uses word-boundary matching to avoid false positives like "author".
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key));
}

/**
 * Redact email addresses in a string
 */
function redactEmails(value: string): string {
  return value.replace(EMAIL_PATTERN, '[REDACTED_EMAIL]');
}

/**
 * Redact sensitive patterns found in string VALUES.
 * This catches tokens, API keys, JWTs, etc. that appear in generic fields.
 */
function redactSensitiveValues(value: string): string {
  let sanitized = value;
  
  for (const { pattern, replacement } of SENSITIVE_VALUE_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    sanitized = sanitized.replace(pattern, replacement);
  }
  
  return sanitized;
}

/**
 * Sanitize a single value (recursive for nested structures)
 * 
 * @param value - The value to sanitize
 * @param depth - Current recursion depth
 * @param seen - WeakSet to track visited objects and prevent circular reference loops
 */
function sanitizeValue(value: unknown, depth: number, seen: WeakSet<object> = new WeakSet()): unknown {
  if (depth > MAX_DEPTH) {
    return '[MAX_DEPTH_EXCEEDED]';
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    // Apply all string sanitizations in order:
    // IMPORTANT: Sensitive value patterns (connection strings, URLs with credentials)
    // must run BEFORE email redaction, because user:pass@host looks like an email
    // 1. Redact sensitive value patterns first (connection strings, tokens, JWTs, etc.)
    let sanitized = redactSensitiveValues(value);
    // 2. Redact emails (after connection strings are already handled)
    sanitized = redactEmails(sanitized);
    // 3. Truncate long strings
    if (sanitized.length > MAX_STRING_LENGTH) {
      sanitized = sanitized.substring(0, MAX_STRING_LENGTH) + '...[TRUNCATED]';
    }
    return sanitized;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  // Handle Date objects - preserve temporal context as ISO string
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Handle Buffer objects - redact raw binary data
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(value)) {
    return `[BUFFER:${value.length} bytes]`;
  }

  // Handle ArrayBuffer and typed arrays (Uint8Array, etc.) - redact raw binary data
  if (value instanceof ArrayBuffer) {
    return `[ARRAYBUFFER:${value.byteLength} bytes]`;
  }
  if (ArrayBuffer.isView(value)) {
    return `[BINARY:${(value as ArrayBufferView).byteLength} bytes]`;
  }

  // Circular reference protection for arrays
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return '[CIRCULAR_REFERENCE]';
    }
    seen.add(value);
    const truncated = value.slice(0, MAX_ARRAY_LENGTH);
    const sanitized = truncated.map(item => sanitizeValue(item, depth + 1, seen));
    if (value.length > MAX_ARRAY_LENGTH) {
      sanitized.push(`[...${value.length - MAX_ARRAY_LENGTH} more items]`);
    }
    return sanitized;
  }

  // Circular reference protection for objects
  if (typeof value === 'object') {
    if (seen.has(value as object)) {
      return '[CIRCULAR_REFERENCE]';
    }
    seen.add(value as object);
    return sanitizeObject(value as Record<string, unknown>, depth + 1, seen);
  }

  // For functions, symbols, etc.
  return '[UNSUPPORTED_TYPE]';
}

/**
 * Sanitize an object, redacting sensitive keys and limiting depth/size
 * 
 * @param obj - The object to sanitize
 * @param depth - Current recursion depth
 * @param seen - WeakSet to track visited objects and prevent circular reference loops
 */
function sanitizeObject(obj: Record<string, unknown>, depth: number, seen: WeakSet<object> = new WeakSet()): Record<string, unknown> {
  if (depth > MAX_DEPTH) {
    return { _truncated: '[MAX_DEPTH_EXCEEDED]' };
  }

  const result: Record<string, unknown> = {};
  const keys = Object.keys(obj).slice(0, MAX_OBJECT_KEYS);

  for (const key of keys) {
    if (isSensitiveKey(key)) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = sanitizeValue(obj[key], depth, seen);
    }
  }

  if (Object.keys(obj).length > MAX_OBJECT_KEYS) {
    result._truncatedKeys = `[...${Object.keys(obj).length - MAX_OBJECT_KEYS} more keys]`;
  }

  return result;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Sanitize QA payload data before storage
 * 
 * This function provides comprehensive sanitization:
 * - Redacts sensitive field names (password, token, secret, etc.) using word boundaries
 * - Redacts email addresses anywhere in string values
 * - Redacts sensitive patterns IN VALUES (bearer tokens, JWTs, API keys, etc.)
 * - Truncates long strings (>500 chars)
 * - Limits object depth (max 5 levels)
 * - Limits array length (max 50 items)
 * - Returns null for undefined/null input
 * 
 * @param data - The payload data to sanitize
 * @returns Sanitized data safe for storage
 */
export function sanitizeQaPayload(data: unknown): unknown {
  if (data === null || data === undefined) {
    return null;
  }

  return sanitizeValue(data, 0);
}

/**
 * Estimate the byte size of a JSON-serializable value
 * Uses TextEncoder as a fallback for edge runtime environments where Buffer is unavailable
 */
export function estimatePayloadSize(data: unknown): number {
  if (data === null || data === undefined) {
    return 0;
  }
  try {
    const json = JSON.stringify(data);
    // Use Buffer if available (Node.js), otherwise TextEncoder (Edge/Browser)
    if (typeof Buffer !== 'undefined') {
      return Buffer.byteLength(json, 'utf8');
    }
    return new TextEncoder().encode(json).length;
  } catch {
    return 0;
  }
}
