/**
 * @description Diagnostic endpoint showing environment variable configuration status.
 * Returns boolean flags indicating which env vars are set (values hidden for security).
 * Covers authentication, OAuth, email, SMS (Taqnyat), storage, search, payment, ZATCA, and AI.
 * @route GET /api/dev/check-env
 * @access Private - Super Admins only
 * @returns {Object} Map of environment variable names to boolean (true = configured)
 * @throws {403} If user is not a Super Admin
 * @security Never exposes actual values, only configuration presence
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";

// This endpoint shows which env vars are configured (but not their values for security)
// SECURITY: Restricted to Super Admins only
export async function GET() {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const envVars = {
    // Core Authentication
    MONGODB_URI: !!process.env.MONGODB_URI,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    JWT_SECRET: !!process.env.JWT_SECRET,
    INTERNAL_API_SECRET: !!process.env.INTERNAL_API_SECRET,

    // OAuth
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,

    // Email
    SENDGRID_API_KEY: !!process.env.SENDGRID_API_KEY,
    SENDGRID_FROM_EMAIL: !!process.env.SENDGRID_FROM_EMAIL,
    SENDGRID_FROM_NAME: !!process.env.SENDGRID_FROM_NAME,

    // SMS (Taqnyat - ONLY supported provider, CITC-compliant for Saudi Arabia)
    TAQNYAT_BEARER_TOKEN: !!process.env.TAQNYAT_BEARER_TOKEN,
    TAQNYAT_SENDER_NAME: !!process.env.TAQNYAT_SENDER_NAME,

    // Storage
    AWS_S3_BUCKET: !!process.env.AWS_S3_BUCKET,
    AWS_REGION: !!process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: !!process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,

    // Search
    MEILI_HOST: !!process.env.MEILI_HOST,
    MEILI_MASTER_KEY: !!process.env.MEILI_MASTER_KEY,

    // Payment
    PAYTABS_PROFILE_ID: !!process.env.PAYTABS_PROFILE_ID,
    PAYTABS_SERVER_KEY: !!process.env.PAYTABS_SERVER_KEY,
    PAYTABS_CLIENT_KEY: !!process.env.PAYTABS_CLIENT_KEY,
    // Tap: Environment-aware keys
    TAP_ENVIRONMENT: process.env.TAP_ENVIRONMENT || "test",
    TAP_LIVE_SECRET_KEY: !!process.env.TAP_LIVE_SECRET_KEY,
    TAP_TEST_SECRET_KEY: !!process.env.TAP_TEST_SECRET_KEY,
    NEXT_PUBLIC_TAP_LIVE_PUBLIC_KEY: !!process.env.NEXT_PUBLIC_TAP_LIVE_PUBLIC_KEY,
    NEXT_PUBLIC_TAP_TEST_PUBLIC_KEY: !!process.env.NEXT_PUBLIC_TAP_TEST_PUBLIC_KEY,
    TAP_MERCHANT_ID: !!process.env.TAP_MERCHANT_ID,
    TAP_ACCOUNT_ID: !!process.env.TAP_ACCOUNT_ID,

    // ZATCA
    ZATCA_API_KEY: !!process.env.ZATCA_API_KEY,
    ZATCA_API_SECRET: !!process.env.ZATCA_API_SECRET,
    ZATCA_SELLER_NAME: !!process.env.ZATCA_SELLER_NAME,
    ZATCA_VAT_NUMBER: !!process.env.ZATCA_VAT_NUMBER,
    ZATCA_SELLER_ADDRESS: !!process.env.ZATCA_SELLER_ADDRESS,
    ZATCA_ENVIRONMENT: !!process.env.ZATCA_ENVIRONMENT,

    // AI
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    COPILOT_MODEL: !!process.env.COPILOT_MODEL,

    // Maps
    GOOGLE_MAPS_API_KEY: !!process.env.GOOGLE_MAPS_API_KEY,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,

    // URLs
    NEXT_PUBLIC_APP_URL: !!process.env.NEXT_PUBLIC_APP_URL,
    BASE_URL: !!process.env.BASE_URL,
    PUBLIC_BASE_URL: !!process.env.PUBLIC_BASE_URL,
    APP_URL: !!process.env.APP_URL,

    // Redis
    REDIS_URL: !!process.env.REDIS_URL,
    REDIS_PASSWORD: !!process.env.REDIS_PASSWORD,

    // Feature Flags
    ATS_ENABLED: !!process.env.ATS_ENABLED,
    MARKETPLACE_ENABLED: !!process.env.MARKETPLACE_ENABLED,
    WO_ENABLED: !!process.env.WO_ENABLED,
    INVOICE_ENABLED: !!process.env.INVOICE_ENABLED,
    PROPERTY_ENABLED: !!process.env.PROPERTY_ENABLED,

    // Org IDs
    PUBLIC_ORG_ID: !!process.env.PUBLIC_ORG_ID,
    TEST_ORG_ID: !!process.env.TEST_ORG_ID,
    DEFAULT_ORG_ID: !!process.env.DEFAULT_ORG_ID,

    // Firebase
    FIREBASE_ADMIN_PROJECT_ID: !!process.env.FIREBASE_ADMIN_PROJECT_ID,
    FIREBASE_ADMIN_CLIENT_EMAIL: !!process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    FIREBASE_ADMIN_PRIVATE_KEY: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,

    // Notifications
    NOTIFICATIONS_SMOKE_USER_ID: !!process.env.NOTIFICATIONS_SMOKE_USER_ID,
    NOTIFICATIONS_SMOKE_NAME: !!process.env.NOTIFICATIONS_SMOKE_NAME,
    NOTIFICATIONS_SMOKE_EMAIL: !!process.env.NOTIFICATIONS_SMOKE_EMAIL,
    NOTIFICATIONS_SMOKE_PHONE: !!process.env.NOTIFICATIONS_SMOKE_PHONE,
    NOTIFICATIONS_TELEMETRY_WEBHOOK:
      !!process.env.NOTIFICATIONS_TELEMETRY_WEBHOOK,
    WHATSAPP_BUSINESS_API_KEY: !!process.env.WHATSAPP_BUSINESS_API_KEY,
    WHATSAPP_PHONE_NUMBER_ID: !!process.env.WHATSAPP_PHONE_NUMBER_ID,

    // Monitoring
    SENTRY_DSN: !!process.env.SENTRY_DSN,
    DATADOG_API_KEY: !!process.env.DATADOG_API_KEY,

    // Jobs
    CRON_SECRET: !!process.env.CRON_SECRET,

    // Security
    FILE_SIGNING_SECRET: !!process.env.FILE_SIGNING_SECRET,
    LOG_HASH_SALT: !!process.env.LOG_HASH_SALT,

    // Shipping
    ARAMEX_ACCOUNT_NUMBER: !!process.env.ARAMEX_ACCOUNT_NUMBER,
    ARAMEX_USERNAME: !!process.env.ARAMEX_USERNAME,
    ARAMEX_PASSWORD: !!process.env.ARAMEX_PASSWORD,
    SMSA_USERNAME: !!process.env.SMSA_USERNAME,
    SPL_API_KEY: !!process.env.SPL_API_KEY,

    // SMS OTP
    NEXTAUTH_REQUIRE_SMS_OTP: !!process.env.NEXTAUTH_REQUIRE_SMS_OTP,
    NEXT_PUBLIC_REQUIRE_SMS_OTP: !!process.env.NEXT_PUBLIC_REQUIRE_SMS_OTP,
    NEXTAUTH_SUPERADMIN_FALLBACK_PHONE:
      !!process.env.NEXTAUTH_SUPERADMIN_FALLBACK_PHONE,
  };

  const configured = Object.entries(envVars).filter(
    ([_, value]) => value,
  ).length;
  const missing = Object.entries(envVars).filter(([_, value]) => !value).length;
  const total = Object.keys(envVars).length;

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    coverage: {
      configured,
      missing,
      total,
      percentage: Math.round((configured / total) * 100),
    },
    variables: envVars,
  });
  } catch (_error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
