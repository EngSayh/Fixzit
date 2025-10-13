/**
 * PayTabs Configuration
 * Canonical location for PayTabs integration settings
 * 
 * @module lib/paytabs/config
 */

import 'server-only';

export const PAYTABS_CONFIG: { profileId: string; serverKey: string; baseUrl: string } = {
  profileId: (process.env.PAYTABS_PROFILE_ID || '') as string,
  serverKey: (process.env.PAYTABS_SERVER_KEY || '') as string,
  baseUrl: (process.env.PAYTABS_BASE_URL || 'https://secure.paytabs.sa') as string,
};

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
