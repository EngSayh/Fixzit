/**
 * Centralized Field-Level Error Code System
 * Provides standardized error codes, messages, and types for consistent
 * field validation across all forms in the application.
 * 
 * @module lib/errors/field-errors
 */

// =============================================================================
// Error Code Enums
// =============================================================================

export enum AuthErrorCode {
  // Missing field errors
  MISSING_EMAIL = "MISSING_EMAIL",
  MISSING_PASSWORD = "MISSING_PASSWORD",
  MISSING_USERNAME = "MISSING_USERNAME",
  MISSING_NAME = "MISSING_NAME",
  MISSING_PHONE = "MISSING_PHONE",
  MISSING_ORG_NAME = "MISSING_ORG_NAME",
  
  // Invalid format errors
  INVALID_EMAIL = "INVALID_EMAIL",
  INVALID_PASSWORD = "INVALID_PASSWORD",
  INVALID_PHONE = "INVALID_PHONE",
  
  // Credential errors
  INCORRECT_EMAIL = "INCORRECT_EMAIL",
  INCORRECT_PASSWORD = "INCORRECT_PASSWORD",
  INCORRECT_USERNAME = "INCORRECT_USERNAME",
  
  // Account state errors
  ACCOUNT_DISABLED = "ACCOUNT_DISABLED",
  ACCOUNT_NOT_VERIFIED = "ACCOUNT_NOT_VERIFIED",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  
  // Duplicate/conflict errors
  EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS",
  USERNAME_ALREADY_EXISTS = "USERNAME_ALREADY_EXISTS",
  
  // Password requirements
  PASSWORD_TOO_SHORT = "PASSWORD_TOO_SHORT",
  PASSWORD_TOO_WEAK = "PASSWORD_TOO_WEAK",
  PASSWORD_MISMATCH = "PASSWORD_MISMATCH",
  
  // Rate limiting
  TOO_MANY_ATTEMPTS = "TOO_MANY_ATTEMPTS",
  
  // Generic
  SERVER_ERROR = "SERVER_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
}

// =============================================================================
// Field Names (for type safety)
// =============================================================================

export type AuthFieldName =
  | "email"
  | "password"
  | "confirmPassword"
  | "username"
  | "name"
  | "firstName"
  | "lastName"
  | "phone"
  | "orgName"
  | "orgId"
  | "accessKey"
  | "secretKey";

// =============================================================================
// Error Response Types
// =============================================================================

/**
 * Standardized error response from API endpoints
 */
export interface FieldErrorResponse {
  /** Human-readable error message */
  error: string;
  /** Machine-readable error code */
  code: AuthErrorCode;
  /** Field name that failed validation (if applicable) */
  field?: AuthFieldName;
  /** Additional context for debugging */
  details?: Record<string, unknown>;
}

/**
 * Field errors state for frontend forms
 */
export type FieldErrors = Partial<Record<AuthFieldName, string>>;

// =============================================================================
// Error Messages
// =============================================================================

/**
 * Human-readable error messages mapped to error codes
 */
export const ERROR_MESSAGES: Record<AuthErrorCode, string> = {
  // Missing field errors
  [AuthErrorCode.MISSING_EMAIL]: "Email address is required",
  [AuthErrorCode.MISSING_PASSWORD]: "Password is required",
  [AuthErrorCode.MISSING_USERNAME]: "Username is required",
  [AuthErrorCode.MISSING_NAME]: "Name is required",
  [AuthErrorCode.MISSING_PHONE]: "Phone number is required",
  [AuthErrorCode.MISSING_ORG_NAME]: "Organization name is required",
  
  // Invalid format errors
  [AuthErrorCode.INVALID_EMAIL]: "Please enter a valid email address",
  [AuthErrorCode.INVALID_PASSWORD]: "Password does not meet requirements",
  [AuthErrorCode.INVALID_PHONE]: "Please enter a valid phone number",
  
  // Credential errors
  [AuthErrorCode.INCORRECT_EMAIL]: "Email address is incorrect",
  [AuthErrorCode.INCORRECT_PASSWORD]: "Password is incorrect",
  [AuthErrorCode.INCORRECT_USERNAME]: "Username is incorrect",
  
  // Account state errors
  [AuthErrorCode.ACCOUNT_DISABLED]: "Account has been disabled. Contact support.",
  [AuthErrorCode.ACCOUNT_NOT_VERIFIED]: "Please verify your email address",
  [AuthErrorCode.ACCOUNT_LOCKED]: "Account is locked due to multiple failed attempts",
  
  // Duplicate/conflict errors
  [AuthErrorCode.EMAIL_ALREADY_EXISTS]: "An account with this email already exists",
  [AuthErrorCode.USERNAME_ALREADY_EXISTS]: "This username is already taken",
  
  // Password requirements
  [AuthErrorCode.PASSWORD_TOO_SHORT]: "Password must be at least 8 characters",
  [AuthErrorCode.PASSWORD_TOO_WEAK]: "Password is too weak. Use a mix of letters, numbers, and symbols",
  [AuthErrorCode.PASSWORD_MISMATCH]: "Passwords do not match",
  
  // Rate limiting
  [AuthErrorCode.TOO_MANY_ATTEMPTS]: "Too many attempts. Please try again later",
  
  // Generic
  [AuthErrorCode.SERVER_ERROR]: "Server error. Please try again",
  [AuthErrorCode.NETWORK_ERROR]: "Network error. Please check your connection",
};

