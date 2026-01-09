/**
 * @fileoverview Shared Authentication Types for Mobile
 * @module mobile/shared-types/auth
 */

/**
 * Mobile user session
 */
export interface MobileUser {
  id: string;
  email: string;
  phone?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role: MobileUserRole;
  orgId: string;
  orgName?: string;
  locale: "en" | "ar";
  timezone?: string;
}

/**
 * Mobile-specific roles (simplified)
 */
export type MobileUserRole =
  | "TECHNICIAN"
  | "TENANT"
  | "OWNER"
  | "MANAGER"
  | "ADMIN";

/**
 * Authentication tokens
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix timestamp
  tokenType: "Bearer";
}

/**
 * Login request (phone + OTP)
 */
export interface MobileLoginRequest {
  phone: string;
  otp: string;
  deviceId?: string;
  pushToken?: string;
}

/**
 * Login response
 */
export interface MobileLoginResponse {
  success: boolean;
  user?: MobileUser;
  tokens?: AuthTokens;
  error?: string;
}

/**
 * OTP request
 */
export interface MobileOtpRequest {
  phone: string;
  locale?: "en" | "ar";
}

/**
 * OTP response
 */
export interface MobileOtpResponse {
  success: boolean;
  message?: string;
  expiresIn?: number; // seconds
  error?: string;
}

/**
 * Token refresh request
 */
export interface TokenRefreshRequest {
  refreshToken: string;
}

/**
 * Token refresh response
 */
export interface TokenRefreshResponse {
  success: boolean;
  tokens?: AuthTokens;
  error?: string;
}

/**
 * Device registration
 */
export interface DeviceRegistration {
  deviceId: string;
  platform: "ios" | "android";
  pushToken?: string;
  appVersion: string;
  osVersion: string;
  model?: string;
}

/**
 * Session validation result
 */
export interface SessionValidation {
  valid: boolean;
  user?: MobileUser;
  needsRefresh?: boolean;
  reason?: string;
}
