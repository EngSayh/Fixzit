# Pending Report — 2025-12-10T10:26:13Z

This report consolidates all current pending items from prior reports (including 2025-12-10_13-20-04_PENDING_ITEMS.md and 2025-12-10T10-20-55Z) into a single up-to-date list.

## 🟥 Critical / High
- Fix Vercel `MONGODB_URI` format (remove `< >`, include `/fixzit`); redeploy and verify `/api/health`.
- Verify production after DB fix: `/api/health`, `/api/health/sms`, `/login`.
- Merge PR #508 and rerun end-to-end tests (`USE_DEV_SERVER=true pnpm test:e2e`).
- Production SMS health: confirm `/api/health/sms` reports Taqnyat OK.
- Investigate GitHub Actions failing immediately (runner/secrets/workflow syntax).

## 🟧 Medium
- Review dynamic translation keys (`t(\`${expr}\`)`): `app/fm/properties/leases/page.tsx`, `app/fm/properties/page.tsx`, `app/reports/page.tsx`, `components/admin/RoleBadge.tsx`.
- Verify `TAQNYAT_BEARER_TOKEN` / `TAQNYAT_SENDER_NAME` naming across env/config (ensure no `TAQNYAT_SENDER_ID` drift).
- Consider 3-tier health status (`healthy/degraded/unhealthy`) for health endpoints.
- Remove remaining Twilio/Unifonic/SNS mentions in deeper/archived docs to keep Taqnyat-only guidance.
- Dependency hygiene: after removing `twilio` / `@aws-sdk/client-sns`, run `pnpm prune` and ensure CI caches pick up lockfile changes; watch peer warnings (yaml/gcp-metadata) if they affect CI.
- Monitor/telemetry alignment: ensure no health checks or dashboards still expect Twilio metrics.

## 🟨 Low / Enhancements
- Provider tests: add unit coverage for `lib/sms-providers/taqnyat.ts` (phone normalization/validation and error masking); consider OTP failure-path tests once suites exist.
- Phone masking helpers: centralize phone redaction for SMS/WhatsApp/OTP logging.
- AI memory: populate master index (`node tools/smart-chunker.js`, `node tools/merge-memory.js`).
- Test speed: consider `--bail 1`, parallelization, shared MongoDB Memory Server to reduce API test duration.
- Optional UX: add 3-tier health status and console.log cleanup, RTL CSS audit, setupTestDb helper (from prior pending list).

## Verification Commands (post-fixes)
- `pnpm typecheck`
- `pnpm lint`
- `pnpm vitest -c vitest.config.api.ts tests/unit/api/admin/notifications.test.ts`
- `pnpm vitest -c vitest.config.api.ts tests/unit/api/sms-test-route.test.ts`
- If auth/OTP touched: `pnpm vitest -c vitest.config.api.ts tests/api/auth/**/*.test.{ts,tsx}` (when available)
- `USE_DEV_SERVER=true pnpm test:e2e` (after critical fixes)

