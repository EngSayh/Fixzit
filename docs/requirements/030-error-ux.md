# Error Experience Requirements

Define consistent handling for recoverable and blocking errors across the Fixzit platform.

## Tone & Copy (Must-Pass)

- Use plain language that states the problem, impact, and recovery step in two sentences or fewer.
- Avoid blame; focus on solutions and offer contact options when user action cannot resolve the issue.
- Provide localized strings for all supported locales.

## Visual Treatment

- Display the global error banner for non-blocking issues and a full-screen illustration for fatal errors.
- Icons follow the `status/error` token with 24px size and accessible contrast.
- Include contextual documentation links when relevant (e.g., troubleshooting guides).

## Interaction Requirements

- Offer a primary remediation action (retry, refresh, contact support) and a secondary dismiss option.
- Automatically retry idempotent requests up to 3 times with exponential backoff before surfacing the error.
- Record error occurrences in the activity log for authenticated users.

## Observability

- Emit structured logs containing error code, user role, request ID, and remediation outcome.
- Forward fatal errors to the incident channel with severity scoring per the on-call playbook.

## QA Gates

- Unit tests cover error boundary components and hooks.
- Integration tests simulate API failures and confirm fallback UI.
- Manual QA verifies assistive technology announcements and focus management.
