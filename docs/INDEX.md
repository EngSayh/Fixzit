# Fixzit Documentation Index

_Last updated: November 18, 2025_

## Active Hubs

- [`docs/README.md`](README.md) – platform overview, quick start, and setup.
- [`docs/current/README.md`](current/README.md) – curated list of living
  architecture, security, testing, and operations docs.

## Architecture & Code

- [`architecture/ARCHITECTURE.md`](architecture/ARCHITECTURE.md) – full
  description of the Next.js + MongoDB stack.
- [`architecture/PROVIDER_OPTIMIZATION_IMPLEMENTATION.md`](architecture/PROVIDER_OPTIMIZATION_IMPLEMENTATION.md) –
  route-based provider split.
- [`architecture/BACKBONE_INDEX.md`](architecture/BACKBONE_INDEX.md) – module map.
- [`owner-portal-architecture.md`](owner-portal-architecture.md) – owner portal
  component breakdown.
- [`MODEL_CONSOLIDATION_STRATEGY.md`](MODEL_CONSOLIDATION_STRATEGY.md) and
  [`SRC_DIRECTORY_CONSOLIDATION_PLAN.md`](SRC_DIRECTORY_CONSOLIDATION_PLAN.md) –
  codebase structure cleanups.

## Security & Operations

- [`SECURITY.md`](SECURITY.md) – security program overview and guardrails.
- [`security/NEXTAUTH_V5_PRODUCTION_READINESS.md`](security/NEXTAUTH_V5_PRODUCTION_READINESS.md) –
  production readiness checklist.
- [`security/SECURITY_AUDIT_2025_10_20.md`](security/SECURITY_AUDIT_2025_10_20.md)
  and [`security/SECURITY_AUDIT_ADDITIONAL_FINDINGS.md`](security/SECURITY_AUDIT_ADDITIONAL_FINDINGS.md) – latest audits.
- [`operations/GITHUB_SECRETS_SETUP_PRODUCTION.md`](operations/GITHUB_SECRETS_SETUP_PRODUCTION.md)
  and [`operations/SENDGRID_PRODUCTION_GUIDE.md`](operations/SENDGRID_PRODUCTION_GUIDE.md) – secret management and email ops.
- [`NOTIFICATION_CREDENTIALS_GUIDE.md`](NOTIFICATION_CREDENTIALS_GUIDE.md) –
  end-to-end notification configuration.
- [`MANUAL_SECURITY_TESTING_GUIDE.md`](MANUAL_SECURITY_TESTING_GUIDE.md) – playbook
  for hands-on penetration tests.

## Testing & Quality

- [`TESTING_STRATEGY.md`](TESTING_STRATEGY.md) – unit + integration strategy.
- [`MANUAL_UI_TESTING_CHECKLIST.md`](MANUAL_UI_TESTING_CHECKLIST.md) – UI QA.
- [`NOTIFICATION_SMOKE_TEST_QUICKSTART.md`](NOTIFICATION_SMOKE_TEST_QUICKSTART.md)
  and [`NOTIFICATION_SMOKE_TEST_SETUP.md`](NOTIFICATION_SMOKE_TEST_SETUP.md) –
  full workflow for notification tests.
- [`SMOKE_TEST_ORG_GUARDS.md`](SMOKE_TEST_ORG_GUARDS.md) – Org Guard test cases.
- [`testing/COMMUNICATION_LOGS_QA_PLAN.md`](testing/COMMUNICATION_LOGS_QA_PLAN.md) –
  call log verification checklist.

## Internationalization & UX

- [`I18N_QUICK_START.md`](I18N_QUICK_START.md) and
  [`i18n-guidelines.md`](i18n-guidelines.md) – locale setup guide.
- [`I18N_MISSING_KEYS_SUMMARY.md`](I18N_MISSING_KEYS_SUMMARY.md) – outstanding
  key audit.
- [`translations/README.md`](translations/README.md) – latest audit artifacts.
- [`UI_COMPONENTS_SPECIFICATION.md`](UI_COMPONENTS_SPECIFICATION.md) – shared UI
  inventory with RTL notes.

## Performance & Optimization

- [`performance/BUNDLE_ANALYSIS_FINDINGS.md`](performance/BUNDLE_ANALYSIS_FINDINGS.md) –
  analyzer output.
- [`performance/PROVIDER_OPTIMIZATION_RESULTS.md`](performance/PROVIDER_OPTIMIZATION_RESULTS.md) –
  final Nov 7 session results.
- [`performance/OPTIMIZATION_ACTION_PLAN.md`](performance/OPTIMIZATION_ACTION_PLAN.md) –
  prioritized backlog.
- [`performance/PERFORMANCE_ANALYSIS_NEXT_STEPS.md`](performance/PERFORMANCE_ANALYSIS_NEXT_STEPS.md) –
  target Lighthouse improvements.
- [`performance/PERFORMANCE_FIX_GUIDE.md`](performance/PERFORMANCE_FIX_GUIDE.md) –
  recommended tactics.

## Workflow & Status

- [`WORKSPACE_STATUS.md`](WORKSPACE_STATUS.md) – current blockers/runways.
- [`SYSTEM_ORGANIZATION.md`](SYSTEM_ORGANIZATION.md) – workspace cleanup log.
- [`TASK_COMPLETION_SUMMARY.md`](TASK_COMPLETION_SUMMARY.md) – delivered scope.
- [`WORKFLOW_FAILURE_FIX_PLAN.md`](WORKFLOW_FAILURE_FIX_PLAN.md) – mitigation
  plan for recent workflow failures.

## Archived Collections

- [`archived/README.md`](archived/README.md) describes the 60+ progress, report,
  and PR files moved out of the active surface for historical reference.

## Tools & Commands

- Build: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm analyze`.
- Testing: `pnpm test`, `pnpm lint`, `pnpm typecheck`.
- Performance: `lighthouse http://localhost:3000 --output=json --output-path=./lighthouse-report.json`.
- Bundle analyzer: `python3 -m http.server 8080 --directory .next/analyze`.
