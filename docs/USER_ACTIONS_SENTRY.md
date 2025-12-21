# INFRA-SENTRY: Sentry Setup Instructions

**Status:** USER_ACTION_REQUIRED  
**Priority:** P1  
**Effort:** XS (30 minutes)  
**Owner:** Eng. Sultan Al Hassni

## Overview

Sentry error tracking is already configured in the codebase but requires activation with a project DSN. This document provides step-by-step instructions.

## Current State

- ✅ `@sentry/nextjs` is installed
- ✅ `next.config.js` has Sentry webpack config
- ✅ `instrumentation.ts` exists for server-side init
- ❌ No Sentry DSN configured
- ❌ No Sentry project created

## Required Actions

### Step 1: Create Sentry Project

1. Go to [Sentry.io](https://sentry.io) and sign in (or create account)
2. Create new project:
   - Platform: **Next.js**
   - Project Name: `fixzit-production`
   - Team: Create or select team
3. Note down the **DSN** (looks like `https://xxx@xxx.ingest.sentry.io/xxx`)

### Step 2: Configure Environment Variables

Add to Vercel (Production + Preview):

```bash
# Sentry DSN (required)
SENTRY_DSN=https://your-key@your-org.ingest.sentry.io/your-project-id

# Sentry Auth Token (for source maps upload)
SENTRY_AUTH_TOKEN=your-auth-token

# Sentry Org and Project (for CLI)
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=fixzit-production
```

**Vercel Dashboard:**
1. Go to Project Settings → Environment Variables
2. Add each variable for Production and Preview environments

### Step 3: Create sentry.client.config.ts

Create `sentry.client.config.ts` in project root:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Performance monitoring
  tracesSampleRate: 0.1, // 10% of transactions
  
  // Session replay (optional)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Environment
  environment: process.env.NODE_ENV,
  
  // Ignore common non-errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error exception captured',
    'Failed to fetch',
    'Load failed',
  ],
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
});
```

### Step 4: Create sentry.server.config.ts

Create `sentry.server.config.ts` in project root:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  
  // Performance monitoring
  tracesSampleRate: 0.1,
  
  // Environment
  environment: process.env.NODE_ENV,
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,
});
```

### Step 5: Create sentry.edge.config.ts

Create `sentry.edge.config.ts` in project root:

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

### Step 6: Update next.config.js

Ensure Sentry webpack plugin is active:

```javascript
const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... existing config
};

module.exports = withSentryConfig(
  nextConfig,
  {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    silent: true, // Suppress CLI output
    hideSourceMaps: true, // Hide source maps from client
  },
  {
    widenClientFileUpload: true,
    transpileClientSDK: true,
    tunnelRoute: '/monitoring-tunnel',
    disableLogger: true,
  }
);
```

### Step 7: Verify Installation

After deployment:

1. Trigger a test error:
   ```typescript
   // Temporary: Add to any page
   throw new Error('Sentry test error');
   ```

2. Check Sentry dashboard for the error

3. Verify source maps are uploaded (stack traces should show original TypeScript)

## Estimated Time

| Task | Time |
|------|------|
| Create Sentry project | 5 min |
| Configure env vars | 5 min |
| Create config files | 10 min |
| Deploy and verify | 10 min |
| **Total** | **30 min** |

## Related Files

- `next.config.js` - Sentry webpack integration
- `instrumentation.ts` - Server-side initialization
- `.env.example` - Environment variable template (add Sentry vars)

## Security Notes

- Never commit DSN to git (use env vars)
- Use SENTRY_AUTH_TOKEN only in CI/CD (not in client)
- Consider IP allowlisting for Sentry project

---

**After completing these steps, mark INFRA-SENTRY as resolved in BACKLOG_AUDIT.json**
