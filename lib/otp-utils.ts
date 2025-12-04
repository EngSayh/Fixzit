/**
 * Shared OTP utilities for authentication flows.
 * Extracted from send/verify routes to eliminate duplication.
 * 
 * @module lib/otp-utils
 */

/**
 * Regex pattern for validating corporate employee IDs.
 * Matches format: EMP followed by alphanumeric characters and dashes.
 * Example: EMP-001, EMPA12345
 */
export const EMPLOYEE_ID_REGEX = /^EMP[-A-Z0-9]+$/;

/**
 * Normalizes a company code to uppercase, trimmed format.
 * Returns null if empty or undefined.
 * 
 * @param code - Raw company code input
 * @returns Normalized uppercase company code or null
 * 
 * @example
 * normalizeCompanyCode("  acme-001  ") // "ACME-001"
 * normalizeCompanyCode("") // null
 * normalizeCompanyCode(null) // null
 */
export const normalizeCompanyCode = (code?: string | null): string | null =>
  code?.trim() ? code.trim().toUpperCase() : null;

/**
 * Builds a composite OTP key that includes company code and orgId for tenant isolation.
 * For personal logins (no company code), returns identifier + orgId.
 * 
 * @param identifier - Login identifier (email or employee ID)
 * @param companyCode - Normalized company code (null for personal logins)
 * @param orgId - Tenant orgId for isolation (optional but recommended)
 * @returns Composite key for OTP storage: "identifier::companyCode::orgId" or parts joined when provided
 * 
 * @example
 * buildOtpKey("EMP001", "ACME-001", "ORG123") // "EMP001::ACME-001::ORG123"
 * buildOtpKey("user@email.com", null, "ORG123") // "user@email.com::ORG123"
 */
export const buildOtpKey = (
  identifier: string,
  companyCode: string | null,
  orgId?: string | null,
): string => {
  const parts = [identifier];
  if (companyCode) parts.push(companyCode);
  if (orgId) parts.push(orgId);
  return parts.join("::");
};

/**
 * Company code validation regex pattern.
 * Allows uppercase alphanumeric characters and dashes, 2-20 chars.
 */
export const COMPANY_CODE_REGEX = /^[A-Z0-9-]{2,20}$/;

/**
 * Validates if a company code matches the expected format.
 * 
 * @param code - Company code to validate (should be normalized first)
 * @returns true if valid format, false otherwise
 */
export const isValidCompanyCode = (code: string | null): boolean => {
  if (!code) return false;
  return COMPANY_CODE_REGEX.test(code);
};

/**
 * Redact identifier for logging (GDPR/Saudi Labor Law data minimization).
 * Shows first 3 chars + *** to allow debugging without exposing full PII.
 * 
 * @param identifier - Login identifier (email, employee ID, or composite OTP key)
 * @returns Redacted string showing only first 3 characters
 * 
 * @example
 * redactIdentifier("user@email.com") // "use***"
 * redactIdentifier("EMP001::ACME") // "EMP***"
 * redactIdentifier("ab") // "***"
 */
export const redactIdentifier = (identifier: string): string => {
  if (!identifier || identifier.length <= 3) return '***';
  return identifier.slice(0, 3) + '***';
};

/**
 * Get the monitoring hash salt from environment.
 * Falls back to LOG_HASH_SALT if MONITORING_HASH_SALT is not set.
 * In production, a salt is required; in dev, empty string is used as fallback.
 * 
 * Note: This is a low-level utility that cannot import logger to avoid circular deps.
 * Missing salt is a configuration issue that should be caught by env validation.
 */
const getMonitoringSalt = (): string => {
  // Check for dedicated monitoring salt first
  const monitoringSalt = typeof process !== 'undefined' ? process.env?.MONITORING_HASH_SALT : undefined;
  if (monitoringSalt && monitoringSalt.trim().length > 0) {
    return monitoringSalt;
  }
  
  // Fall back to LOG_HASH_SALT (used for email hashing)
  const logSalt = typeof process !== 'undefined' ? process.env?.LOG_HASH_SALT : undefined;
  if (logSalt && logSalt.trim().length > 0) {
    return logSalt;
  }
  
  // In production without salt, hashes will be deterministic (not ideal but functional)
  // ENV validation scripts (check-vercel-env.ts) should catch missing salts at deploy time
  return '';
};

