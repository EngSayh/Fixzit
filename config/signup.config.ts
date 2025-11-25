/**
 * Signup Configuration
 *
 * ✅ REFACTORED: Imports from single source of truth
 * No more DRY violations - all data comes from central config
 */

// ✅ FIX: Import from central config (single source of truth)
import { LANGUAGE_OPTIONS, type LanguageOption } from "./language-options";
import { CURRENCIES, type Currency } from "./currencies";
import { APP_DEFAULTS } from "./constants";

// Re-export types for convenience
export type { LanguageOption, Currency };

export type UserType = {
  value: "personal" | "corporate" | "vendor";
  labelKey: string;
  descriptionKey: string;
};

// ✅ REMOVED: SIGNUP_LANGUAGES (use LANGUAGE_OPTIONS directly)
// ✅ REMOVED: SIGNUP_CURRENCIES (use CURRENCIES directly)

// Re-export for backward compatibility with existing imports
export { LANGUAGE_OPTIONS as SIGNUP_LANGUAGES };
export { CURRENCIES as SIGNUP_CURRENCIES };

export const SIGNUP_USER_TYPES: UserType[] = [
  {
    value: "personal",
    labelKey: "signup.accountType.personal",
    descriptionKey: "signup.accountType.personalDesc",
  },
  {
    value: "corporate",
    labelKey: "signup.accountType.corporate",
    descriptionKey: "signup.accountType.corporateDesc",
  },
  {
    value: "vendor",
    labelKey: "signup.accountType.vendor",
    descriptionKey: "signup.accountType.vendorDesc",
  },
];

/**
 * Password strength requirements
 *
 * Scoring system (via zxcvbn library):
 * - Score range: 0-4
 * - 0: Too guessable (risky password)
 * - 1: Very guessable (protection from throttled online attacks)
 * - 2: Somewhat guessable (protection from unthrottled online attacks)
 * - 3: Safely unguessable (moderate protection from offline slow-hash scenario)
 * - 4: Very unguessable (strong protection from offline slow-hash scenario)
 *
 * minScore of 3 ensures "safely unguessable" passwords are required.
 */
export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: true,
  minScore: 3,
} as const;

// ✅ REMOVED: STORAGE_KEYS (import from config/constants.ts)
// All components must import STORAGE_KEYS from the central config

export const SIGNUP_DEFAULTS = {
  // ✅ FIX: Changed to 'ar' to match system-wide default from APP_DEFAULTS
  language: APP_DEFAULTS.language,
  currency: APP_DEFAULTS.currency,
  userType: "personal" as const,
  newsletter: true,
} as const;
