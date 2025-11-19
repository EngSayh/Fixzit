# Current Documentation Hub

This hub surfaces the documents that are still relevant for active product work.
Use it as the first stop before diving into deeper folders.

> **Maintenance:** Every time you add or retire a living document, update this
> list (and the index) in the same pull request so the hub stays accurate.

## Architecture & Code Organization

- [Core architecture overview](../architecture/ARCHITECTURE.md)
- [Provider optimization implementation](../architecture/PROVIDER_OPTIMIZATION_IMPLEMENTATION.md)
- [Modular backbone guide](../architecture/BACKBONE_INDEX.md)
- [ATS module fixes](../modules/ATS_CODE_CORRECTIONS.md)
- [Owner portal architecture notes](../owner-portal-architecture.md)

## Security & Production Operations

- [Security program overview](../SECURITY.md)
- [NextAuth v5 readiness analysis](../security/NEXTAUTH_V5_PRODUCTION_READINESS.md)
- [Security audit (Oct 20, 2025)](../security/SECURITY_AUDIT_2025_10_20.md)
- [GitHub secrets production setup](../operations/GITHUB_SECRETS_SETUP_PRODUCTION.md)
- [SendGrid production guide](../operations/SENDGRID_PRODUCTION_GUIDE.md)

## Testing & Quality

- [Test strategy](../TESTING_STRATEGY.md)
- [Notification smoke test quickstart](../NOTIFICATION_SMOKE_TEST_QUICKSTART.md)
- [Notification smoke test setup](../NOTIFICATION_SMOKE_TEST_SETUP.md)
- [Manual UI testing checklist](../MANUAL_UI_TESTING_CHECKLIST.md)
- [Communication logs QA plan](../testing/COMMUNICATION_LOGS_QA_PLAN.md)

## Internationalization & UX

- [I18N quick start](../I18N_QUICK_START.md)
- [I18N missing keys summary](../I18N_MISSING_KEYS_SUMMARY.md)
- [Translation audit pack](../translations/README.md)
- [UI component specification](../UI_COMPONENTS_SPECIFICATION.md)
- [Route UX improvement record](../ROUTE_UX_IMPROVEMENT_COMPLETE.md)

## Operational Runbooks

- [Fixzit agent quickstart](../FIXZIT_AGENT_QUICKSTART.md)
- [Workspace status dashboard](../WORKSPACE_STATUS.md)
- [Workspace organization summary](../WORKSPACE_ORGANIZATION_SUMMARY.md)
- [Notification credentials guide](../NOTIFICATION_CREDENTIALS_GUIDE.md)
- [File organization plan](../FILE_ORGANIZATION_PLAN.md)

## Historical Material

Older progress logs, session transcripts, PR notes, and daily reports now live
under [`../archived`](../archived/README.md). Key collections:

- [`../archived/reports`](../archived/reports) – status and completion reports
- [`../archived/progress`](../archived/progress) – progress logs by date
- [`../archived/sessions`](../archived/sessions) – session-specific notes
- [`../archived/DAILY_PROGRESS_REPORTS`](../archived/DAILY_PROGRESS_REPORTS) –
  exported daily summaries

## When Adding New Docs

1. Place active guides inside the existing topical folders (architecture,
   security, testing, translations, etc.).
2. If a document only captures historical context, move it directly into an
   appropriate subfolder under `../archived`.
3. Update this hub whenever a new living document should be highlighted.
