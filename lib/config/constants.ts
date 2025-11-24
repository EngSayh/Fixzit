/**
 * Centralized Configuration Constants
 *
 * Single source of truth for all environment variables
 * Provides type-safe access with runtime validation
 * Replaces direct process.env.* access throughout the codebase
 *
 * SECURITY: All env vars are validated at module load time
 * Missing required vars in production will throw errors immediately
 */

type Environment = "development" | "test" | "production";

class ConfigurationError extends Error {
  constructor(message: string) {
    super(`[Config Error] ${message}`);
    this.name = "ConfigurationError";
  }
}

/**
 * Get required environment variable (throws if missing in production)
 */
function getRequired(key: string, fallback?: string): string {
  const value = process.env[key];

  if (!value || value.trim() === "") {
    if (process.env.NODE_ENV === "production") {
      throw new ConfigurationError(
        `Required environment variable ${key} is not set`,
      );
    }
    if (fallback !== undefined) {
      return fallback;
    }
    throw new ConfigurationError(
      `Required environment variable ${key} is not set (no fallback provided)`,
    );
  }

  return value;
}

/**
 * Get optional environment variable (returns fallback if missing)
 */
function getOptional(key: string, fallback: string = ""): string {
  return process.env[key] || fallback;
}

/**
 * Parse boolean environment variable
 */
function getBoolean(key: string, fallback: boolean = false): boolean {
  const value = process.env[key];
  if (!value) return fallback;
  return value.toLowerCase() === "true" || value === "1";
}

/**
 * Parse integer environment variable
 */
function getInteger(key: string, fallback: number): number {
  const value = process.env[key];
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new ConfigurationError(
      `${key} must be a valid integer, got: ${value}`,
    );
  }
  return parsed;
}

// =============================================================================
// Environment Detection
// =============================================================================

const NODE_ENV = (process.env.NODE_ENV || "development") as Environment;
const IS_NEXT_BUILD = process.env.NEXT_PHASE === "phase-production-build";
const SKIP_CONFIG_VALIDATION =
  process.env.SKIP_CONFIG_VALIDATION === "true" ||
  process.env.DISABLE_MONGODB_FOR_BUILD === "true" ||
  IS_NEXT_BUILD;

