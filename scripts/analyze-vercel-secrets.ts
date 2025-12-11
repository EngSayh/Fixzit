#!/usr/bin/env tsx
/**
 * Analyze Vercel secrets and provide recommendations
 * Run: pnpm exec tsx scripts/analyze-vercel-secrets.ts
 */

// Secrets currently in Vercel (from vercel env ls)
const _vercelSecrets = [
  "Next_Auth_Secret",
  "GOOGLE_MAPS_API_KEY",
  "SEND_GRID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CLIENT_ID",
  "NEXT_PUBLIC_REQUIRE_SMS_OTP",
  "NEXTAUTH_REQUIRE_SMS_OTP",
  "MEILI_MASTER_KEY",
  "MEILI_HOST",
  "ZATCA_SELLER_ADDRESS",
  "ZATCA_VAT_NUMBER",
  "ZATCA_SELLER_NAME",
  "ZATCA_ENVIRONMENT",
  "ZATCA_API_SECRET",
  "ZATCA_API_KEY",
  "NOTIFICATIONS_TELEMETRY_WEBHOOK",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_BUSINESS_API_KEY",
  "NOTIFICATIONS_SMOKE_PHONE",
  "NOTIFICATIONS_SMOKE_EMAIL",
  "NOTIFICATIONS_SMOKE_NAME",
  "NOTIFICATIONS_SMOKE_USER_ID",
  "NEXTAUTH_SUPERADMIN_FALLBACK_PHONE",
  "MARKETPLACE_ENABLED",
  "DEFAULT_ORG_ID",
  "TEST_ORG_ID",
  "PUBLIC_ORG_ID",
  "FIREBASE_ADMIN_PRIVATE_KEY",
  "FIREBASE_ADMIN_CLIENT_EMAIL",
  "FIREBASE_ADMIN_PROJECT_ID",
  "TWILIO_PHONE_NUMBER",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_ACCOUNT_SID",
  "SENDGRID_FROM_NAME",
  "SENDGRID_FROM_EMAIL",
  "SENDGRID_API_KEY",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "MONGODB_URI",
];

