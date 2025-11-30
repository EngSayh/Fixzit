/**
 * LOG-001 FIX: Log Sanitization Utility
 *
 * Prevents PII (Personally Identifiable Information) from leaking into client-side logs.
 * Implements GDPR Article 5(c) data minimization principle.
 *
 * @module lib/security/log-sanitizer
 */

/**
 * List of sensitive keys that should be redacted from logs
 * Matches both camelCase and snake_case variations (normalized internally)
 */
const SENSITIVE_KEYS = new Set([
  // Personal identifiers
  "userid",
  "user_id",
  "identifier",
  "loginidentifier",
  "login",
  "email",
  "phone",
  "phonenumber",
  "phone_number",
  "mobile",
  "nationalid",
  "national_id",
  "passport",
  "passportnumber",
  "passport_number",
  "iqamaid",
  "iqama_id",
  "ssn",
  "social_security",

  // Financial data
  "iban",
  "accountnumber",
  "account_number",
  "cardnumber",
  "card_number",
  "cvv",
  "cvc",
  "salary",
  "basesalary",
  "base_salary",
  "bankaccount",
  "bank_account",

  // Authentication
  "password",
  "secret",
  "token",
  "apikey",
  "api_key",
  "accesstoken",
  "access_token",
  "refreshtoken",
  "refresh_token",
  "mfasecret",
  "mfa_secret",
  "otp",
  "pin",
  // HTTP Headers containing auth data
  "authorization",
  "cookie",
  "setcookie",
  "set_cookie",
  "idtoken",
  "id_token",
  "sessionid",
  "session_id",
  "csrftoken",
  "csrf_token",
  "xsrftoken",
  "xsrf_token",
  // Additional auth header variants (custom APIs, proxies)
  "xaccesstoken",
  "x_access_token",
  "authtoken",
  "auth_token",
  "bearertoken",
  "bearer_token",
  // Common HTTP header patterns
  "xapikey",
  "x_api_key",
  "xauthtoken",
  "x_auth_token",
  "xforwardedfor",
  "x_forwarded_for",
  "xrealip",
  "x_real_ip",
  "proxyauthorization",
  "proxy_authorization",

  // Address details
  "address",
  "streetaddress",
  "street_address",
  "fulladdress",
  "full_address",

  // Names (optional - enable if needed)
  // "name",
  // "firstname",
  // "first_name",
  // "lastname",
  // "last_name",
]);

/**
 * PII value patterns to catch free-form data in non-sensitive keys
 * 
 * SECURITY: Patterns are bounded to prevent ReDoS attacks
 * NOTE: Some patterns may have false positives - they are designed to be
 * applied only when key-based filtering doesn't match, as a second layer
 */
const BASE_PII_PATTERNS: RegExp[] = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i, // emails
  // Phone pattern: bounded digit run with optional single separators between digits
  // Uses simple alternation to avoid backtracking: pure digits OR formatted
  // Bounded to 8-15 total digits to match international phone formats
  /\b\+?\d(?:[\s()-]?\d){7,14}\b/, // phone-like: digit followed by 7-14 more (with optional separators)
  /^[A-Za-z0-9-_]{10,}\.(?:[A-Za-z0-9-_]{10,})\.(?:[A-Za-z0-9-_]{10,})$/, // JWT tokens (min 10 chars per segment)
  /\b[A-Z]{2}\d{2}[A-Z0-9]{9,30}\b/, // IBAN-ish
  /\b\d{13,19}\b/, // card-like digit runs
  // Bearer tokens with prefix (Authorization header values)
  /\bBearer\s+[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b/i, // Bearer JWT
  /\bBearer\s+[A-Za-z0-9._~-]{20,}\b/i, // Bearer opaque tokens
  // Basic auth header values
  /\bBasic\s+[A-Za-z0-9+/=]{10,}\b/i, // Basic auth base64
  // Bare JWT tokens (no Bearer prefix) - three dot-separated base64url segments
  /\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/, // Bare JWT
  // Bare opaque tokens (API keys, session tokens, etc.)
  /\b[A-Za-z0-9._~-]{32,}\b/, // Bare opaque tokens (min 32 chars)
];

/**
 * Redaction marker for sanitized values
 */
const REDACTED = "[REDACTED]";

/**
 * Maximum depth to traverse when sanitizing to prevent runaway recursion
 */
