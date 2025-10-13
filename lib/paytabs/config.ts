/**
 * PayTabs Configuration
 * Canonical location for PayTabs integration settings
 * 
 * @module lib/paytabs/config
 */

import 'server-only';

// Runtime validation to ensure required config is present
const profileId = process.env.PAYTABS_PROFILE_ID || '';
const serverKey = process.env.PAYTABS_SERVER_KEY || '';

if (!profileId) {
  console.warn('PAYTABS_PROFILE_ID is not configured');
}

if (!serverKey) {
  console.warn('PAYTABS_SERVER_KEY is not configured');
}

export const PAYTABS_CONFIG = {
  profileId: profileId as string,
  serverKey: serverKey as string,
  baseUrl: process.env.PAYTABS_BASE_URL || 'https://secure.paytabs.sa',
} as const;

// Regional endpoints for PayTabs
export const PAYTABS_REGIONS = {
  KSA: 'https://secure.paytabs.sa',
  UAE: 'https://secure.paytabs.com',
  EGYPT: 'https://secure-egypt.paytabs.com',
  OMAN: 'https://secure-oman.paytabs.com',
  JORDAN: 'https://secure-jordan.paytabs.com',
  KUWAIT: 'https://secure-kuwait.paytabs.com',
  GLOBAL: 'https://secure-global.paytabs.com',
} as const;

export type PayTabsRegion = keyof typeof PAYTABS_REGIONS;