/**
 * Create a non-reversible hash of an identifier for monitoring keys.
 * Uses FNV-1a hash with salt for dictionary-attack resistance.
 * 
 * This is useful when you need to track unique identifiers in monitoring
 * without the collision issues of 3-char truncation.
 * 
 * @param identifier - The identifier to hash (email, IP, user ID, etc.)
 * @param salt - Optional explicit salt. If not provided, uses MONITORING_HASH_SALT or LOG_HASH_SALT from env.
 * @returns A 16-character hex hash suitable for monitoring keys
 * 
 * @example
 * hashIdentifier("user@email.com") // Uses env salt automatically
 * hashIdentifier("user@email.com", "explicit-salt") // Uses provided salt
 * 
 * @note When salt is provided from env, the hash is resistant to dictionary attacks.
 * Without salt, hashes are deterministic and could be reversed via precomputation.
 */
export const hashIdentifier = (identifier: string, salt?: string): string => {
  // Use provided salt, or get from environment
  const effectiveSalt = salt !== undefined ? salt : getMonitoringSalt();
  
  // Simple FNV-1a hash - fast, good distribution, deterministic
  // With salt, resistant to dictionary attacks
  const input = effectiveSalt + identifier;
  let hash = 2166136261; // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619); // FNV prime
  }
  // Convert to unsigned 32-bit and then to hex, padded to 8 chars
  const hex1 = (hash >>> 0).toString(16).padStart(8, '0');
  
  // Generate second half with different seed for better distribution
  hash = 2166136261;
  for (let i = input.length - 1; i >= 0; i--) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex2 = (hash >>> 0).toString(16).padStart(8, '0');
  
  return hex1 + hex2;
};

/**
 * Keys that should be fully redacted when found in metadata objects.
 * Includes common PII field names for GDPR/Saudi Labor Law compliance.
 */
const SENSITIVE_KEYS = new Set([
  'password', 'token', 'secret', 'apiKey', 'api_key', 'accessToken', 'access_token',
  'refreshToken', 'refresh_token', 'ssn', 'nationalId', 'national_id', 'creditCard',
  'credit_card', 'cvv', 'pin', 'bankAccount', 'bank_account', 'iban', 'salary',
  'privateKey', 'private_key', 'otp', 'otpCode', 'otp_code', 'sessionToken',
]);

/**
 * Keys containing identifiers that should be partially redacted (show first 3 chars).
 */
const IDENTIFIER_KEYS = new Set([
  'identifier', 'email', 'phone', 'ip', 'ipAddress', 'ip_address', 'userId',
  'user_id', 'employeeId', 'employee_id', 'username', 'mobile', 'cellphone',
]);

/**
 * Redact sensitive fields in a metadata object for safe logging.
 * - Fully redacts sensitive keys (passwords, tokens, SSN, etc.)
 * - Partially redacts identifier keys (shows first 3 chars)
 * - Recursively handles nested objects
 * 
 * @param metadata - Object potentially containing sensitive data
 * @returns New object with sensitive fields redacted
 * 
 * @example
 * redactMetadata({ email: "user@test.com", password: "secret123" })
 * // { email: "use***", password: "[REDACTED]" }
 */
export const redactMetadata = (
  metadata: Record<string, unknown> | undefined | null
): Record<string, unknown> | undefined => {
  if (!metadata || typeof metadata !== 'object') return undefined;

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    
    // Fully redact sensitive keys
    if (SENSITIVE_KEYS.has(key) || SENSITIVE_KEYS.has(lowerKey)) {
      result[key] = '[REDACTED]';
      continue;
    }

    // Partially redact identifier keys
    if (IDENTIFIER_KEYS.has(key) || IDENTIFIER_KEYS.has(lowerKey)) {
      if (typeof value === 'string') {
        result[key] = redactIdentifier(value);
      } else {
        result[key] = '[REDACTED]';
      }
      continue;
    }

    // Recursively handle nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = redactMetadata(value as Record<string, unknown>);
      continue;
    }

    // Pass through safe values
    result[key] = value;
  }

  return result;
};
