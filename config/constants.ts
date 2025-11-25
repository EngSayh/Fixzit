/**
 * Central Configuration Constants
 *
 * ✅ SINGLE SOURCE OF TRUTH for all application-wide constants
 * CRITICAL: All providers and components MUST import from this file
 */

// --- Base Keys (Define once, use everywhere) ---
const THEME_KEY = "fxz.theme";
const LANGUAGE_KEY = "fxz.lang";
const LOCALE_KEY = "fxz.locale";
const CURRENCY_KEY = "fixzit-currency";
const USER_SESSION_KEY = "fxz.user-session"; // ✅ FIX: Correct key from AutoIncidentReporter
const AI_CHAT_KEY = "fixzit-ai-chat-session"; // ✅ FIX: Correct key from useAIChatStore

export const STORAGE_KEYS = {
  // Language/Translation
  language: LANGUAGE_KEY,
  locale: LOCALE_KEY,

  // Currency
  currency: CURRENCY_KEY,

  // Theme
  theme: THEME_KEY,

  // UI State
  sidebarCollapsed: "fxz.sidebar.collapsed",

  // Auth/User (used for error reporting and dev fallbacks)
  userSession: USER_SESSION_KEY, // ✅ FIX: Renamed from 'user' and correct value
  role: "fixzit-role",

  // Data
  aiChatHistory: AI_CHAT_KEY, // ✅ FIX: Correct key
  recentSearches: "fxz.search.recent",

  // ❌ REMOVED: 'topbarApp' (obsolete, per TopBarProvider refactor)
} as const;

/**
 * Storage key prefixes for pattern-based cleanup
 */
export const STORAGE_PREFIXES = {
  app: "fixzit-",
  shortDash: "fxz-",
  shortDot: "fxz.",
} as const;

/**
 * Convenience list of all app storage keys for cleanup operations
 */
export const APP_STORAGE_KEYS = Object.values(
  STORAGE_KEYS,
) as readonly string[];

/**
 * Cookie keys used for server-side rendering
 */
export const COOKIE_KEYS = {
  // ✅ FIX: Re-use base keys. No duplication.
  language: LANGUAGE_KEY,
  locale: LOCALE_KEY,
  theme: THEME_KEY,
  currency: CURRENCY_KEY,
} as const;

/**
 * Application defaults (KSA-first)
 */
export const APP_DEFAULTS = {
  language: "ar" as const,
  locale: "ar-SA",
  currency: "SAR",
  // ✅ Theme defaults to 'system' (matches Fixzit Design System v2 brief)
  theme: "system" as const,
  timezone: "Asia/Riyadh",
} as const;

export const API_TIMEOUTS = {
  default: 30000, // 30 seconds
  upload: 120000, // 2 minutes
  download: 60000, // 1 minute
} as const;

export const PAGINATION = {
  defaultLimit: 20,
  maxLimit: 100,
  minLimit: 1,
} as const;
