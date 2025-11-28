#!/usr/bin/env node
/**
 * CI guardrail: fail fast in production/preview pipelines when unsafe flags or missing secrets are detected.
 */

const violations = [];
const warnings = [];

const env = process.env;
// Only validate in actual production/preview deployments (Vercel), not in CI test builds
const isProdDeploy = env.VERCEL_ENV === 'production' || env.VERCEL_ENV === 'preview';
const isProdRuntime = env.VERCEL_ENV === 'production';
const tapConfigured = Boolean(env.TAP_PUBLIC_KEY) && Boolean(env.TAP_WEBHOOK_SECRET);
const paytabsConfigured = Boolean(env.PAYTABS_PROFILE_ID) && Boolean(env.PAYTABS_SERVER_KEY);

if (!isProdDeploy) {
  console.log('[verify-prod-env] Skipping validation (not a Vercel production/preview deployment)');
  process.exit(0);
}

function requireFalse(name, msg) {
  if (env[name] === 'true') {
    violations.push(msg || `${name} must be false in production`);
  }
}
function warnIfMissing(name, msg) {
  if (!env[name]) {
    warnings.push(msg || `${name} is missing; related features will be disabled`);
  }
}

requireFalse('SKIP_ENV_VALIDATION', 'SKIP_ENV_VALIDATION must be false in production');
requireFalse('DISABLE_MONGODB_FOR_BUILD', 'DISABLE_MONGODB_FOR_BUILD must be false in production');

if (isProdRuntime) {
  if (!tapConfigured && !paytabsConfigured) {
    warnings.push(
      'No payment provider configured: set PayTabs (PAYTABS_PROFILE_ID, PAYTABS_SERVER_KEY) or Tap (TAP_PUBLIC_KEY, TAP_WEBHOOK_SECRET)',
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
