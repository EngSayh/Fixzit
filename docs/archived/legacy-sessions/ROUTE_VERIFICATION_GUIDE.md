# Route Verification Guide

## Overview

This document explains the HTTP route verification system and the requirements for running production builds. All facts in this guide reflect the current repo state (`main`, November 2025).

## Current State Snapshot

- `pnpm verify:routes:http` is implemented in `scripts/run-route-http-check.ts` and succeeds only when run from the repository root. Running it from `/Users/eng.sultanalhassni/Downloads/Fixzit` (parent directory) produces `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "verify:routes:http" not found`.
- The HTTP crawler launches Next.js at `http://127.0.0.1:4010` (not 3000). Override the target with `ROUTE_VERIFY_BASE`.
- `scripts/verify-routes.ts` currently discovers **205 unique page routes** (205 `app/**/page.*` files). Re-run it (`pnpm exec tsx scripts/verify-routes.ts` with a dev server running) whenever page files change to refresh the count.

## Prerequisites

### 1. Managed MongoDB URI (REQUIRED)

**The production build requires a cloud-hosted MongoDB instance.** Local MongoDB URIs (`mongodb://localhost`, `mongodb://127.0.0.1`) are rejected by the production safety validator in `lib/mongo.ts` whenever `NODE_ENV=production` and `ALLOW_LOCAL_MONGODB` is unset.

#### Setting Up MongoDB Atlas (Recommended)

1. Create a free MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Get your connection string (format: `mongodb+srv://username:password@cluster.mongodb.net/database`)
4. Add your connection string to `.env.local`:

```bash
MONGODB_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/fixzit?retryWrites=true&w=majority
```

#### Alternative: AWS DocumentDB

```bash
MONGODB_URI=mongodb://username:password@docdb-cluster.region.docdb.amazonaws.com:27017/fixzit?tls=true&tlsCAFile=rds-combined-ca-bundle.pem
```

#### Why This is Required

The combination of `lib/mongo.ts` and `lib/mongo-uri-validator.ts` enforces cloud database usage in production builds to:

- Prevent accidental deployment with localhost dependencies
- Ensure data persistence across deployments
- Enable proper horizontal scaling
- Meet enterprise security requirements

### 2. Required Environment Variables

Beyond MongoDB, ensure your `.env.local` contains the critical values below. These mirror the services touched during `pnpm verify:routes:http` and keep the HTTP crawler from returning 500s.

| Category                          | Variables                                                                                                                                                                                                                                                             | Notes                                                                                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Database**                      | `MONGODB_URI`                                                                                                                                                                                                                                                         | Cloud URI required for all builds.                                                                                                                     |
| **Auth**                          | `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXTAUTH_REQUIRE_SMS_OTP=false`, `NEXT_PUBLIC_REQUIRE_SMS_OTP=false` _(verification only)_                                                                                                                                        | Temporarily disable OTP so the crawler doesn’t hang on the login page. Re-enable OTP (`=true`) outside verification runs.                              |
| **Search**                        | `MEILI_MASTER_KEY`, `MEILI_URL` _(preferred)_ / `MEILI_HOST` _(legacy fallback)_                                                                                                                                                                                      | Required for marketplace/search routes. CI expects `MEILI_URL`; older self-hosted setups can still set `MEILI_HOST`, but only one needs to be defined. |
| **Notifications (safe defaults)** | `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`, `SENDGRID_FROM_NAME`, `SMS_DEV_MODE=true`, `NEXTAUTH_SUPERADMIN_FALLBACK_PHONE`, `NOTIFICATIONS_SMOKE_USER_ID`, `NOTIFICATIONS_SMOKE_NAME`, `NOTIFICATIONS_SMOKE_EMAIL` _(+ `NOTIFICATIONS_SMOKE_PHONE` if SMS is tested)_ | Route verification touches notification settings pages. Use low-privilege SendGrid keys and enable SMS dev mode to avoid hitting Twilio.               |
| **Optional SMS/Voice**            | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`                                                                                                                                                                                                      | Only required if you want the crawler to exercise the live SMS screens. Leave unset with `SMS_DEV_MODE=true` to stub them.                             |
| **ZATCA (invoice compliance)**    | `ZATCA_API_KEY`, `ZATCA_API_SECRET`, `ZATCA_ENVIRONMENT`                                                                                                                                                                                                              | Required for finance routes that generate e-invoicing previews. Sandbox credentials are fine.                                                          |

Copy placeholders from `.env.example` and replace with your own secrets:

```bash
cp .env.example .env.local
# Edit .env.local and fill in the values listed above
```

## Running Route Verification

### Local Verification

#### Automated Verification Script (Recommended)

The easiest way to verify deployment readiness is to use the comprehensive verification script:

```bash
# Run all checks
./scripts/verify-deployment-readiness.sh

