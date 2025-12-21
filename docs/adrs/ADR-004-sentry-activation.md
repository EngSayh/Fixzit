# ADR-004: Sentry Activation Plan

**Status:** Awaiting User Action (DSN Required)  
**Date:** 2025-12-21  
**Related:** INFRA-SENTRY  

## Context

Sentry is already configured in `next.config.js` but inactive due to missing DSN. Production error tracking is critical for:
- Real-time error detection
- Stack trace aggregation
- Multi-tenant error isolation
- Performance monitoring

## Decision

Activate Sentry with tenant-aware error tracking.

## Implementation Checklist

### User Actions Required

- [ ] Create Sentry project at sentry.io
- [ ] Generate DSN (Data Source Name)
- [ ] Add to Vercel env vars:
  - `NEXT_PUBLIC_SENTRY_DSN` (client-side)
  - `SENTRY_DSN` (server-side)
- [ ] Configure release tracking (optional):
  - `SENTRY_AUTH_TOKEN`
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`

### Code Implementation

- [x] Create `lib/monitoring/sentry.ts` with tenant context
- [x] Add `beforeSend` hook for org_id injection
- [x] Filter sensitive data (auth tokens)
- [ ] Call `initSentry()` from `instrumentation.ts`
- [ ] Add `captureError()` calls to critical error boundaries

### Configuration

```env
# .env.local (add these)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SENTRY_AUTH_TOKEN=sntrys_xxx (optional - for releases)
SENTRY_ORG=fixzit
SENTRY_PROJECT=fixzit-frontend
```

## Verification Steps

1. Deploy with DSN configured
2. Trigger test error: `throw new Error('Sentry test')`
3. Verify error appears in Sentry dashboard
4. Verify tenant context (org_id) is attached
5. Confirm sensitive data is filtered

## Consequences

### Positive
- Real-time error visibility
- Stack traces with source maps
- Tenant-scoped error tracking
- Performance insights

### Negative
- Additional third-party dependency
- Potential PII leakage (mitigated by filtering)
- ~50KB client bundle increase

## References

- Sentry Next.js docs: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- Existing config: `next.config.js` (Sentry plugin already present)
