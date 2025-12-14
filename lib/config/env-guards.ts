/**
 * Production Environment Safety Guards
 * 
 * Enforces critical security invariants at runtime to prevent
 * misconfigurations in Vercel Production/Preview environments.
 * 
 * Guards:
 * 1. Block OTP bypass in Production/Preview
 * 2. Block localhost MongoDB URIs in Vercel deployments
 * 3. Require critical secrets in Production
 * 
 * Usage: Call validateProductionEnv() in instrumentation.ts or app startup
 */

/* eslint-disable no-console */
// Justification: This is a CLI/diagnostic tool where console output is the intended interface

type Environment = 'production' | 'preview' | 'development' | 'test';

interface EnvGuardError {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  remediation: string;
}

class EnvGuardException extends Error {
  public errors: EnvGuardError[];

  constructor(errors: EnvGuardError[]) {
    super(`Environment validation failed with ${errors.length} error(s)`);
    this.name = 'EnvGuardException';
    this.errors = errors;
  }
}

/**
 * Detect current environment from Vercel/Node.js env vars
 */
function detectEnvironment(): Environment {
  // Vercel provides VERCEL_ENV (most reliable for Vercel deployments)
  if (process.env.VERCEL_ENV) {
    return process.env.VERCEL_ENV as Environment;
  }

  // Fallback to NODE_ENV (local development)
  if (process.env.NODE_ENV === 'test') return 'test';
  if (process.env.NODE_ENV === 'production') return 'production';
  if (process.env.NODE_ENV === 'development') return 'development';

  // Default to development (safest assumption)
  return 'development';
}

/**
 * Check if MongoDB URI points to localhost
 */
function isLocalhostMongoUri(uri: string | undefined): boolean {
  if (!uri) return false;

  const localhostPatterns = [
    /localhost/i,
    /127\.0\.0\.1/,
    /0\.0\.0\.0/,
    /\[::\]/,  // IPv6 localhost
  ];

  return localhostPatterns.some(pattern => pattern.test(uri));
}

/**
 * Guard: Block OTP bypass settings in Production/Preview
 */
function guardOtpBypass(env: Environment): EnvGuardError[] {
  const errors: EnvGuardError[] = [];

  // Only enforce in production/preview (allow in dev/test)
  if (env !== 'production' && env !== 'preview') {
    return errors;
  }

  // Check for OTP bypass variables
  const bypassVars = [
    'NEXTAUTH_BYPASS_OTP_ALL',
    'ALLOW_TEST_USER_OTP_BYPASS',
    'NEXTAUTH_BYPASS_OTP_CODE',
  ];

  for (const varName of bypassVars) {
    const value = process.env[varName];

    // Treat any non-empty value as enabled (even "false" string is risky)
    if (value && value !== 'false' && value !== '0' && value !== '') {
      errors.push({
        code: 'OTP_BYPASS_IN_PRODUCTION',
        message: `${varName} is set in ${env} environment (value: ${value})`,
        severity: 'error',
        remediation: `Remove ${varName} from Vercel ${env} environment. OTP bypass must only exist in Development.`,
      });
    }
  }

  return errors;
}

/**
 * Guard: Block localhost MongoDB URIs in Vercel deployments
 */
function guardMongoDbUri(env: Environment): EnvGuardError[] {
  const errors: EnvGuardError[] = [];

  // Only enforce in Vercel preview/production
  if (env !== 'production' && env !== 'preview') {
    return errors;
  }

  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    errors.push({
      code: 'MONGODB_URI_MISSING',
      message: `MONGODB_URI is not set in ${env} environment`,
      severity: 'error',
      remediation: `Set MONGODB_URI in Vercel ${env} environment as a Sensitive variable.`,
    });
    return errors;
  }

  if (isLocalhostMongoUri(mongoUri)) {
    errors.push({
      code: 'LOCALHOST_MONGODB_IN_VERCEL',
      message: `MONGODB_URI points to localhost in ${env} environment`,
      severity: 'error',
      remediation: `Update MONGODB_URI in Vercel ${env} environment to point to MongoDB Atlas (mongodb+srv://...).`,
    });
  }

  return errors;
}

/**
 * Guard: Require critical secrets in Production
 */
function guardRequiredSecrets(env: Environment): EnvGuardError[] {
  const errors: EnvGuardError[] = [];

  // Only enforce in production
  if (env !== 'production') {
    return errors;
  }

  const requiredSecrets = [
    'AUTH_SECRET',
    'MONGODB_URI',
  ];

  for (const secret of requiredSecrets) {
    const value = process.env[secret];

    if (!value || value.trim() === '') {
      errors.push({
        code: 'REQUIRED_SECRET_MISSING',
        message: `${secret} is not set in ${env} environment`,
        severity: 'error',
        remediation: `Set ${secret} in Vercel ${env} environment as a Sensitive variable.`,
      });
    }
  }

  return errors;
}

/**
 * Main validation function: runs all guards
 */
export function validateProductionEnv(options: { throwOnError?: boolean } = {}): {
  passed: boolean;
  errors: EnvGuardError[];
  warnings: EnvGuardError[];
  environment: Environment;
} {
  const env = detectEnvironment();
  const allErrors: EnvGuardError[] = [];

  // Run all guards
  allErrors.push(...guardOtpBypass(env));
  allErrors.push(...guardMongoDbUri(env));
  allErrors.push(...guardRequiredSecrets(env));

  // Separate errors and warnings
  const errors = allErrors.filter(e => e.severity === 'error');
  const warnings = allErrors.filter(e => e.severity === 'warning');

  const passed = errors.length === 0;

  // Log results (non-blocking)
  if (!passed) {
    console.error('🚨 Environment Validation Failed:');
    errors.forEach(err => {
      console.error(`   [${err.code}] ${err.message}`);
      console.error(`   → Fix: ${err.remediation}`);
    });
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Environment Warnings:');
    warnings.forEach(warn => {
      console.warn(`   [${warn.code}] ${warn.message}`);
    });
  }

  if (passed && errors.length === 0 && warnings.length === 0) {
    console.log(`✅ Environment validation passed (${env})`);
  }

  // Optionally throw on errors (for startup enforcement)
  if (!passed && options.throwOnError !== false) {
    throw new EnvGuardException(errors);
  }

  return {
    passed,
    errors,
    warnings,
    environment: env,
  };
}

/**
 * CLI-friendly validation (for CI scripts)
 */
export function validateProductionEnvCli(): number {
  try {
    const result = validateProductionEnv({ throwOnError: false });

    if (!result.passed) {
      console.error(`\n❌ Environment validation failed with ${result.errors.length} error(s)\n`);
      return 1;
    }

    if (result.warnings.length > 0) {
      console.warn(`\n⚠️  Environment validation passed with ${result.warnings.length} warning(s)\n`);
      return 0; // Warnings don't fail CI
    }

    console.log('\n✅ Environment validation passed\n');
    return 0;
  } catch (error) {
    console.error('❌ Unexpected error during validation:', error);
    return 1;
  }
}
