# Deployment Notes (SMS & MongoDB)

## SMS (Taqnyat-only)
- Supported provider: **Taqnyat** only (CITC-compliant for KSA).
- Required env vars: `TAQNYAT_BEARER_TOKEN`, `TAQNYAT_SENDER_NAME`.
- Legacy Twilio/Unifonic vars are ignored; validation now emits warnings if they are present.

## MongoDB URI aliases
- `MONGODB_URI` now honors aliases: `DATABASE_URL`, `MONGODB_URL`, `MONGO_URL`.
- Production expectations:
  - Prefer `mongodb+srv://` (Atlas). Non-SRV must enforce TLS (`tls=true`/`ssl=true`) or explicitly set `ALLOW_NON_SRV_MONGODB=true`.
  - `retryWrites=true` is applied by default in the connection options.

## Playwright/CI hint
- For slower environments, cap workers: `PLAYWRIGHT_MAX_WORKERS=2 pnpm test -- --runInBand`.
