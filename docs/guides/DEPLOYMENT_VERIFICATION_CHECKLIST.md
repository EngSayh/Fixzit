# Production Deployment Verification Checklist

Purpose: A compact, actionable checklist to verify that the recent fixes (security, API validation, atomic model updates) are deployed and working in production. This document is for the release owner and on-call engineer to run before and immediately after a production rollout.

## Pre-deployment (staging / canary)

- [ ] Deploy `feat/topbar-enhancements` to staging environment.
- [ ] Run `pnpm typecheck && pnpm lint && pnpm test` in staging build pipeline and confirm result is green.
- [ ] Run integration tests (OAuth flows, listing/favorites API, lead flows) against staging.
- [ ] Run quick DB migration dry-run (if any migrations were added) against a copy of production DB snapshot.
- [ ] Run `fixzit:dedupe:scan` (if applicable) and review scan results.
- [ ] Run `fixzit:verify` script and ensure all checks pass.

## Canary deployment (10%)

- [ ] Deploy to 10% of production traffic (use feature flags or traffic split).
- [ ] Run smoke tests:
  - Favorites create/delete flow
  - Listings search with geo and pagination
  - User provisioning (OAuth sign-in)
  - Lead create/addNote
- [ ] Verify the following logs/metrics for 2 hours:
  - Error rate (Sentry): within baseline
  - Auth success rate: > 99%
  - Average OAuth callback latency: < 500ms
  - DB error rates: none
- [ ] Confirm analytics updates are applied (e.g., favorites counts updated for listings/projects)

## Full rollout

- [ ] If canary looks healthy, roll out to 50% and monitor for 4 hours.
- [ ] If 50% is healthy, roll out to 100% and monitor for 24 hours.
- [ ] Verify post-deployment smoke tests pass.

## Post-deployment checks

- [ ] Confirm Sentry shows no new high-severity exceptions related to recent changes.
- [ ] Confirm favorites/listings analytics match expected values (sample queries).
- [ ] Confirm manual sanity checks for key user journeys (login, listing search, favorite toggle).
- [ ] Run database consistency checks if applicable.

## Rollback plan (if issues detected)

- [ ] Revert to previous stable commit using the documented rollback procedure.
- [ ] Restore pre-deployment DB snapshot if necessary.
- [ ] Notify stakeholders and open incident ticket.

## Notes

- This checklist is intentionally light-weight to allow fast verification. Add project-specific checks as needed.
- Keep a copy of this checklist in deployment notes for audit purposes.