export const Config = {
  /**
   * Environment configuration
   */
  env: {
    NODE_ENV,
    isDevelopment: NODE_ENV === "development",
    isTest: NODE_ENV === "test",
    isProduction: NODE_ENV === "production",
  },

  /**
   * Application URLs
   */
  app: {
    url: getOptional("APP_URL", "http://localhost:3000"),
    frontendUrl: getOptional("FRONTEND_URL", "http://localhost:3000"),
    corsOrigins: getOptional("CORS_ORIGINS", ""),
  },

  /**
   * NextAuth / Authentication
   */
  auth: {
    secret: getRequired("NEXTAUTH_SECRET", "dev-secret-change-in-production"),
    url: getOptional("NEXTAUTH_URL", "http://localhost:3000"),

    // Google OAuth
    googleClientId: getOptional("GOOGLE_CLIENT_ID"),
    googleClientSecret: getOptional("GOOGLE_CLIENT_SECRET"),

    // GitHub OAuth
    githubClientId: getOptional("GITHUB_CLIENT_ID"),
    githubClientSecret: getOptional("GITHUB_CLIENT_SECRET"),

    // Session configuration
    sessionMaxAge: getInteger("SESSION_MAX_AGE", 30 * 24 * 60 * 60), // 30 days
  },

  /**
   * Database Configuration
   */
  database: {
    mongoUri: getRequired("MONGODB_URI", "mongodb://127.0.0.1:27017/fixzit"),
    maxPoolSize: getInteger("MONGO_MAX_POOL_SIZE", 10),
    minPoolSize: getInteger("MONGO_MIN_POOL_SIZE", 2),
  },

  /**
   * AWS Configuration
   */
  aws: {
    region: getOptional("AWS_REGION", "us-east-1"),
    accessKeyId: getOptional("AWS_ACCESS_KEY_ID"),
    secretAccessKey: getOptional("AWS_SECRET_ACCESS_KEY"),

    // S3 Configuration
    s3: {
      bucket: getOptional("AWS_S3_BUCKET", "fixzit-dev-uploads"),
      uploadsPrefix: getOptional("S3_UPLOADS_PREFIX", "uploads/"),
      publicUrl: getOptional("S3_PUBLIC_URL", ""),
    },

    // Antivirus Scanning
    scan: {
      enabled: getBoolean("AV_SCAN_ENABLED", false),
      endpoint: getOptional("AV_SCAN_ENDPOINT"),
      webhookToken: getOptional("SCAN_WEBHOOK_TOKEN"),
      statusToken: getOptional("SCAN_STATUS_TOKEN"),
      statusTokenRequired: getBoolean("SCAN_STATUS_TOKEN_REQUIRED", false),
      required: getBoolean("S3_SCAN_REQUIRED", false),
    },
  },

  /**
   * Payment Gateway Configuration
   */
  payment: {
    paytabs: {
      profileId: getOptional("PAYTABS_PROFILE_ID"),
      serverKey: getOptional("PAYTABS_SERVER_KEY"),
      clientKey: getOptional("PAYTABS_CLIENT_KEY"),
      baseUrl: getOptional("PAYTABS_BASE_URL", "https://secure.paytabs.sa"),
    },
  },

  /**
   * Email Configuration
   */
  email: {
    from: getOptional("EMAIL_FROM", "noreply@fixzit.sa"),
    replyTo: getOptional("EMAIL_REPLY_TO", "support@fixzit.sa"),

    // SMTP (if using direct SMTP)
    smtp: {
      host: getOptional("SMTP_HOST"),
      port: getInteger("SMTP_PORT", 587),
      user: getOptional("SMTP_USER"),
      password: getOptional("SMTP_PASSWORD"),
      secure: getBoolean("SMTP_SECURE", false),
    },

    // SendGrid
    sendgrid: {
      apiKey: getOptional("SENDGRID_API_KEY"),
    },

    // Resend
    resend: {
      apiKey: getOptional("RESEND_API_KEY"),
    },
  },

  /**
   * Company Information
   */
  company: {
    name: getOptional("NEXT_PUBLIC_COMPANY_NAME", "Fixzit"),
    supportEmail: getOptional("NEXT_PUBLIC_SUPPORT_EMAIL", "support@fixzit.sa"),
    supportPhone: getOptional("NEXT_PUBLIC_SUPPORT_PHONE", "+966 XX XXX XXXX"),
  },

  /**
   * Feature Flags
   */
  features: {
    atsEnabled: getBoolean("ATS_ENABLED", false),
    platformOrgId: getOptional("PLATFORM_ORG_ID"),
    publicJobsOrgId: getOptional("PUBLIC_JOBS_ORG_ID"),
  },

  /**
   * Security & Monitoring
   */
  security: {
    // Sentry
    sentryDsn: getOptional("NEXT_PUBLIC_SENTRY_DSN"),
    sentryAuthToken: getOptional("SENTRY_AUTH_TOKEN"),

    // Rate Limiting
    rateLimitEnabled: getBoolean("RATE_LIMIT_ENABLED", true),

    // CRON Security
    cronSecret: getOptional("CRON_SECRET"),

    // Route Health Monitoring
    routeHealthEndpoint: getOptional("ROUTE_HEALTH_ENDPOINT"),
    routeHealthToken: getOptional("ROUTE_HEALTH_TOKEN"),
  },

  /**
   * API Keys & External Services
   */
  external: {
    // Analytics
    googleAnalyticsId: getOptional("NEXT_PUBLIC_GA_ID"),

    // Maps
    googleMapsApiKey: getOptional("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"),

    // AI Services
    openaiApiKey: getOptional("OPENAI_API_KEY"),
    anthropicApiKey: getOptional("ANTHROPIC_API_KEY"),
  },

  /**
   * Development & Testing
   */
  dev: {
    debugMode: getBoolean("DEBUG", false),
    verboseLogs: getBoolean("VERBOSE_LOGS", false),
    bypassAuth: getBoolean("BYPASS_AUTH", false), // NEVER enable in production
  },
} as const;

// =============================================================================
// Runtime Validation (Production Only)
// =============================================================================

if (Config.env.isProduction && !SKIP_CONFIG_VALIDATION) {
  // Validate critical production configuration
  const criticalVars = ["NEXTAUTH_SECRET", "MONGODB_URI"];

  const missing = criticalVars.filter((key) => {
    const value = process.env[key];
    return !value || value.trim() === "";
  });

  if (missing.length > 0) {
    throw new ConfigurationError(
      `Missing critical environment variables in production: ${missing.join(", ")}`,
    );
  }

  // Warn if AWS is not configured (S3 uploads will not work)
  if (!Config.aws.region || !Config.aws.s3.bucket) {
    console.warn(
      "[Config] ⚠️  AWS not fully configured - S3 file uploads will be disabled",
    );
  }

  // Validate MongoDB URI format
  if (
    !Config.database.mongoUri.startsWith("mongodb://") &&
    !Config.database.mongoUri.startsWith("mongodb+srv://")
  ) {
    throw new ConfigurationError(
      "MONGODB_URI must be a valid MongoDB connection string",
    );
  }

  // Warn about insecure configurations
  if (Config.dev.bypassAuth) {
    console.error(
      "[Config] ⚠️  BYPASS_AUTH is enabled in production - THIS IS INSECURE!",
    );
  }
}

// =============================================================================
// Type Exports
// =============================================================================

export type ConfigType = typeof Config;
