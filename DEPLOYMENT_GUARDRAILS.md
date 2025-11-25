# Deployment Guardrails (Prod/Preview)

Use this checklist before production/preview deploys to avoid runtime failures and security gaps.

- Required secrets:
  - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
  - `MONGODB_URI`, `MONGODB_DB`
  - `TAP_PUBLIC_KEY`, `TAP_WEBHOOK_SECRET`
  - Redis URL/creds (for budget/queue features)
- Forbidden flags in prod:
  - `SKIP_ENV_VALIDATION=true`
  - `DISABLE_MONGODB_FOR_BUILD=true`
- Recommended commands:
  - `pnpm guard:prod-env` (CI guardrail; fails if the above flags/secrets are wrong)
  - `pnpm build` (ensures Next.js build completes)
  - `npx playwright test tests/e2e/auth.spec.ts --project=chromium --workers=1` (auth sanity)

Notes:
- Local/dev can set skip flags, but production/preview must not.
- Payment/webhook flows require TAP keys; without them, verification is disabled.
- Redis is strongly recommended in production to avoid in-memory fallbacks.
