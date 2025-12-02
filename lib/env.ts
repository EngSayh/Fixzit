const isTestEnv =
  process.env.NODE_ENV === "test" ||
  process.env.VITEST_WORKER_ID !== undefined ||
  process.env.JEST_WORKER_ID !== undefined;

type RequireEnvOptions = {
  /**
   * Allow returning an empty string (for flags). Defaults to false.
   */
  allowEmpty?: boolean;
  /**
   * Provide a fallback specifically for test environments.
   */
  testFallback?: string;
  /**
   * Alternative env var names to check (aliases for different naming conventions).
   * Useful when Vercel uses different names than the codebase.
   */
  aliases?: string[];
};

export const TEST_JWT_SECRET =
  "test-secret-key-for-jest-tests-minimum-32-characters-long";

/**
 * Environment variable aliases for Vercel naming convention compatibility.
 * Maps codebase names → alternative names used in Vercel dashboard.
 * 
 * Example: SENDGRID_API_KEY might be stored as SEND_GRID or SEND_GRID_EMAIL_FIXZIT_TOKEN
 */
const ENV_ALIASES: Record<string, string[]> = {
  // SendGrid - Vercel uses various naming conventions
  SENDGRID_API_KEY: ["SEND_GRID", "SEND_GRID_EMAIL_FIXZIT_TOKEN", "SENDGRID"],
  // Google OAuth - alternative naming
  GOOGLE_CLIENT_ID: ["OAUTH_CLIENT_GOOGLE_ID"],
  GOOGLE_CLIENT_SECRET: ["OAUTH_CLIENT_GOOGLE_SECRET", "OAUTH_CLIENT_GOOGLE"],
};

/**
 * Get environment variable value, checking aliases if primary name not found.
 */
function getEnvWithAliases(name: string, aliases?: string[]): string | undefined {
  // Check primary name first
  const primaryValue = process.env[name];
  if (primaryValue !== undefined && primaryValue !== "") {
    return primaryValue;
  }

  // Check configured aliases
  const configuredAliases = aliases || ENV_ALIASES[name] || [];
  for (const alias of configuredAliases) {
    const aliasValue = process.env[alias];
    if (aliasValue !== undefined && aliasValue !== "") {
      return aliasValue;
    }
  }

  return undefined;
}

export function requireEnv(
  name: string,
  options: RequireEnvOptions = {},
): string {
  const value = getEnvWithAliases(name, options.aliases);
  const hasValue =
    value !== undefined && (options.allowEmpty || value.trim() !== "");

  if (hasValue) {
    return value as string;
  }

  if (isTestEnv && options.testFallback !== undefined) {
    process.env[name] = options.testFallback;
    return options.testFallback;
  }

  // Build helpful error message with aliases
  const aliases = options.aliases || ENV_ALIASES[name] || [];
  const aliasInfo = aliases.length > 0 ? ` (also checked: ${aliases.join(", ")})` : "";
  
  throw new Error(
    `Missing required environment variable "${name}"${aliasInfo}. Set it in your environment or secrets manager.`,
  );
}

export function getEnv(name: string, fallback?: string): string | undefined {
  const value = getEnvWithAliases(name);
  if (value === undefined || value === "") {
    return fallback;
  }
  return value;
}
