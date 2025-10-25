/**
 * Signup Configuration
 * 
 * Centralized configuration for signup page constants
 */

export type Lang = { 
  code: string; 
  native: string; 
  flag: string; 
  dir: 'ltr' | 'rtl' 
};

export type Currency = {
  code: string;
  symbol: string;
  name: string;
};

export type UserType = {
  value: 'personal' | 'corporate' | 'vendor';
  labelKey: string;
  descriptionKey: string;
};

export const SIGNUP_LANGUAGES: Lang[] = [
  { code: 'ar', native: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'en', native: 'English', flag: '🇬🇧', dir: 'ltr' },
];

export const SIGNUP_CURRENCIES: Currency[] = [
  { code: 'SAR', symbol: 'ر.س', name: 'Saudi Riyal' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
];

export const SIGNUP_USER_TYPES: UserType[] = [
  { 
    value: 'personal', 
    labelKey: 'signup.accountType.personal',
    descriptionKey: 'signup.accountType.personalDesc'
  },
  { 
    value: 'corporate', 
    labelKey: 'signup.accountType.corporate',
    descriptionKey: 'signup.accountType.corporateDesc'
  },
  { 
    value: 'vendor', 
    labelKey: 'signup.accountType.vendor',
    descriptionKey: 'signup.accountType.vendorDesc'
  },
];

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSymbol: true,
  minScore: 3,
} as const;

export const STORAGE_KEYS = {
  language: 'fxz.lang',
  currency: 'fixzit-currency',
} as const;

export const SIGNUP_DEFAULTS = {
  language: 'en',
  currency: 'SAR',
  userType: 'personal',
  newsletter: true,
} as const;
