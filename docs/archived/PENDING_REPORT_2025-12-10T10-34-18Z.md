# Pending Report — 2025-12-10T10:34:18Z

Consolidated all pending items from earlier reports (e.g., 2025-12-10T10-26-13Z, 2025-12-10_13-20-04) plus new findings from the latest production and Playwright failures.

## 🟥 Critical / High
- Production 500s: deploy with Mongo URI aliases/TLS guard (`MONGODB_URI` or `DATABASE_URL`/`MONGODB_URL`/`MONGO_URL`); confirm no `< >` placeholders and TLS enforced (no `ALLOW_NON_SRV_MONGODB` unless TLS proven). Smoke `/login`, `/api/health`, `/api/auth/session` on the deployed TLS-backed cluster.
- Next.js build breaker: simplify manifest/NFT stubber so clean builds no longer hit ENOENT for `pages-manifest.json`, `_document`, or missing chunks; pre-create `_not-found`/middleware/middleware-manifest `.nft.json` from a clean `.next` and rerun `pnpm build`.
- Playwright copilot cross-tenant isolation (GUEST): adjust copilot RBAC/chat responses so “another company” queries are denied for guests; rerun `pnpm test:e2e --projects=chromium --filter copilot`.
- Stabilize Playwright dev server (port 3100) after manifest fix so assistant button renders and modules resolve (no `beforeFiles`/missing chunk errors).
- Legacy webhook traces: ensure Next trace/rewrites no longer reference removed Nexmo/Twilio/SNS/Unifonic routes (e.g., `app/api/webhooks/nexmo/sms/route.ts`) to avoid missing trace lookups.

## 🟧 Medium
- Payment config alignment: set Tap secrets in prod (`TAP_WEBHOOK_SECRET`, `TAP_PUBLIC_KEY` if required); PayTabs optional/disabled. Keep env validation/next.config guardrails consistent.
- Production SMS health: confirm `/api/health/sms` reports Taqnyat OK; scrub remaining legacy SMS provider mentions.
- CI/monitoring: add smokes for `/login` and `/api/health`; add Playwright preflight env validation to catch drift early. Investigate GitHub Actions runs that fail immediately (runner/secrets/workflow syntax).
- Pending PR coverage: merge PR #508 then rerun E2E (`USE_DEV_SERVER=true pnpm test:e2e`) once build/test blockers cleared.
- Dynamic translation key audit: `app/fm/properties/leases/page.tsx`, `app/fm/properties/page.tsx`, `app/reports/page.tsx`, `components/admin/RoleBadge.tsx`.
- Database safeguards: keep `ALLOW_OFFLINE_MONGODB`/`ALLOW_LOCAL_MONGODB` out of production; watch connection warnings after redeploy.
- Telemetry/health alignment: ensure dashboards/alerts no longer expect legacy SMS metrics; consider 3-tier health status (`healthy/degraded/unhealthy`).

## 🟨 Low / Enhancements
- Tests: add unit coverage for `lib/sms-providers/taqnyat.ts` (phone normalization/error masking); consider OTP failure-path tests.
- Logging hygiene: centralize phone masking for SMS/WhatsApp/OTP logs; prune `console.log` noise.
- AI memory upkeep: run `node tools/smart-chunker.js` then `node tools/merge-memory.js` to refresh `ai-memory/master-index.json`.
- Test speed: consider `--bail 1`, parallelization, and shared Mongo memory server for API tests.
- Optional UX/ops: 3-tier health status chips, RTL CSS audit, `setupTestDb` helper for API suites.

## Verification commands
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e` (or `PLAYWRIGHT_HTML_REPORT=1 pnpm test:e2e --projects=chromium --filter copilot` for targeted rerun)
- After manifest guard fix: `rm -rf .next && pnpm build`
- Production smoke: `curl -I https://fixzit.co/login && curl -I https://fixzit.co/api/health && curl -I https://fixzit.co/api/auth/session`
