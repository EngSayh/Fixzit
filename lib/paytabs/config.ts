/**
 * PayTabs Configuration
 * Canonical location for PayTabs integration settings
 * 
 * @module lib/paytabs/config
 */

import 'server-only';

// Runtime validation to ensure required environment variables are present
const profileId = process.env.PAYTABS_PROFILE_ID;
const serverKey = process.env.PAYTABS_SERVER_KEY;

if (!profileId) {
  throw new Error('PAYTABS_PROFILE_ID environment variable is required');
}

if (!serverKey) {
  throw new Error('PAYTABS_SERVER_KEY environment variable is required');
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
