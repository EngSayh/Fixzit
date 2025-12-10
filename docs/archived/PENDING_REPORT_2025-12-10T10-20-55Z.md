# Pending Report — 2025-12-10T10:27:28Z

Unified pending items across SMS, Copilot, layout/theming, and E2E.

## Pending Items
- **Copilot Cross-Tenant Isolation (E2E failing):** Widget still shows “working on it…”/empty for cross-tenant queries. Ensure guarded responses return explicit denial text matching /(cannot|not permitted|not allowed|denied|لا يمكن|غير مسموح)/ and that the frontend displays it even on guarded responses. Fix empty/invalid JSON requests surfacing “Unexpected end of JSON input”.
- **Auth/JWT secret alignment:** E2E Playwright runs have thrown `JWTSessionError: no matching decryption secret`; ensure `AUTH_SECRET/NEXTAUTH_SECRET` are identical across `.env.test`, Playwright bootstrap, and runtime.
- **Playwright copilot spec timeout:** Targeted `tests/copilot/copilot.spec.ts` is still timing out; rerun with trace/debug and ensure server start + auth bootstrap complete.
- **CORS noise in Playwright:** Add 127.0.0.1 to dev allowlist (done); verify no CORS blocks remain during copilot spec run.
- **AppShell coverage:** Wrap remaining subroutes/templates (admin/fm proxies, marketplace nested, support templates) in AppShell; remove conflicting page padding.
- **UI primitive standardization:** Replace ad-hoc buttons/inputs/cards/status badges with shared Button/Input/Card/StatusPill; enforce 40–44px controls and emerald focus rings.
- **Sidebar/TopBar polish:** Dark rail with inset active bar (RTL), slim header (no gradients/glass), aligned search/lang/notifications/user controls.
- **Tables/status chips:** Convert remaining table badges to StatusPill; enforce 8px grid padding and logical RTL props (ps/pe, text-end).
- **Charts palette:** Replace inline chart colors with emerald/gold via chart-donut/chart-bar wrappers; remove hard-coded palettes.
- **Typography/RTL sweep:** Zero Arabic letter-spacing; replace ml/mr/left/right with logical spacing; mirror directional icons; add aria-labels to icon-only buttons; remove any Business.sa colors/fonts.
- **Tailwind cleanup:** Scrub gradients/animations to use ejar color keys only.
- **SMS/Taqnyat follow-ups:** Keep Taqnyat clean on rebuild; sweep legacy Twilio/Unifonic/SNS references in docs; ensure telemetry/health checks don’t expect Twilio metrics; centralize phone masking helpers; add OTP failure-path tests when suites exist; run `pnpm prune` after dep removals.

## Recommended Verifications
- `pnpm typecheck`
- `pnpm lint`
- `npx playwright test tests/copilot/copilot.spec.ts -g "Cross-Tenant Isolation" --project=chromium --timeout=600000 --reporter=line`
- `pnpm test` (Playwright included) after UI/AppShell fixes
- `pnpm vitest -c vitest.config.api.ts tests/unit/api/admin/notifications.test.ts`
- `pnpm vitest -c vitest.config.api.ts tests/unit/api/sms-test-route.test.ts`
- If OTP changes: `pnpm vitest -c vitest.config.api.ts tests/api/auth/**/*.test.{ts,tsx}` (once available)
