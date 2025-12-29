/**
 * @fileoverview Password Policy Service - Enforce password security requirements
 * @module lib/auth/passwordPolicy
 * 
 * Implements password complexity, history, and expiration policies
 * for compliance with security standards.
 * 
 * @features
 * - Configurable password complexity rules
 * - Password history tracking (prevent reuse)
 * - Password expiration enforcement
 * - Account lockout after failed attempts
 * - Strength scoring for user feedback
 * 
 * @compliance
 * - NIST SP 800-63B guidelines
 * - ISO 27001 password requirements
 * - ZATCA security requirements
 * 
 * @author [AGENT-001-A]
 * @created 2025-12-28
 */

import { compare } from "bcryptjs";
import crypto from "crypto";
import { logger } from "@/lib/logger";
import { getDatabase } from "@/lib/mongodb-unified";

// ============================================================================
// Types & Configuration
// ============================================================================

/**
 * Password policy configuration
 */
export interface PasswordPolicy {
  // Complexity
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  specialChars: string;
  
  // History
  historyCount: number; // Number of previous passwords to remember
  
  // Expiration
  expirationDays: number; // 0 = never expires
  warningDays: number; // Days before expiry to warn
  
  // Lockout
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  
  // Common passwords
  blockCommonPasswords: boolean;
}

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  strength: PasswordStrength;
  score: number; // 0-100
}

/**
 * Password strength levels
 */
export enum PasswordStrength {
  VERY_WEAK = "VERY_WEAK",
  WEAK = "WEAK",
  FAIR = "FAIR",
  STRONG = "STRONG",
  VERY_STRONG = "VERY_STRONG",
}

/**
 * Password history entry (used in database schema)
 */
interface _PasswordHistoryEntry {
  hash: string;
  createdAt: Date;
}

// ============================================================================
// Default Policy
// ============================================================================

const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: "!@#$%^&*()_+-=[]{}|;:',.<>?/~`",
  historyCount: 5,
  expirationDays: 90,
  warningDays: 14,
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 30,
  blockCommonPasswords: true,
};

// Common weak passwords to block
const COMMON_PASSWORDS = new Set([
  "password", "123456", "12345678", "qwerty", "abc123",
  "monkey", "1234567", "letmein", "trustno1", "dragon",
  "baseball", "iloveyou", "master", "sunshine", "ashley",
  "bailey", "shadow", "123123", "654321", "superman",
  "qazwsx", "michael", "football", "password1", "password123",
  "welcome", "admin", "login", "princess", "starwars",
  "fixzit", "fixzit123", "admin123", "manager", "manager123",
]);

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get password policy for an organization
 */
export async function getPasswordPolicy(orgId: string): Promise<PasswordPolicy> {
  try {
    const db = await getDatabase();
    const settings = await db.collection("organization_settings").findOne({ orgId });
    
    if (settings?.passwordPolicy) {
      return { ...DEFAULT_POLICY, ...settings.passwordPolicy };
    }
    
    return DEFAULT_POLICY;
  } catch (error) {
    logger.error("Failed to get password policy", {
      error: error instanceof Error ? error.message : "Unknown error",
      orgId,
    });
    return DEFAULT_POLICY;
  }
}

/**
 * Validate a password against the policy
 */
export async function validatePassword(
  password: string,
  orgId: string,
  userId?: string,
  checkHistory: boolean = true
): Promise<PasswordValidationResult> {
  const policy = await getPasswordPolicy(orgId);
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Length checks
  if (password.length < policy.minLength) {
    errors.push(`Password must be at least ${policy.minLength} characters`);
  }
  if (password.length > policy.maxLength) {
    errors.push(`Password cannot exceed ${policy.maxLength} characters`);
  }
  
  // Complexity checks
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (policy.requireNumbers && !/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }
  if (policy.requireSpecialChars) {
    const specialRegex = new RegExp(`[${escapeRegex(policy.specialChars)}]`);
    if (!specialRegex.test(password)) {
      errors.push("Password must contain at least one special character");
    }
  }
  
  // Common password check
  if (policy.blockCommonPasswords) {
    const lowerPassword = password.toLowerCase();
    if (COMMON_PASSWORDS.has(lowerPassword)) {
      errors.push("This password is too common and easily guessed");
    }
    
    // Check for sequential patterns
    if (/(.)\1{2,}/.test(password)) {
      warnings.push("Avoid using repeated characters");
    }
    if (/(?:012|123|234|345|456|567|678|789|890|abc|bcd|cde|def)/i.test(password)) {
      warnings.push("Avoid using sequential patterns");
    }
  }
  
  // History check
  if (checkHistory && userId && policy.historyCount > 0) {
    const isReused = await isPasswordInHistory(orgId, userId, password);
    if (isReused) {
      errors.push(`Password was used recently. Choose a new password.`);
    }
  }
  
  // Calculate strength
  const score = calculatePasswordScore(password, policy);
  const strength = scoreToStrength(score);
  
  if (score < 60 && errors.length === 0) {
    warnings.push("Consider using a stronger password");
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    strength,
    score,
  };
}

