# Workspace Scan – Duplicates, Legacy, and Unused Assets

Generated automatically via checksum/search passes on the Fixzit repo.

## Duplicate files

- `.env.local` + `.archive/legacy/env/.env.local.backup.*` share identical contents (see the first entry in `duplicate_scan.json`). Keep the canonical `.env.local` but relocate/delete backups containing secrets.
- `tests/playwright-artifacts/**/error-context.md` and retry screenshots still show 20+ duplicate groups in `duplicate_scan.json`. These are generated artifacts and should be wiped automatically after runs.

> Full machine-readable output lives in `duplicate_scan.json`.

## Legacy/backups that should be archived

- `app/api/payments/create/route.ts.BACKUP` – pre-rate-limit PayTabs route, superseded by `route.ts`. Move to `.archive/` or drop to avoid accidental imports.
- `contexts/FormStateContext.tsx.ctx-bak` & `contexts/TranslationContext.tsx.ctx-bak` – stale snapshots retained after refactors; delete once history exists in git.
- `i18n/en.json.bak2`, `i18n/ar.json.bak2` – freeze files duplicating the shipping locales.
- `.env.local.backup.20251117_*` – plaintext env backups; relocate outside the repo or into a secrets vault.
- `dev/refactoring/vendors-route-crud-factory-wip.ts` (documented incomplete in `dev/refactoring/README.md:7-21`) – keep inside an explicit `wip/` or feature branch so it cannot ship.

## Unused/one-off scripts

- `scripts/phase1a-fix-unused-errors.sh` & `scripts/fix-unused-catch-vars.sh` – lint-fix sweeps meant to run once; move to `tools/archive/` if you still want the recipe.
- `qa/scripts/scanPlaceholders.mjs` & `assets/logo_placeholder.txt` – tooling/assets flagged with “placeholder”; verify usage before packaging builds.

## Recommended cleanup sequence

1. Create `.archive/legacy/` and move the `*.BACKUP`, `*.ctx-bak`, and `i18n/*.bak*` files there (or delete).
2. Update CI/test scripts to wipe `tests/playwright-artifacts/**` and ensure the directory stays `.gitignore`d.
3. Remove redundant branding assets once references point to a single file.
4. Relocate one-off automation scripts and placeholder assets into an archive folder to keep `/scripts` production-ready.

## Actions applied (Nov 17)

- Created `.archive/legacy/**` and moved the env backups plus `.ctx-bak`, `.bak2`, and PayTabs `.BACKUP` route snapshots for safekeeping.
- Added `scripts/run-playwright.sh` and routed every Playwright script/QA runner through it so `tests/playwright-artifacts` is purged before/after each job (even on failures).
- Switched all logo references to `/img/fixzit-logo.png`, removed the duplicate `.jpg`/`assets` copies, and repointed service worker/prayer-time assets plus the organization API defaults to the canonical file.