// Required secrets from codebase analysis
const requiredSecrets = {
  "🔴 CRITICAL - App will break": {
    MONGODB_URI: { status: "configured", note: "Database connection" },
    NEXTAUTH_SECRET: { status: "configured", note: "Session signing" },
    NEXTAUTH_URL: { status: "configured", note: "Auth base URL" },
    JWT_SECRET: {
      status: "missing",
      note: "JWT token signing",
      howToGet: "Run: openssl rand -hex 32",
    },
    INTERNAL_API_SECRET: {
      status: "missing",
      note: "Server-to-server auth",
      howToGet: "Run: openssl rand -base64 32",
    },
  },

  "🟡 HIGH PRIORITY - Major features broken": {
    OPENAI_API_KEY: {
      status: "missing",
      note: "AI Copilot, Help Q&A",
      howToGet: "Get from https://platform.openai.com/api-keys",
    },
    AWS_S3_BUCKET: {
      status: "missing",
      note: "File uploads (resumes, attachments)",
      howToGet: "Create AWS S3 bucket or use Vercel Blob",
    },
    AWS_REGION: {
      status: "missing",
      note: "S3 region (e.g., us-east-1)",
      howToGet: "Set to your AWS region",
    },
    AWS_ACCESS_KEY_ID: {
      status: "missing",
      note: "AWS credentials",
      howToGet: "From AWS IAM console",
    },
    AWS_SECRET_ACCESS_KEY: {
      status: "missing",
      note: "AWS credentials",
      howToGet: "From AWS IAM console",
    },
    PAYTABS_PROFILE_ID: {
      status: "missing",
      note: "Payment processing",
      howToGet: "From PayTabs dashboard",
    },
    PAYTABS_SERVER_KEY: {
      status: "missing",
      note: "Payment processing",
      howToGet: "From PayTabs dashboard",
    },
    PAYTABS_CLIENT_KEY: {
      status: "missing",
      note: "Payment processing",
      howToGet: "From PayTabs dashboard",
    },
    // Tap Payments - Standardized env var names
    TAP_ENVIRONMENT: {
      status: "missing",
      note: "Environment selector: 'test' or 'live'",
      howToGet: "Set to 'test' for dev/preview, 'live' for production",
    },
    TAP_TEST_SECRET_KEY: {
      status: "missing",
      note: "Tap test mode secret key",
      howToGet: "From Tap dashboard → Developers → Test Keys",
    },
    TAP_LIVE_SECRET_KEY: {
      status: "missing",
      note: "Tap live mode secret key",
      howToGet: "From Tap dashboard → Developers → Live Keys",
    },
    TAP_MERCHANT_ID: {
      status: "missing",
      note: "Tap merchant identifier",
      howToGet: "From Tap dashboard → Settings",
    },
    TAP_ACCOUNT_ID: {
      status: "missing",
      note: "Tap account identifier",
      howToGet: "From Tap dashboard → Settings",
    },
    TAP_API_KEY: {
      status: "missing",
      note: "Tap API key",
      howToGet: "From Tap dashboard → Developers",
    },
    TAP_WEBHOOK_SECRET: {
      status: "missing",
      note: "Tap webhook signing secret",
      howToGet: "From Tap dashboard → Developers → Webhooks",
    },
    NEXT_PUBLIC_TAP_TEST_PUBLIC_KEY: {
      status: "missing",
      note: "Tap test mode public key (client-safe)",
      howToGet: "From Tap dashboard → Developers → Test Keys",
    },
    NEXT_PUBLIC_TAP_LIVE_PUBLIC_KEY: {
      status: "missing",
      note: "Tap live mode public key (client-safe)",
      howToGet: "From Tap dashboard → Developers → Live Keys",
    },
  },

  "🟢 MEDIUM - Features work but degraded": {
    NEXT_PUBLIC_APP_URL: {
      status: "missing",
      note: "Public app URL",
      howToGet: "Set to: https://fixzit.co",
    },
    BASE_URL: {
      status: "missing",
      note: "Email links, referrals",
      howToGet: "Set to: https://fixzit.co",
    },
    PUBLIC_BASE_URL: {
      status: "missing",
      note: "Public links",
      howToGet: "Set to: https://fixzit.co",
    },
    APP_URL: {
      status: "missing",
      note: "App URL",
      howToGet: "Set to: https://fixzit.co",
    },
    REDIS_URL: {
      status: "missing",
      note: "Caching, rate limiting",
      howToGet: "Use Upstash Redis or disable",
    },
    CRON_SECRET: {
      status: "missing",
      note: "Background jobs",
      howToGet: "Run: openssl rand -hex 32",
    },
    FILE_SIGNING_SECRET: {
      status: "missing",
      note: "Secure file URLs",
      howToGet: "Run: openssl rand -hex 32",
    },
    LOG_HASH_SALT: {
      status: "missing",
      note: "Privacy protection",
      howToGet: "Run: openssl rand -hex 32",
    },
    COPILOT_MODEL: {
      status: "missing",
      note: "AI model selection",
      howToGet: "Set to: gpt-4o-mini",
    },
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: {
      status: "missing",
      note: "Maps on client",
      howToGet: "Copy from GOOGLE_MAPS_API_KEY or create new",
    },
  },

  "⚪ OPTIONAL - Nice to have": {
    SENTRY_DSN: {
      status: "missing",
      note: "Error tracking",
      howToGet: "From Sentry.io dashboard",
    },
    DATADOG_API_KEY: {
      status: "missing",
      note: "Monitoring",
      howToGet: "From Datadog dashboard",
    },
    ARAMEX_ACCOUNT_NUMBER: {
      status: "missing",
      note: "Shipping integration",
      howToGet: "From Aramex account",
    },
    ARAMEX_USERNAME: {
      status: "missing",
      note: "Shipping integration",
      howToGet: "From Aramex account",
    },
    ARAMEX_PASSWORD: {
      status: "missing",
      note: "Shipping integration",
      howToGet: "From Aramex account",
    },
    SMSA_USERNAME: {
      status: "missing",
      note: "Shipping integration",
      howToGet: "From SMSA account",
    },
    SPL_API_KEY: {
      status: "missing",
      note: "Shipping integration",
      howToGet: "From SPL account",
    },
    ATS_ENABLED: {
      status: "missing",
      note: "Enable ATS module",
      howToGet: "Set to: true",
    },
    WO_ENABLED: {
      status: "missing",
      note: "Enable Work Orders",
      howToGet: "Set to: true",
    },
    INVOICE_ENABLED: {
      status: "missing",
      note: "Enable Invoicing",
      howToGet: "Set to: true",
    },
    PROPERTY_ENABLED: {
      status: "missing",
      note: "Enable Properties",
      howToGet: "Set to: true",
    },
  },

  "✅ CONFIGURED": {
    MONGODB_URI: { status: "configured", note: "MongoDB Atlas connection" },
    NEXTAUTH_SECRET: { status: "configured", note: "NextAuth signing key" },
    NEXTAUTH_URL: { status: "configured", note: "Auth base URL" },
    GOOGLE_CLIENT_ID: { status: "configured", note: "Google OAuth" },
    GOOGLE_CLIENT_SECRET: { status: "configured", note: "Google OAuth" },
    SENDGRID_API_KEY: { status: "configured", note: "Email service" },
    SENDGRID_FROM_EMAIL: { status: "configured", note: "Sender email" },
    SENDGRID_FROM_NAME: { status: "configured", note: "Sender name" },
    TWILIO_ACCOUNT_SID: { status: "configured", note: "SMS service" },
    TWILIO_AUTH_TOKEN: { status: "configured", note: "SMS auth" },
    TWILIO_PHONE_NUMBER: { status: "configured", note: "SMS sender" },
    GOOGLE_MAPS_API_KEY: { status: "configured", note: "Maps API" },
    MEILI_HOST: { status: "configured", note: "Search engine" },
    MEILI_MASTER_KEY: { status: "configured", note: "Search auth" },
    ZATCA_API_KEY: { status: "configured", note: "Saudi e-invoicing" },
    ZATCA_API_SECRET: { status: "configured", note: "ZATCA auth" },
    ZATCA_SELLER_NAME: { status: "configured", note: "Business name" },
    ZATCA_VAT_NUMBER: { status: "configured", note: "VAT number" },
    ZATCA_SELLER_ADDRESS: { status: "configured", note: "Business address" },
    ZATCA_ENVIRONMENT: { status: "configured", note: "ZATCA env" },
    FIREBASE_ADMIN_PROJECT_ID: {
      status: "configured",
      note: "Push notifications",
    },
    FIREBASE_ADMIN_CLIENT_EMAIL: {
      status: "configured",
      note: "Firebase auth",
    },
    FIREBASE_ADMIN_PRIVATE_KEY: { status: "configured", note: "Firebase key" },
    PUBLIC_ORG_ID: { status: "configured", note: "Organization ID" },
    TEST_ORG_ID: { status: "configured", note: "Test org" },
    DEFAULT_ORG_ID: { status: "configured", note: "Default org" },
    MARKETPLACE_ENABLED: { status: "configured", note: "Marketplace module" },
    NOTIFICATIONS_SMOKE_USER_ID: {
      status: "configured",
      note: "Test notifications",
    },
    NOTIFICATIONS_SMOKE_NAME: { status: "configured", note: "Test name" },
    NOTIFICATIONS_SMOKE_EMAIL: { status: "configured", note: "Test email" },
    NOTIFICATIONS_SMOKE_PHONE: { status: "configured", note: "Test phone" },
    NOTIFICATIONS_TELEMETRY_WEBHOOK: {
      status: "configured",
      note: "Metrics webhook",
    },
    WHATSAPP_BUSINESS_API_KEY: { status: "configured", note: "WhatsApp API" },
    WHATSAPP_PHONE_NUMBER_ID: { status: "configured", note: "WhatsApp sender" },
    NEXTAUTH_REQUIRE_SMS_OTP: { status: "configured", note: "SMS OTP enabled" },
    NEXT_PUBLIC_REQUIRE_SMS_OTP: {
      status: "configured",
      note: "Client SMS OTP",
    },
    NEXTAUTH_SUPERADMIN_FALLBACK_PHONE: {
      status: "configured",
      note: "Admin phone",
    },
  },
};

