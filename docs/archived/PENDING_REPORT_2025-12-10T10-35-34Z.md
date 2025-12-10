# Pending Report — 2025-12-10T10:35:34Z

Consolidated pending items from prior reports (2025-12-10T10-20-55Z, 2025-12-10T10-26-13Z, 2025-12-10T10-34-18Z) into a single list.

## 🟥 Critical / High
- **Production Mongo/health:** Fix `MONGODB_URI`/aliases (no placeholders; SRV+TLS), redeploy, and smoke `/login`, `/api/health`, `/api/auth/session`, `/api/health/sms`.
- **Next.js build breaker:** Stabilize manifest/NFT generation (`pages-manifest`, `_document`, chunks, `_not-found`, middleware) so `pnpm build` passes without ENOENT.
- **Playwright copilot isolation:** Guest/tenant cross-tenant prompts must return explicit denial text (en/ar) and surface in UI; fix empty/invalid JSON errors and timeouts in `tests/copilot/copilot.spec.ts`.
- **Dev server stability for E2E:** Ensure Playwright dev server (port 3100) starts cleanly after manifest fix so assistant button/modules resolve; remove stale trace/rewrites to deleted Nexmo/Twilio/SNS/Unifonic webhooks.
- **Auth/JWT secret alignment:** `AUTH_SECRET/NEXTAUTH_SECRET` identical across `.env.test`, Playwright bootstrap, and runtime to avoid `JWTSessionError`.
- **CI failures:** Investigate GitHub Actions runs failing immediately (runner/secrets/workflow syntax); merge PR #508 then rerun E2E (`USE_DEV_SERVER=true pnpm test:e2e`).
- **Production SMS health:** Taqnyat-only. Confirm `/api/health/sms` OK; ensure no legacy SMS metrics/health checks remain.

## 🟧 Medium
- **Payment config:** Set Tap secrets in prod (`TAP_WEBHOOK_SECRET`, `TAP_PUBLIC_KEY` if needed); PayTabs optional/disabled; keep env validation consistent.
- **Dynamic translation key audit:** `app/fm/properties/leases/page.tsx`, `app/fm/properties/page.tsx`, `app/reports/page.tsx`, `components/admin/RoleBadge.tsx`.
- **Health semantics:** Consider 3-tier health (`healthy/degraded/unhealthy`) and align monitoring dashboards/alerts.
- **Legacy SMS/docs cleanup:** Scrub Twilio/Unifonic/SNS mentions in docs/health dashboards; keep Taqnyat naming consistent (`TAQNYAT_BEARER_TOKEN`, `TAQNYAT_SENDER_NAME`).
- **Dependency hygiene:** After removing legacy providers, run `pnpm prune`; watch peer warnings (yaml/gcp-metadata) impacting CI caches.
- **Database safeguards:** Keep `ALLOW_OFFLINE_MONGODB` / `ALLOW_LOCAL_MONGODB` out of production; watch connection warnings after redeploy.
- **Telemetry/health alignment:** Ensure dashboards no longer expect legacy SMS metrics; add smokes for `/login` and `/api/health` in CI.
- **UI/AppShell/Design sweep:** Wrap remaining subroutes/templates in AppShell; standardize primitives (Button/Input/Card/StatusPill, 40–44px controls, emerald focus); polish Sidebar/TopBar (RTL rail + inset bar, slim header); convert table badges to StatusPill with logical padding; adopt chart palette (emerald/gold via chart wrappers); enforce RTL spacing (ps/pe, text-end), zero Arabic letter-spacing; use ejar color tokens, remove stray gradients/animations.
- **CORS/Playwright noise:** Keep 127.0.0.1 in dev allowlist; verify no CORS blocks during copilot spec runs.

## 🟨 Low / Enhancements
- **Tests:** Add unit coverage for `lib/sms-providers/taqnyat.ts` (phone normalization/error masking); add OTP failure-path tests when suites exist.
- **Logging hygiene:** Centralize phone masking for SMS/WhatsApp/OTP logs; prune `console.log` noise.
- **AI memory upkeep:** Run `node tools/smart-chunker.js` then `node tools/merge-memory.js` to refresh `ai-memory/master-index.json`.
- **Test speed:** Consider `--bail 1`, parallelization, shared Mongo memory server for API tests.
- **Optional UX/Ops:** 3-tier health status chips, RTL CSS audit, `setupTestDb` helper for API suites.

## Verification Commands
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:e2e` (or `PLAYWRIGHT_HTML_REPORT=1 pnpm test:e2e --projects=chromium --filter copilot`)
- Targeted: `npx playwright test tests/copilot/copilot.spec.ts -g "Cross-Tenant Isolation" --project=chromium --timeout=600000 --reporter=line`
- Targeted: `pnpm vitest -c vitest.config.api.ts tests/unit/api/admin/notifications.test.ts`
- Targeted: `pnpm vitest -c vitest.config.api.ts tests/unit/api/sms-test-route.test.ts`
