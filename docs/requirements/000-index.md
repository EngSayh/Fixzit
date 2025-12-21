# Fixzit Requirements Index

This index summarizes the authoritative requirement digests that codify the Fixzit product direction. Reviewers and contributors should consult the referenced documents before merging any change. Each digest contains SMART must-pass expectations and links to implementation guidance.

## Requirement Digests

- [Fixzit Bible](010-fixzit-bible.md) — holistic product vision, success metrics, and global UX/engineering guardrails.
- [Fixzit System Blueprint & Master System Bible (v2025.12.19)](011-fixzit-system-blueprint-master-bible-2025-12-19.md) — comprehensive blueprint and QA validation reference.
- [Language Selector](020-language-selector.md) — localization surface areas and fallback rules.
- [Error Experience](030-error-ux.md) — messaging tone, recovery affordances, and logging needs.
- [Role-Based Access Control](040-rbac.md) — persona definitions and authorization matrices.
- [Pricing & Plans](050-pricing-tiers.md) — tier capabilities, upgrade paths, and billing triggers.

## How to Use These Requirements

1. Map each code change to the impacted requirement headings.
2. Validate that the change satisfies every relevant must-pass gate.
3. If gaps remain, propose a diff that reconciles the code or updates the requirement to reflect the new truth.

The `.index/requirements.index.json` file is automatically regenerated in CI whenever requirements change and can be used for local search.
