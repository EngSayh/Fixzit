/**
 * Central Configuration Constants
 * 
 * ✅ SINGLE SOURCE OF TRUTH for all application-wide constants
 * CRITICAL: All providers and components MUST import from this file
 */

export const STORAGE_KEYS = {
  // Language/Translation
  language: 'fxz.lang',
  locale: 'fxz.locale',
  
  // Currency
  currency: 'fixzit-currency',
  
  // Theme
  theme: 'fixzit-theme',
  
  // UI State
  topbarApp: 'fixzit-topbar-app',
  sidebarCollapsed: 'fxz.sidebar.collapsed',
  
  // Auth/User (used for error reporting and dev fallbacks)
  user: 'x-user',
  role: 'fixzit-role',
  
  // Data
  aiChatHistory: 'fxz.ai-chat-history',
  recentSearches: 'fxz.search.recent',
} as const;

/**
 * Storage key prefixes for pattern-based cleanup
 */
export const STORAGE_PREFIXES = {
  app: 'fixzit-',
  shortDash: 'fxz-',
  shortDot: 'fxz.',
} as const;

/**
 * Convenience list of all app storage keys for cleanup operations
 */
export const APP_STORAGE_KEYS = Object.values(STORAGE_KEYS) as readonly string[];

/**
 * Cookie keys used for server-side rendering
 */
export const COOKIE_KEYS = {
  language: 'fxz.lang',
  locale: 'fxz.locale',
  theme: 'fxz.theme',
  currency: 'fixzit-currency',
} as const;

/**
 * Application defaults (KSA-first)
 */
export const APP_DEFAULTS = {
  language: 'ar' as const,
  locale: 'ar-SA',
  currency: 'SAR',
  theme: 'light' as const,
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
