/**
 * Central Configuration Constants
 * Single source of truth for storage keys and system-wide constants
 */

export const STORAGE_KEYS = {
  language: 'fxz.lang',
  locale: 'fxz.locale',
  currency: 'fixzit-currency',
  theme: 'fixzit-theme',
  topbarApp: 'fixzit-topbar-app',
  aiChatHistory: 'fxz.ai-chat-history',
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