const MAX_DEPTH = 10;

const normalizeKey = (key: string) => key.toLowerCase().replace(/[-_]/g, "");
const NORMALIZED_SENSITIVE_KEYS = new Set(
  Array.from(SENSITIVE_KEYS).map((key) => normalizeKey(key)),
);

/**
 * Check if a key should be redacted
 * @param key - Object key to check
 * @returns true if the key should be redacted
 */
function isSensitiveKey(key: string, extraKeys?: Set<string>): boolean {
  const normalizedKey = normalizeKey(key);
  return (
    NORMALIZED_SENSITIVE_KEYS.has(normalizedKey) ||
    (extraKeys?.has(normalizedKey) ?? false)
  );
}

/**
 * Type guard to check if value is a Record
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function buildPatterns(extraPatterns?: RegExp[]): RegExp[] {
  return [...BASE_PII_PATTERNS, ...(extraPatterns ?? [])];
}

type SanitizeOptions = {
  patterns: RegExp[];
  extraKeys: Set<string>;
  seen: WeakSet<object>;
};

function sanitizeObject(
  obj: Record<string, unknown>,
  depth: number,
  opts: SanitizeOptions,
): Record<string, unknown> {
  if (opts.seen.has(obj as object)) {
    return { __truncated: "Circular reference" };
  }

  if (depth > MAX_DEPTH) {
    return { __truncated: "Max depth exceeded" };
  }

  opts.seen.add(obj as object);

  return Object.entries(obj).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      acc[key] = sanitizeValueDeep(value, key, depth + 1, opts);
      return acc;
    },
    {},
  );
}

/**
 * Sanitize any value recursively, redacting known sensitive keys or patterns
 */
function sanitizeValueDeep(
  value: unknown,
  fieldName: string | undefined,
  depth: number,
  opts: SanitizeOptions,
): unknown {
  if (depth > MAX_DEPTH) {
    return { __truncated: "Max depth exceeded" };
  }

  if (fieldName && isSensitiveKey(fieldName, opts.extraKeys)) {
    return REDACTED;
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return opts.patterns.some((re) => re.test(value)) ? REDACTED : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return sanitizeError(value);
  }

  if (Array.isArray(value)) {
    if (opts.seen.has(value)) {
      return { __truncated: "Circular reference" };
    }
    opts.seen.add(value);
    return value.map((item) =>
      sanitizeValueDeep(item, fieldName, depth + 1, opts),
    );
  }

  if (isRecord(value)) {
    return sanitizeObject(value as Record<string, unknown>, depth + 1, opts);
  }

  return value;
}

/**
 * Recursively sanitize an object, redacting sensitive fields
 * @param obj - Object to sanitize
 * @param depth - Current recursion depth (max 10 to prevent stack overflow)
 * @returns Sanitized copy of the object
 */
export function sanitizeLogParams<T extends Record<string, unknown>>(
  obj: T,
  depth = 0,
  options?: {
    extraKeys?: string[];
    extraPatterns?: RegExp[];
    seen?: WeakSet<object>;
  },
): Record<string, unknown> {
  const extraKeysSet = new Set(
    (options?.extraKeys ?? []).map((key) => normalizeKey(key)),
  );
  const seen = options?.seen ?? new WeakSet<object>();
  const patterns = buildPatterns(options?.extraPatterns);

  if (!isRecord(obj)) {
    return {};
  }

  return sanitizeObject(obj, depth, { extraKeys: extraKeysSet, patterns, seen });
}

/**
 * Sanitize a single value if it looks like PII
 * Useful for sanitizing individual log parameters
 * @param value - Value to check and potentially redact
 * @param fieldName - Name of the field (for context)
 * @returns Original value or REDACTED
 */
export function sanitizeValue(value: unknown, fieldName: string): unknown {
  return sanitizeValueDeep(value, fieldName, 0, {
    patterns: BASE_PII_PATTERNS,
    extraKeys: new Set<string>(),
    seen: new WeakSet<object>(),
  });
}

/**
 * Sanitize error object for logging
 * Extracts safe error information without leaking stack traces in production
 */
export function sanitizeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      // Only include stack in development
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    };
  }

  if (isRecord(error)) {
    return sanitizeLogParams(error);
  }

  return { message: String(error) };
}

export default {
  sanitizeLogParams,
  sanitizeValue,
  sanitizeError,
};
