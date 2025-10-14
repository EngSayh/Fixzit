/**
 * PayTabs Configuration
 * Canonical location for PayTabs integration settings
 * 
 * @module lib/paytabs/config
 */

import 'server-only';

// Validate required PayTabs credentials on module load
if (!process.env.PAYTABS_PROFILE_ID || !process.env.PAYTABS_SERVER_KEY) {
  throw new Error(
    'PayTabs credentials not configured. Please set PAYTABS_PROFILE_ID and PAYTABS_SERVER_KEY environment variables. ' +
    'See documentation: https://docs.paytabs.com/setup'
  );
}

export const PAYTABS_CONFIG = {
  profileId: process.env.PAYTABS_PROFILE_ID!,
  serverKey: process.env.PAYTABS_SERVER_KEY!,
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
