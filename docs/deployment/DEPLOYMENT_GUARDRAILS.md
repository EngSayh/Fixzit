# Deployment Guardrails (Prod/Preview)

Use this checklist before production/preview deploys to avoid runtime failures and security gaps.

- Required secrets:
  - `NEXTAUTH_URL`, `NEXTAUTH_SECRET`
  - `MONGODB_URI`, `MONGODB_DB`
  - Tap Payments: `TAP_TEST_SECRET_KEY` or `TAP_LIVE_SECRET_KEY`, `NEXT_PUBLIC_TAP_TEST_PUBLIC_KEY` or `NEXT_PUBLIC_TAP_LIVE_PUBLIC_KEY`, `TAP_WEBHOOK_SECRET`
  - MongoDB URL/creds (for budget/queue features)
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
- MongoDB is strongly recommended in production to avoid in-memory fallbacks.
- **Note**: Old `TAP_PUBLIC_KEY` / `TAP_SECRET_KEY` are deprecated. Use environment-specific keys above.