# Skip unit tests (faster)
./scripts/verify-deployment-readiness.sh --skip-tests

# Full verification including notification smoke tests
./scripts/verify-deployment-readiness.sh --full
```

This script automatically runs:

1. Environment variable validation
2. TypeScript compilation check (`pnpm tsc --noEmit`)
3. HTTP route verification (`pnpm verify:routes:http`)
4. Unit tests (`pnpm test`)
5. Notification smoke tests (with `--full` flag)
6. FM workflow validation checklist

**Expected Duration:** 3-7 minutes for full verification

#### Manual Verification Commands

```bash
# Run alias/nav verification + HTTP crawl (mirrors CI)
pnpm verify:routes
pnpm verify:routes:http
```

`pnpm verify:routes` runs the deterministic checks (alias validation, JSON artifact generation, nav + route reference verification). `pnpm verify:routes:http` then builds, starts Next.js on the port encoded in `ROUTE_VERIFY_BASE` (defaults to `http://127.0.0.1:4010`), crawls every discovered route, and reports HTTP status codes.

The HTTP crawl:

1. Runs `pnpm build --no-lint` to create production build (override via `ROUTE_VERIFY_BUILD_FLAGS`)
2. Starts Next.js server on `http://127.0.0.1:4010` by default (change with `ROUTE_VERIFY_BASE`)
3. Crawls all discovered routes via `scripts/verify-routes.ts`
4. Reports HTTP response codes
5. Shuts down the server

**Expected Duration:** 2-5 minutes depending on route count (currently 205 discovered routes)

### Artifacts & Dashboards

Verification writes artifacts that you can inspect without rerunning the crawl:

| Artifact                               | Location                   | Purpose                                                                                                                                                            |
| -------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `_artifacts/route-aliases.json`        | Repository root            | Canonical alias → target map. Regenerated by `pnpm check:route-aliases:json`.                                                                                      |
| `reports/route-metrics/history/*.json` | Version-controlled history | Time-series duplication snapshots generated via `pnpm run archive:route-metrics`.                                                                                  |
| `app/admin/route-metrics`              | Dashboard route            | Visualizes totals, duplication rate, workflow state, and historical chart data by querying `_artifacts/route-aliases.json` + `/api/admin/route-metrics?history=1`. |

To view the dashboard locally, run `pnpm dev` and open http://localhost:3000/admin/route-metrics. Run the commands below any time you want a fresh snapshot without the full HTTP crawl:

```bash
pnpm check:route-aliases:json
pnpm run archive:route-metrics
```

### Continuous Integration

The `.github/workflows/route-quality.yml` workflow runs route verification on every PR. CI needs the same secrets as local runs, at minimum:

```yaml
env:
  # Database & auth
  MONGODB_URI: ${{ secrets.MONGODB_URI }}
  NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
  NEXTAUTH_URL: ${{ secrets.NEXTAUTH_URL }}

  # Search
  MEILI_HOST: ${{ secrets.MEILI_HOST }} # or MEILI_URL for older deployments
  MEILI_MASTER_KEY: ${{ secrets.MEILI_MASTER_KEY }}

  # Notifications (safe values)
  SENDGRID_API_KEY: ${{ secrets.SENDGRID_API_KEY }}
  SENDGRID_FROM_EMAIL: ${{ secrets.SENDGRID_FROM_EMAIL }}
  SENDGRID_FROM_NAME: ${{ secrets.SENDGRID_FROM_NAME }}
  SMS_DEV_MODE: "true"

  # ZATCA / finance
  ZATCA_API_KEY: ${{ secrets.ZATCA_API_KEY }}
  ZATCA_API_SECRET: ${{ secrets.ZATCA_API_SECRET }}
  ZATCA_ENVIRONMENT: ${{ secrets.ZATCA_ENVIRONMENT }}
```

Add these as GitHub repository secrets under **Settings → Secrets and variables → Actions**. If CI should exercise Twilio, WhatsApp, or Firebase paths, add those credentials the same way; otherwise leave `SMS_DEV_MODE` true so the crawler uses the mock channel.

## Troubleshooting

### Build Fails: "Local MongoDB URIs not allowed"

**Problem:** `.env.local` contains `mongodb://localhost` or `mongodb://127.0.0.1`

