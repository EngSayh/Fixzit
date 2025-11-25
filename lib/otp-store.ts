/**
 * Shared OTP store for SMS verification
 *
 * In production, replace this with Redis or database storage
 * for distributed systems and persistence.
 */

export interface OTPData {
  otp: string;
  expiresAt: number;
  attempts: number;
  userId: string;
  phone: string;
}

export interface RateLimitData {
  count: number;
  resetAt: number;
}

export interface OTPLoginSession {
  userId: string;
  identifier: string;
  expiresAt: number;
}

// In-memory stores (use Redis in production)
export const otpStore = new Map<string, OTPData>();
export const rateLimitStore = new Map<string, RateLimitData>();
export const otpSessionStore = new Map<string, OTPLoginSession>();

// Constants
export const OTP_LENGTH = 6;
export const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
export const MAX_ATTEMPTS = 3;
export const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
export const MAX_SENDS_PER_WINDOW = 5;
export const OTP_SESSION_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Cleanup expired OTPs periodically (every 10 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();

      // Clean up expired OTPs
      for (const [identifier, data] of otpStore.entries()) {
        if (now > data.expiresAt) {
          otpStore.delete(identifier);
        }
      }

      // Clean up expired rate limits
      for (const [identifier, data] of rateLimitStore.entries()) {
        if (now > data.resetAt) {
          rateLimitStore.delete(identifier);
        }
      }

      // Clean up expired OTP login sessions
      for (const [token, session] of otpSessionStore.entries()) {
        if (now > session.expiresAt) {
          otpSessionStore.delete(token);
        }
      }
    },
    10 * 60 * 1000,
  ); // 10 minutes
}
