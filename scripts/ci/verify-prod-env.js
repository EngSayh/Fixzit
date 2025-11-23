#!/usr/bin/env node
/**
 * CI guardrail: fail fast in production/preview pipelines when unsafe flags or missing secrets are detected.
 */

const violations = [];

const env = process.env;
const isProdDeploy =
  env.VERCEL_ENV === 'production' ||
  (env.NODE_ENV === 'production' && env.CI === 'true');

if (!isProdDeploy) {
  process.exit(0);
}

function requireFalse(name, msg) {
  if (env[name] === 'true') {
    violations.push(msg || `${name} must be false in production`);
  }
}

function requirePresent(name, msg) {
  if (!env[name]) {
    violations.push(msg || `${name} is required in production`);
  }
}

requireFalse('SKIP_ENV_VALIDATION', 'SKIP_ENV_VALIDATION must be false in production');
requireFalse('DISABLE_MONGODB_FOR_BUILD', 'DISABLE_MONGODB_FOR_BUILD must be false in production');

requirePresent('TAP_PUBLIC_KEY', 'TAP_PUBLIC_KEY is required for production payment flows');
requirePresent('TAP_WEBHOOK_SECRET', 'TAP_WEBHOOK_SECRET is required to verify Tap webhooks');

if (violations.length > 0) {
  console.error('❌ Production env validation failed:');
  for (const v of violations) console.error(` - ${v}`);
  process.exit(1);
}

console.log('✅ Production env guardrails passed.');
