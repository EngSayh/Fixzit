import 'server-only';

// Validate required PayTabs credentials on module load
if (!process.env.PAYTABS_PROFILE_ID || !process.env.PAYTABS_SERVER_KEY) {
  throw new Error(
    'PayTabs credentials not configured. Please set PAYTABS_PROFILE_ID and PAYTABS_SERVER_KEY environment variables. ' +
    'See documentation: https://docs.paytabs.com/setup'
  );
}

export const PAYTABS_CONFIG = {
  profileId: process.env.PAYTABS_PROFILE_ID,
  serverKey: process.env.PAYTABS_SERVER_KEY,
  baseUrl: process.env.PAYTABS_BASE_URL || 'https://secure.paytabs.sa'
};

