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
 * Builds a composite OTP key that includes company code for corporate logins.
 * For personal logins (no company code), returns just the identifier.
 * 
 * @param identifier - Login identifier (email or employee ID)
 * @param companyCode - Normalized company code (null for personal logins)
 * @returns Composite key for OTP storage: "identifier::companyCode" or just "identifier"
 * 
 * @example
 * buildOtpKey("EMP001", "ACME-001") // "EMP001::ACME-001"
 * buildOtpKey("user@email.com", null) // "user@email.com"
 */
export const buildOtpKey = (
  identifier: string,
  companyCode: string | null
): string => (companyCode ? `${identifier}::${companyCode}` : identifier);

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