console.log("═".repeat(70));
console.log("🔍 VERCEL SECRETS ANALYSIS");
console.log("═".repeat(70));
console.log();

// Print each category
for (const [category, secrets] of Object.entries(requiredSecrets)) {
  if (category === "✅ CONFIGURED") {
    // Skip configured for now
    continue;
  }

  console.log(`\n${category}`);
  console.log("─".repeat(70));

  for (const [key, info] of Object.entries(secrets)) {
    console.log(`\n  🔑 ${key}`);
    console.log(`     📝 ${info.note}`);
    if (info.howToGet) {
      console.log(`     💡 How to get: ${info.howToGet}`);
    }
  }
}

// Print configured secrets
console.log("\n\n✅ ALREADY CONFIGURED ON VERCEL");
console.log("─".repeat(70));
const configured = Object.entries(requiredSecrets["✅ CONFIGURED"]);
console.log(`\n  Total: ${configured.length} secrets`);
console.log(`\n  ${configured.map(([k]) => k).join(", ")}`);

console.log("\n\n" + "═".repeat(70));
console.log("📊 SUMMARY");
console.log("═".repeat(70));

const critical = Object.keys(
  requiredSecrets["🔴 CRITICAL - App will break"],
).filter(
  (k) =>
    requiredSecrets["🔴 CRITICAL - App will break"][k].status === "missing",
).length;

