/**
 * Central Tap Payments Configuration Helper
 *
 * This module provides a single source of truth for all Tap Payments environment variables.
 * It reads from standardized env var names and provides environment-aware key selection.
 *
 * Environment Variables (Server-side - NEVER expose to client):
 * - TAP_TEST_SECRET_KEY: Test mode secret API key
 * - TAP_LIVE_SECRET_KEY: Live/Production mode secret API key
 * - TAP_MERCHANT_ID: Merchant identifier
 * - TAP_ACCOUNT_ID: Account identifier
 * - TAP_API_KEY: API key
 * - TAP_GOSELL_USERNAME: goSell username
 * - TAP_GOSELL_PASSWORD: goSell password
 * - TAP_WEBHOOK_SECRET: Webhook signing secret (if configured separately)
 *
 * Environment Variables (Client-safe - can be used in browser):
 * - NEXT_PUBLIC_TAP_TEST_PUBLIC_KEY: Test mode publishable key
 * - NEXT_PUBLIC_TAP_LIVE_PUBLIC_KEY: Live/Production mode publishable key
 *
 * Environment Selector:
 * - TAP_ENVIRONMENT: "test" or "live" (defaults to NODE_ENV-based detection)
 */

/**
 * Tap configuration object with all required keys
 */
export interface TapConfig {
  /** Whether running in production/live mode */
  isProd: boolean;
  /** Environment name: "test" or "live" */
  environment: "test" | "live";
  /** Active secret key (test or live based on environment) */
  secretKey: string;
  /** Active public key (test or live based on environment) */
  publicKey: string;
  /** Merchant identifier */
  merchantId: string;
  /** Account identifier */
  accountId: string;
  /** API key */
  apiKey: string;
  /** goSell username */
  goSellUsername: string;
  /** goSell password */
  goSellPassword: string;
  /** Webhook signing secret */
  webhookSecret: string;
  /** Whether Tap is fully configured */
  isConfigured: boolean;
  /** Missing required env vars (if any) */
  missingVars: string[];
}

/**
 * Required server-side environment variables
 * @internal Used for documentation/validation reference
 */
const _REQUIRED_SERVER_VARS = [
  "TAP_TEST_SECRET_KEY",
  "TAP_LIVE_SECRET_KEY",
] as const;

/**
 * Required client-side environment variables
 * @internal Used for documentation/validation reference
 */
const _REQUIRED_PUBLIC_VARS = [
  "NEXT_PUBLIC_TAP_TEST_PUBLIC_KEY",
  "NEXT_PUBLIC_TAP_LIVE_PUBLIC_KEY",
] as const;

/**
 * Determine if we're in production mode based on TAP_ENVIRONMENT or NODE_ENV
 */
function determineEnvironment(): "test" | "live" {
  const tapEnv = process.env.TAP_ENVIRONMENT?.toLowerCase();

  // Explicit TAP_ENVIRONMENT takes precedence
  if (tapEnv === "live" || tapEnv === "production") {
    return "live";
  }
  if (tapEnv === "test" || tapEnv === "development" || tapEnv === "sandbox") {
    return "test";
  }

  // Fall back to NODE_ENV
  return process.env.NODE_ENV === "production" ? "live" : "test";
}

/**
 * Get Tap configuration with environment-aware key selection
 *
 * @returns TapConfig object with all configuration values
 */
