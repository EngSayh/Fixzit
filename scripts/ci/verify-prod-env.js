#!/usr/bin/env node
/**
 * CI guardrail: fail fast in production/preview pipelines when unsafe flags or missing secrets are detected.
 */

const violations = [];
const warnings = [];

const env = process.env;
// Only validate in actual production/preview deployments (Vercel), not in CI test builds
const isProdDeploy = env.VERCEL_ENV === 'production' || env.VERCEL_ENV === 'preview';

// Tap: Use standardized env var names with environment-aware key selection
const tapEnvIsLive = env.TAP_ENVIRONMENT === 'live' || env.VERCEL_ENV === 'production';
// Secret key resolved for documentation but not used directly (webhook validation uses raw env)
// eslint-disable-next-line no-unused-vars -- Documented pattern for env key resolution
const _tapSecretKey = tapEnvIsLive ? env.TAP_LIVE_SECRET_KEY : env.TAP_TEST_SECRET_KEY;
const tapPublicKey = tapEnvIsLive ? env.NEXT_PUBLIC_TAP_LIVE_PUBLIC_KEY : env.NEXT_PUBLIC_TAP_TEST_PUBLIC_KEY;
const tapConfigured = Boolean(tapPublicKey) && Boolean(env.TAP_WEBHOOK_SECRET);

// ZATCA (Saudi e-invoicing) configuration required for Finance/ZATCA domain
const zatcaConfigured = Boolean(env.ZATCA_API_KEY) && Boolean(env.ZATCA_SELLER_NAME) &&
                        Boolean(env.ZATCA_VAT_NUMBER) && Boolean(env.ZATCA_SELLER_ADDRESS);

if (!isProdDeploy) {
  console.log('[verify-prod-env] Skipping validation (not a Vercel production/preview deployment)');
  process.exit(0);
}

function requireFalse(name, msg) {
  if (env[name] === 'true') {
    violations.push(msg || `${name} must be false in production`);
  }
}
// Note: warnIfMissing pattern available if needed for future env checks
// function warnIfMissing(name, msg) {
//   if (!env[name]) warnings.push(msg || `${name} is missing; related features will be disabled`);
// }

requireFalse('SKIP_ENV_VALIDATION', 'SKIP_ENV_VALIDATION must be false in production');
requireFalse('DISABLE_MONGODB_FOR_BUILD', 'DISABLE_MONGODB_FOR_BUILD must be false in production');

// SECURITY: Validate critical auth secrets in both production and preview
// Preview deployments should also be secure to prevent accidental data exposure
{
  // NEXTAUTH_SECRET (or AUTH_SECRET) is required for session signing
  // Without this, JWTs cannot be signed/verified securely
  const authSecretConfigured = Boolean(env.NEXTAUTH_SECRET || env.AUTH_SECRET);
  if (!authSecretConfigured) {
    violations.push(
      `NEXTAUTH_SECRET (or AUTH_SECRET) is required in ${env.VERCEL_ENV} for secure session signing. ` +
      'Generate a secure value with: openssl rand -base64 32'
    );
  }
  
  // Warn if using known placeholder values (defense in depth)
  const secretValue = env.NEXTAUTH_SECRET || env.AUTH_SECRET || '';
  const insecurePlaceholders = [
    'your-secret-key',
    'your-secret-key-here',
    'change-me',
    'supersecret',
    'supersecretjwt',
    'secret',
    'test',
  ];
  if (insecurePlaceholders.some(p => secretValue.toLowerCase().includes(p))) {
    violations.push(
      'NEXTAUTH_SECRET contains a known insecure placeholder value. ' +
      'Replace with a cryptographically secure random string: openssl rand -base64 32'
    );
  }

  if (!tapConfigured) {
    const tapEnvType = tapEnvIsLive ? 'live' : 'test';
    const tapKeys = tapEnvIsLive 
      ? 'NEXT_PUBLIC_TAP_LIVE_PUBLIC_KEY, TAP_LIVE_SECRET_KEY' 
      : 'NEXT_PUBLIC_TAP_TEST_PUBLIC_KEY, TAP_TEST_SECRET_KEY';
    warnings.push(
      `Tap is not configured: set ${tapKeys} and TAP_WEBHOOK_SECRET. Current TAP_ENVIRONMENT: ${tapEnvType}`,
    );
  }

  if (!zatcaConfigured) {
    warnings.push(
      'ZATCA e-invoicing is not configured: set ZATCA_API_KEY, ZATCA_SELLER_NAME, ZATCA_VAT_NUMBER, ZATCA_SELLER_ADDRESS for Saudi compliance.',
    );
  }

}

if (violations.length > 0) {
  console.error('❌ Production env validation failed:');
  for (const v of violations) console.error(` - ${v}`);
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn('⚠️ Production env warnings (non-blocking):');
  for (const w of warnings) console.warn(` - ${w}`);
  console.log('✅ Production env guardrails passed with warnings.');
  process.exit(0);
}

console.log('✅ Production env guardrails passed.');
