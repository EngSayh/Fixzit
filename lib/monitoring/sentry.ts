/**
 * Sentry Error Tracking (INFRA-SENTRY)
 * Status: Awaiting DSN configuration
 * See: docs/adrs/ADR-004-sentry-activation.md
 */

import * as Sentry from '@sentry/nextjs';

let initialized = false;

/**
 * Initialize Sentry error tracking
 * Called from instrumentation.ts (Next.js instrumentation hook)
 */
export function initSentry() {
  if (initialized) return;

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
  
  if (!dsn) {
    // Sentry DSN not configured - error tracking disabled (silent in production)
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Tenant context
    beforeSend(event, hint) {
      // Add org_id if available in context
      if (hint.originalException && typeof hint.originalException === 'object') {
        const err = hint.originalException as Record<string, unknown>;
        if (err.org_id) {
          event.contexts = event.contexts || {};
          event.contexts.tenant = { org_id: err.org_id };
        }
      }
      return event;
    },
    
    // Filter sensitive data
    beforeBreadcrumb(breadcrumb) {
      // Don't log auth tokens
      if (breadcrumb.category === 'xhr' && breadcrumb.data?.url) {
        delete breadcrumb.data.headers;
      }
      return breadcrumb;
    }
  });

  initialized = true;
  // Sentry initialized successfully (silent)
}

/**
 * Capture error with tenant context
 */
export function captureError(error: Error, orgId?: string) {
  if (!initialized) return;
  
  Sentry.withScope((scope) => {
    if (orgId) {
      scope.setContext('tenant', { org_id: orgId });
    }
    Sentry.captureException(error);
  });
}