export function getTapConfig(): TapConfig {
  const environment = determineEnvironment();
  const isProd = environment === "live";

  // Select appropriate keys based on environment
  const secretKey = isProd
    ? process.env.TAP_LIVE_SECRET_KEY || ""
    : process.env.TAP_TEST_SECRET_KEY || "";

  const publicKey = isProd
    ? process.env.NEXT_PUBLIC_TAP_LIVE_PUBLIC_KEY || ""
    : process.env.NEXT_PUBLIC_TAP_TEST_PUBLIC_KEY || "";

  // Get other configuration values
  const merchantId = process.env.TAP_MERCHANT_ID || "";
  const accountId = process.env.TAP_ACCOUNT_ID || "";
  const apiKey = process.env.TAP_API_KEY || "";
  const goSellUsername = process.env.TAP_GOSELL_USERNAME || "";
  const goSellPassword = process.env.TAP_GOSELL_PASSWORD || "";
  const webhookSecret = process.env.TAP_WEBHOOK_SECRET || "";

  // Check for missing required variables
  const missingVars: string[] = [];

  if (!process.env.TAP_TEST_SECRET_KEY) {
    missingVars.push("TAP_TEST_SECRET_KEY");
  }
  if (!process.env.TAP_LIVE_SECRET_KEY) {
    missingVars.push("TAP_LIVE_SECRET_KEY");
  }
  if (!process.env.NEXT_PUBLIC_TAP_TEST_PUBLIC_KEY) {
    missingVars.push("NEXT_PUBLIC_TAP_TEST_PUBLIC_KEY");
  }
  if (!process.env.NEXT_PUBLIC_TAP_LIVE_PUBLIC_KEY) {
    missingVars.push("NEXT_PUBLIC_TAP_LIVE_PUBLIC_KEY");
  }

  // Tap is configured if we have at least the active secret and public keys
  const isConfigured = Boolean(secretKey && publicKey);

  return {
    isProd,
    environment,
    secretKey,
    publicKey,
    merchantId,
    accountId,
    apiKey,
    goSellUsername,
    goSellPassword,
    webhookSecret,
    isConfigured,
    missingVars,
  };
}

/**
 * Assert that Tap is properly configured.
 * Throws a detailed error if any required configuration is missing.
 *
 * @param context - Context description for the error message (e.g., "create charge")
 * @throws Error with detailed message about missing configuration
 */
export function assertTapConfig(context: string = "Tap operation"): TapConfig {
  const config = getTapConfig();

  if (!config.isConfigured) {
    const missing = config.missingVars.length > 0 
      ? config.missingVars.join(", ") 
      : `${config.environment === "live" ? "TAP_LIVE_SECRET_KEY" : "TAP_TEST_SECRET_KEY"} or public key`;
    
    throw new Error(
      `Tap Payments is not configured for ${context}. ` +
      `Missing: ${missing}. ` +
      `Current environment: ${config.environment}. ` +
      `Set the required environment variables in Vercel/GitHub.`
    );
  }

  return config;
}

/**
 * Get the public key for client-side use (card tokenization).
 * Safe to call from client components as it only returns public keys.
 *
 * @returns The appropriate public key for the current environment
 */
export function getTapPublicKey(): string {
  const config = getTapConfig();
  return config.publicKey;
}

/**
 * Check if Tap Payments is configured
 *
 * @returns true if Tap has minimum required configuration
 */
export function isTapConfigured(): boolean {
  return getTapConfig().isConfigured;
}

/**
 * Get configuration status for debugging/monitoring
 * Does NOT expose actual secret values
 *
 * @returns Status object with configuration state
 */
export function getTapConfigStatus(): {
  environment: "test" | "live";
  isConfigured: boolean;
  missingVars: string[];
  hasWebhookSecret: boolean;
  hasMerchantId: boolean;
  hasAccountId: boolean;
  hasApiKey: boolean;
  hasGoSellCredentials: boolean;
} {
  const config = getTapConfig();

  return {
    environment: config.environment,
    isConfigured: config.isConfigured,
    missingVars: config.missingVars,
    hasWebhookSecret: Boolean(config.webhookSecret),
    hasMerchantId: Boolean(config.merchantId),
    hasAccountId: Boolean(config.accountId),
    hasApiKey: Boolean(config.apiKey),
    hasGoSellCredentials: Boolean(config.goSellUsername && config.goSellPassword),
  };
}

// ============================================================================
// Backward Compatibility Layer
// ============================================================================

/**
 * Get the secret key (backward compatibility for TAP_SECRET_KEY usage)
 * @deprecated Use getTapConfig().secretKey instead
 */
export function getTapSecretKey(): string {
  return getTapConfig().secretKey;
}

/**
 * Get the webhook secret
 */
export function getTapWebhookSecret(): string {
  return getTapConfig().webhookSecret;
}
