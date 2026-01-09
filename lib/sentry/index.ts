/**
 * Sentry Configuration - Scaffolding for INFRA-SENTRY
 * Status: Requires USER_ACTION (DSN setup)
 *
 * This module provides Sentry error tracking configuration.
 * Activation requires:
 * 1. Create Sentry project at https://sentry.io
 * 2. Set SENTRY_DSN environment variable
 * 3. Enable in production
 *
 * @see next.config.js (already has Sentry plugin configured)
 */

import * as Sentry from '@sentry/nextjs';

interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate: number;
  replaysSessionSampleRate: number;
  replaysOnErrorSampleRate: number;
}

/**
 * Check if Sentry should be enabled
 */
export function isSentryEnabled(): boolean {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  const isProduction = process.env.NODE_ENV === 'production';
  const isExplicitlyDisabled = process.env.SENTRY_DISABLED === 'true';

  return Boolean(dsn) && isProduction && !isExplicitlyDisabled;
}

/**
 * Get Sentry configuration
 */
export function getSentryConfig(): SentryConfig | null {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    return null;
  }

  return {
    dsn,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.npm_package_version,
    // Adjust sample rates based on traffic volume
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    replaysSessionSampleRate: parseFloat(
      process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE || '0.1'
    ),
    replaysOnErrorSampleRate: parseFloat(
      process.env.SENTRY_REPLAYS_ERROR_SAMPLE_RATE || '1.0'
    ),
  };
}

/**
 * Initialize Sentry for client-side
 */
export function initSentryClient(): void {
  const config = getSentryConfig();

  if (!config) {
    // Sentry disabled - no DSN configured
    return;
  }

  // Build integrations array - use any[] since replayIntegration may not exist in all versions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const integrations: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sdk = Sentry as any;
  if (typeof sdk.replayIntegration === 'function') {
    integrations.push(
      sdk.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      })
    );
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    tracesSampleRate: config.tracesSampleRate,
    replaysSessionSampleRate: config.replaysSessionSampleRate,
    replaysOnErrorSampleRate: config.replaysOnErrorSampleRate,
    integrations,
  });
}

/**
 * Initialize Sentry for server-side (Node.js)
 */
export function initSentryServer(): void {
  const config = getSentryConfig();

  if (!config) {
    return;
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    tracesSampleRate: config.tracesSampleRate,
  });
}

/**
 * Capture an exception with additional context
 */
export function captureException(
  error: Error | unknown,
  context?: Record<string, unknown>
): string | undefined {
  void context; // Use context param
  if (!isSentryEnabled()) {
    // Sentry disabled - error not captured
    void error;
    return undefined;
  }

  return Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Capture a message with severity level
 */
export function captureMessage(
  message: string,
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal' = 'info'
): string | undefined {
  void level; // Use level param
  if (!isSentryEnabled()) {
    // Sentry disabled - message not captured
    void message;
    return undefined;
  }

  return Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; orgId?: string } | null): void {
  if (!isSentryEnabled()) {
    return;
  }

  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      // Custom tags for multi-tenancy
      ...(user.orgId && { org_id: user.orgId }),
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>
): void {
  if (!isSentryEnabled()) {
    return;
  }

  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: 'info',
  });
}

// Define a minimal Scope interface for the noop case
interface NoopScope {
  setTag: () => NoopScope;
  setExtra: () => NoopScope;
  setContext: () => NoopScope;
  setUser: () => NoopScope;
  setLevel: () => NoopScope;
  setFingerprint: () => NoopScope;
}

/**
 * Execute callback with scoped Sentry context
 * Used for enriching error reports with additional context
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function withScope(callback: (scope: any) => void): void {
  if (!isSentryEnabled()) {
    // Still call callback with a no-op scope for consistency
    const noopScope: NoopScope = {
      setTag: () => noopScope,
      setExtra: () => noopScope,
      setContext: () => noopScope,
      setUser: () => noopScope,
      setLevel: () => noopScope,
      setFingerprint: () => noopScope,
    };
    callback(noopScope);
    return;
  }

  Sentry.withScope(callback);
}

export default {
  isSentryEnabled,
  getSentryConfig,
  initSentryClient,
  initSentryServer,
  captureException,
  captureMessage,
  setUser,
  addBreadcrumb,
  withScope,
};