/**
 * Calculate password strength score (0-100)
 */
export function calculatePasswordScore(password: string, policy?: PasswordPolicy): number {
  let score = 0;
  const p = policy || DEFAULT_POLICY;
  
  // Length score (up to 30 points)
  const lengthScore = Math.min(30, (password.length / 20) * 30);
  score += lengthScore;
  
  // Complexity score (up to 40 points)
  let complexityScore = 0;
  if (/[a-z]/.test(password)) complexityScore += 10;
  if (/[A-Z]/.test(password)) complexityScore += 10;
  if (/[0-9]/.test(password)) complexityScore += 10;
  const specialRegex = new RegExp(`[${escapeRegex(p.specialChars)}]`);
  if (specialRegex.test(password)) complexityScore += 10;
  score += complexityScore;
  
  // Variety score (up to 20 points)
  const uniqueChars = new Set(password).size;
  const varietyScore = Math.min(20, (uniqueChars / 15) * 20);
  score += varietyScore;
  
  // Penalties (up to -30 points)
  let penalty = 0;
  
  // Repeated characters
  const repeatedMatch = password.match(/(.)\1+/g);
  if (repeatedMatch) {
    penalty += repeatedMatch.length * 3;
  }
  
  // Sequential characters
  if (/(?:abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i.test(password)) {
    penalty += 10;
  }
  if (/(?:012|123|234|345|456|567|678|789|890)/.test(password)) {
    penalty += 10;
  }
  
  // Common words
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    penalty += 30;
  }
  
  score = Math.max(0, Math.min(100, score - penalty));
  
  return Math.round(score);
}

/**
 * Convert score to strength level
 */
function scoreToStrength(score: number): PasswordStrength {
  if (score >= 80) return PasswordStrength.VERY_STRONG;
  if (score >= 60) return PasswordStrength.STRONG;
  if (score >= 40) return PasswordStrength.FAIR;
  if (score >= 20) return PasswordStrength.WEAK;
  return PasswordStrength.VERY_WEAK;
}

// ============================================================================
// Password History
// ============================================================================

/**
 * Check if password was used recently
 */
async function isPasswordInHistory(
  orgId: string,
  userId: string,
  password: string
): Promise<boolean> {
  try {
    const db = await getDatabase();
    
    // Get org's password policy from canonical source
    const policy = await getPasswordPolicy(orgId);
    const historyCount = Math.min(
      Math.max(1, policy.historyCount ?? 5),
      24 // max reasonable cap
    );
    
    const history = await db.collection("password_history")
      .find({ orgId, userId })
      .sort({ createdAt: -1 })
      .limit(historyCount)
      .toArray();
    
    for (const entry of history) {
      const matches = await compare(password, entry.hash);
      if (matches) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    logger.error("Failed to check password history", {
      error: error instanceof Error ? error.message : "Unknown error",
      orgId,
      userId,
    });
    return false;
  }
}

/**
 * Add password to history after successful change
 */
export async function addToPasswordHistory(
  orgId: string,
  userId: string,
  passwordHash: string
): Promise<void> {
  try {
    const db = await getDatabase();
    const policy = await getPasswordPolicy(orgId);
    
    // Insert new entry
    await db.collection("password_history").insertOne({
      orgId,
      userId,
      hash: passwordHash,
      createdAt: new Date(),
    });
    
    // Clean up old entries beyond history count
    const history = await db.collection("password_history")
      .find({ orgId, userId })
      .sort({ createdAt: -1 })
      .toArray();
    
    if (history.length > policy.historyCount) {
      const toDelete = history.slice(policy.historyCount).map(h => h._id);
      await db.collection("password_history").deleteMany({
        _id: { $in: toDelete },
      });
    }
  } catch (error) {
    logger.error("Failed to add to password history", {
      error: error instanceof Error ? error.message : "Unknown error",
      orgId,
      userId,
    });
  }
}

// ============================================================================
// Password Expiration
// ============================================================================

/**
 * Check if password has expired
 */
export async function isPasswordExpired(
  orgId: string,
  passwordChangedAt?: Date
): Promise<{ expired: boolean; daysRemaining: number; warning: boolean }> {
  const policy = await getPasswordPolicy(orgId);
  
  // No expiration if set to 0
  if (policy.expirationDays === 0) {
    return { expired: false, daysRemaining: -1, warning: false };
  }
  
  if (!passwordChangedAt) {
    return { expired: true, daysRemaining: 0, warning: true };
  }
  
  const now = new Date();
  const expiryDate = new Date(passwordChangedAt);
  expiryDate.setDate(expiryDate.getDate() + policy.expirationDays);
  
  const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const expired = daysRemaining <= 0;
  const warning = !expired && daysRemaining <= policy.warningDays;
  
  return { expired, daysRemaining: Math.max(0, daysRemaining), warning };
}

// ============================================================================
// Account Lockout
// ============================================================================

/**
 * Check if account is locked
 */
export async function isAccountLocked(
  orgId: string,
  userId: string
): Promise<{ locked: boolean; remainingMinutes: number; reason?: string }> {
  try {
    const db = await getDatabase();
    const lockout = await db.collection("account_lockouts").findOne({
      orgId,
      userId,
      expiresAt: { $gt: new Date() },
    });
    
    if (!lockout) {
      return { locked: false, remainingMinutes: 0 };
    }
    
    const remainingMs = lockout.expiresAt.getTime() - Date.now();
    const remainingMinutes = Math.ceil(remainingMs / (1000 * 60));
    
    return {
      locked: true,
      remainingMinutes,
      reason: lockout.reason,
    };
  } catch (error) {
    logger.error("Failed to check account lockout - failing closed", {
      error: error instanceof Error ? error.message : "Unknown error",
      orgId,
      userId,
    });
    // Fail closed: treat DB errors as locked to prevent bypass
    throw error;
  }
}

/**
 * Lock an account
 */
export async function lockAccount(
  orgId: string,
  userId: string,
  reason: string = "Too many failed login attempts"
): Promise<void> {
  try {
    const db = await getDatabase();
    const policy = await getPasswordPolicy(orgId);
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + policy.lockoutDurationMinutes);
    
    await db.collection("account_lockouts").updateOne(
      { orgId, userId },
      {
        $set: {
          expiresAt,
          reason,
          lockedAt: new Date(),
        },
      },
      { upsert: true }
    );
    
    logger.warn("Account locked", { orgId, userId, reason, expiresAt });
  } catch (error) {
    logger.error("Failed to lock account", {
      error: error instanceof Error ? error.message : "Unknown error",
      orgId,
      userId,
    });
  }
}

