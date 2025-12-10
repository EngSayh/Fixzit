# Pending Report — 2025-12-10T10:20:55Z

This report consolidates current pending items and follow-ups identified during the latest SMS/Taqnyat cleanup and error-handling hardening work.

## Pending Items
- **Legacy provider references:** Sweep remaining Twilio/Unifonic/SNS mentions in deep/archived docs to align all guidance with Taqnyat + WhatsApp Business only.
- **Provider tests:** Add unit coverage for `lib/sms-providers/taqnyat.ts` to lock phone normalization/validation and error masking; consider OTP failure-path tests once suites exist.
- **Telemetry/health checks:** Confirm no monitoring or health-check paths still expect Twilio metrics; align any dashboards/alerts to Taqnyat-only signals.
- **Dependency hygiene:** After removing `twilio`/`@aws-sdk/client-sns`, ensure caches/prune steps are run (`pnpm prune`) and keep an eye on lingering peer warnings (yaml/gcp-metadata) if they impact CI.
- **Phone masking helpers:** Optionally centralize phone redaction helpers across SMS/WhatsApp/OTP logging for consistency.
- **OTP test coverage:** When auth/OTP suites are present, run/add `tests/**/api/auth` coverage to validate masked logging and dev-mode exposure rules.

## Recommended Verifications
- `pnpm typecheck`
- `pnpm lint`
- `pnpm vitest -c vitest.config.api.ts tests/unit/api/admin/notifications.test.ts`
- `pnpm vitest -c vitest.config.api.ts tests/unit/api/sms-test-route.test.ts`
- If OTP changes are made: `pnpm vitest -c vitest.config.api.ts tests/api/auth/**/*.test.{ts,tsx}` (once available)

