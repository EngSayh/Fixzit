// Avoid throwing in test runner (vitest sets VITEST=1) while preserving server-only intent in production.
if (!process.env.VITEST) {
  void import("server-only");
}

// PayTabs configuration
// Note: Credentials validation is done lazily at runtime when PayTabs functions are called
// This prevents module import failures in environments where PayTabs is not configured
export const PAYTABS_CONFIG = {
  profileId: process.env.PAYTABS_PROFILE_ID,
  serverKey: process.env.PAYTABS_SERVER_KEY,
  baseUrl: process.env.PAYTABS_BASE_URL || "https://secure.paytabs.sa",
};

/**
 * Validates that PayTabs credentials are configured
 * Call this at the start of any PayTabs operation
 */
export function validatePayTabsConfig(): void {
  if (!PAYTABS_CONFIG.profileId || !PAYTABS_CONFIG.serverKey) {
    throw new Error(
      "PayTabs credentials not configured. Please set PAYTABS_PROFILE_ID and PAYTABS_SERVER_KEY environment variables. " +
        "See documentation: https://docs.paytabs.com/setup",
    );
  }
}