/**
 * Map error codes to their associated field names
 */
export const ERROR_CODE_TO_FIELD: Partial<Record<AuthErrorCode, AuthFieldName>> = {
  [AuthErrorCode.MISSING_EMAIL]: "email",
  [AuthErrorCode.INVALID_EMAIL]: "email",
  [AuthErrorCode.INCORRECT_EMAIL]: "email",
  [AuthErrorCode.EMAIL_ALREADY_EXISTS]: "email",
  
  [AuthErrorCode.MISSING_PASSWORD]: "password",
  [AuthErrorCode.INVALID_PASSWORD]: "password",
  [AuthErrorCode.INCORRECT_PASSWORD]: "password",
  [AuthErrorCode.PASSWORD_TOO_SHORT]: "password",
  [AuthErrorCode.PASSWORD_TOO_WEAK]: "password",
  
  [AuthErrorCode.PASSWORD_MISMATCH]: "confirmPassword",
  
  [AuthErrorCode.MISSING_USERNAME]: "username",
  [AuthErrorCode.INCORRECT_USERNAME]: "username",
  [AuthErrorCode.USERNAME_ALREADY_EXISTS]: "username",
  
  [AuthErrorCode.MISSING_NAME]: "name",
  [AuthErrorCode.MISSING_PHONE]: "phone",
  [AuthErrorCode.INVALID_PHONE]: "phone",
  [AuthErrorCode.MISSING_ORG_NAME]: "orgName",
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a standardized field error response
 */
export function createFieldError(
  code: AuthErrorCode,
  field?: AuthFieldName,
  details?: Record<string, unknown>
): FieldErrorResponse {
  return {
    error: ERROR_MESSAGES[code],
    code,
    field: field || ERROR_CODE_TO_FIELD[code],
    details,
  };
}

/**
 * Extract field errors from API response
 */
export function extractFieldErrors(response: FieldErrorResponse): FieldErrors {
  if (!response.field) return {};
  return {
    [response.field]: response.error,
  };
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  valid: boolean;
  code?: AuthErrorCode;
} {
  if (!password) {
    return { valid: false, code: AuthErrorCode.MISSING_PASSWORD };
  }
  
  if (password.length < 8) {
    return { valid: false, code: AuthErrorCode.PASSWORD_TOO_SHORT };
  }
  
  // Check for basic strength: at least one letter and one number
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  if (!hasLetter || !hasNumber) {
    return { valid: false, code: AuthErrorCode.PASSWORD_TOO_WEAK };
  }
  
  return { valid: true };
}

/**
 * Validate phone number format (international)
 */
export function isValidPhone(phone: string): boolean {
  // Remove all non-digit characters for validation
  const digitsOnly = phone.replace(/\D/g, '');
  // Should have 10-15 digits
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

/**
 * Client-side field validation before API call
 */
export function validateAuthFields(fields: {
  email?: string;
  password?: string;
  confirmPassword?: string;
  username?: string;
  name?: string;
  phone?: string;
}): FieldErrors {
  const errors: FieldErrors = {};
  
  // Email validation
  if (fields.email !== undefined) {
    if (!fields.email.trim()) {
      errors.email = ERROR_MESSAGES[AuthErrorCode.MISSING_EMAIL];
    } else if (!isValidEmail(fields.email)) {
      errors.email = ERROR_MESSAGES[AuthErrorCode.INVALID_EMAIL];
    }
  }
  
  // Password validation
  if (fields.password !== undefined) {
    const passwordValidation = validatePassword(fields.password);
    if (!passwordValidation.valid && passwordValidation.code) {
      errors.password = ERROR_MESSAGES[passwordValidation.code];
    }
  }
  
  // Confirm password validation
  if (fields.confirmPassword !== undefined && fields.password !== undefined) {
    if (fields.confirmPassword !== fields.password) {
      errors.confirmPassword = ERROR_MESSAGES[AuthErrorCode.PASSWORD_MISMATCH];
    }
  }
  
  // Username validation
  if (fields.username !== undefined && !fields.username.trim()) {
    errors.username = ERROR_MESSAGES[AuthErrorCode.MISSING_USERNAME];
  }
  
  // Name validation
  if (fields.name !== undefined && !fields.name.trim()) {
    errors.name = ERROR_MESSAGES[AuthErrorCode.MISSING_NAME];
  }
  
  // Phone validation
  if (fields.phone !== undefined) {
    if (!fields.phone.trim()) {
      errors.phone = ERROR_MESSAGES[AuthErrorCode.MISSING_PHONE];
    } else if (!isValidPhone(fields.phone)) {
      errors.phone = ERROR_MESSAGES[AuthErrorCode.INVALID_PHONE];
    }
  }
  
  return errors;
}

/**
 * Focus field by name using DOM API
 */
export function focusField(fieldName: string, delay = 100): void {
  setTimeout(() => {
    const element = document.getElementById(fieldName);
    if (element) {
      element.focus();
      // Scroll into view if needed
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, delay);
}

/**
 * Get CSS classes for field with error state
 */
export function getFieldClassName(
  baseClassName: string,
  hasError: boolean
): string {
  if (!hasError) return baseClassName;
  return `${baseClassName} border-red-500 focus-visible:ring-red-500`;
}