/**
 * Unlock an account
 */
export async function unlockAccount(
  orgId: string,
  userId: string
): Promise<void> {
  try {
    const db = await getDatabase();
    
    await db.collection("account_lockouts").deleteOne({ orgId, userId });
    
    logger.info("Account unlocked", { orgId, userId });
  } catch (error) {
    logger.error("Failed to unlock account", {
      error: error instanceof Error ? error.message : "Unknown error",
      orgId,
      userId,
    });
  }
}

/**
 * Record failed login attempt and check for lockout
 */
export async function recordFailedAttempt(
  orgId: string,
  userId: string
): Promise<{ shouldLock: boolean; attemptCount: number }> {
  try {
    const db = await getDatabase();
    const policy = await getPasswordPolicy(orgId);
    
    // Increment failed attempts
    const result = await db.collection("login_attempts").findOneAndUpdate(
      { orgId, userId },
      {
        $inc: { count: 1 },
        $set: { lastAttempt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, returnDocument: "after" }
    );
    
    const attemptCount = result?.count || 1;
    const shouldLock = attemptCount >= policy.maxFailedAttempts;
    
    if (shouldLock) {
      await lockAccount(orgId, userId);
      // Reset counter after lockout
      await db.collection("login_attempts").deleteOne({ orgId, userId });
    }
    
    return { shouldLock, attemptCount };
  } catch (error) {
    logger.error("Failed to record failed attempt", {
      error: error instanceof Error ? error.message : "Unknown error",
      orgId,
      userId,
    });
    return { shouldLock: false, attemptCount: 0 };
  }
}

/**
 * Clear failed attempts on successful login
 */
export async function clearFailedAttempts(
  orgId: string,
  userId: string
): Promise<void> {
  try {
    const db = await getDatabase();
    await db.collection("login_attempts").deleteOne({ orgId, userId });
  } catch (error) {
    logger.error("Failed to clear failed attempts", {
      error: error instanceof Error ? error.message : "Unknown error",
      orgId,
      userId,
    });
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

/**
 * Generate a strong random password
 */
export function generateStrongPassword(length: number = 16): string {
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // Removed I, O (confusing)
  const lowercase = "abcdefghjkmnpqrstuvwxyz"; // Removed i, l, o (confusing)
  const numbers = "23456789"; // Removed 0, 1 (confusing)
  const special = "!@#$%^&*_+-=";
  
  const allChars = uppercase + lowercase + numbers + special;
  
  // Ensure at least one of each type using CSPRNG
  let password = "";
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += special[crypto.randomInt(special.length)];
  
  // Fill the rest randomly using CSPRNG
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }
  
  // Fisher-Yates shuffle using CSPRNG
  const chars = password.split("");
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  
  return chars.join("");
}