const high = Object.keys(
  requiredSecrets["🟡 HIGH PRIORITY - Major features broken"],
).length;
const medium = Object.keys(
  requiredSecrets["🟢 MEDIUM - Features work but degraded"],
).length;
const optional = Object.keys(
  requiredSecrets["⚪ OPTIONAL - Nice to have"],
).length;
const total = configured.length;

console.log(`\n  ✅ Configured: ${total}`);
console.log(`  🔴 Critical Missing: ${critical}`);
console.log(`  🟡 High Priority Missing: ${high}`);
console.log(`  🟢 Medium Priority Missing: ${medium}`);
console.log(`  ⚪ Optional Missing: ${optional}`);

console.log("\n\n" + "═".repeat(70));
console.log("🚀 QUICK SETUP COMMANDS");
console.log("═".repeat(70));

console.log("\n# Critical secrets (required immediately):");
console.log("vercel env add JWT_SECRET production");
console.log("vercel env add INTERNAL_API_SECRET production");

console.log("\n# High priority (for major features):");
console.log("vercel env add OPENAI_API_KEY production");
console.log("vercel env add AWS_S3_BUCKET production");
console.log("vercel env add AWS_REGION production");
console.log("vercel env add AWS_ACCESS_KEY_ID production");
console.log("vercel env add AWS_SECRET_ACCESS_KEY production");

console.log("\n# URLs (recommended):");
console.log("vercel env add NEXT_PUBLIC_APP_URL production");
console.log("vercel env add BASE_URL production");
console.log("vercel env add PUBLIC_BASE_URL production");
console.log("vercel env add APP_URL production");

console.log("\n# Feature flags (enable modules):");
console.log("vercel env add ATS_ENABLED production");
console.log("vercel env add WO_ENABLED production");
console.log("vercel env add INVOICE_ENABLED production");
console.log("vercel env add PROPERTY_ENABLED production");

console.log("\n# Payment (if needed):");
console.log("vercel env add PAYTABS_PROFILE_ID production");
console.log("vercel env add PAYTABS_SERVER_KEY production");
console.log("vercel env add PAYTABS_CLIENT_KEY production");

console.log("\n\n" + "═".repeat(70));
console.log("⚠️  IMPORTANT NOTES");
console.log("═".repeat(70));
console.log(`
1. JWT_SECRET and INTERNAL_API_SECRET are CRITICAL
   - Without these, authentication may fail
   - Generate: openssl rand -hex 32

2. AWS S3 is needed for file uploads
   - Resumes, work order attachments
   - Alternative: Use Vercel Blob Storage

3. OPENAI_API_KEY enables AI features
   - AI Copilot, Help Q&A
   - Get from: https://platform.openai.com/api-keys

4. URLs should all be set to: https://fixzit.co
   - This fixes email links, OAuth redirects, etc.

5. Payment gateways (PayTabs/Tap) optional
   - Only needed for e-commerce features
   - Get credentials from respective dashboards

6. After adding secrets, redeploy:
   vercel --cwd Fixzit --prod --yes
`);

console.log("═".repeat(70));