**Solution:** Update to cloud MongoDB URI (see [Setting Up MongoDB Atlas](#setting-up-mongodb-atlas-recommended))

### Build Fails: Missing Environment Variables

**Problem:** Required keys like `MEILI_MASTER_KEY` or `ZATCA_API_KEY` are missing

**Solution:** Copy from `.env.example` and fill in values:

```bash
cp .env.example .env.local
# Edit .env.local with your actual values
```

### HTTP Verification Fails: Routes Return 500

**Problem:** Server crashes during route crawl

**Solution:** Check server logs for:

- Database connection errors
- Missing API keys
- TypeScript compilation errors

Run `pnpm dev` separately to diagnose issues before attempting verification. When sharing failures, capture `pnpm verify:routes:http 2>&1 | tee _artifacts/route-http.log` so everyone can inspect the exact HTTP codes.

Need to re-run only the deterministic checks while debugging? Use:

```bash
pnpm verify:routes   # alias/nav/reference validation only
```

For HTTP-specific debugging, run `pnpm dev` and hit the failing route manually (e.g., `curl http://127.0.0.1:3000/app/fm/dashboard`).

### Build Succeeds but Verification Times Out

**Problem:** Server starts but doesn't respond

**Solution:**

1. Check the port defined in `ROUTE_VERIFY_BASE` (default `4010`) isn't already in use: `lsof -ti:4010 | xargs kill -9`
2. Increase the `attempts` or `delay` constants in `scripts/run-route-http-check.ts` if the server simply needs more startup time
3. Verify firewall, VPN, or loopback filtering isn't blocking the chosen host

### `pnpm verify:routes:http` Not Found

**Problem:** CLI shows `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "verify:routes:http" not found`

**Solution:** Run the command from the project root (`Fixzit/Fixzit`). Pull the latest `package.json` (script was added recently), reinstall dependencies, and retry.

### Inspecting Metrics After Failures

If the crawler reports duplicated aliases or HTTP 500s, open `app/admin/route-metrics` (see [Artifacts & Dashboards](#artifacts--dashboards)) to pinpoint the alias file, module, and duplication history. The page highlights the unresolved alias count and surfaces high-impact targets so you can prioritize fixes.

## Optional: Development Bypass

Need to use a local MongoDB container temporarily? Set `ALLOW_LOCAL_MONGODB=true`. Both `lib/mongo.ts` and `scripts/run-route-http-check.ts` respect the flag (the HTTP verification script sets it automatically so the crawl can run even if you only have localhost available).

```bash
ALLOW_LOCAL_MONGODB=true pnpm verify:routes:http
```

**⚠️ WARNING:** The flag simply skips the Atlas-only assertion. CI and production deployments still require TLS-enabled Atlas/DocumentDB URIs, so never check the flag into GitHub Actions configs.

## Route Verification Workflow

```mermaid
graph TD
    A[Start: pnpm verify:routes] --> B[Check route aliases + nav]
    B --> C[Generate JSON artifact]
    C --> D[Archive metrics snapshot]
    D --> E[Run reference + nav route checks]
    E --> F{All checks passed?}
    F -->|No| G[Report Error & Exit]
    F -->|Yes| H[pnpm verify:routes:http]
    H --> I[Build & start server]
    I --> J[Crawl HTTP routes]
    J --> K[Generate report]
    K --> L[Shutdown server]
    L --> M[Exit with Status]
```

## Success Criteria

A successful verification run shows:

```
✓ Build completed (see `_artifacts/route-aliases.json` for exact route count)
✓ Server started on http://127.0.0.1:4010 (or whatever ROUTE_VERIFY_BASE points to)
✓ Every discovered route crawled by `pnpm verify:routes:http`
✓ All responses returned < 400 and _artifacts/route-http.log is empty
✓ 0 errors reported by the verification scripts
```

## Maintenance

### Adding New Routes

When adding new pages under `app/`:

1. Ensure they don't require authentication for initial render (or handle auth gracefully)
2. Test locally with `pnpm verify:routes && pnpm verify:routes:http`
3. Check the route appears in build output
4. Verify HTTP crawler reaches it successfully

### Updating Environment Requirements

If new services are added that require environment variables:

1. Update `.env.example` with placeholder
2. Update this guide's "Required Environment Variables" section
3. Update GitHub Actions secrets documentation
4. Notify team in deployment channels

## Support

For issues with route verification:

1. Check this guide's [Troubleshooting](#troubleshooting) section
2. Review build logs for specific errors
3. Verify all environment variables are set
4. Test routes individually with `curl http://localhost:3000/your-route`

For MongoDB Atlas setup questions, see: https://www.mongodb.com/docs/atlas/getting-started/
