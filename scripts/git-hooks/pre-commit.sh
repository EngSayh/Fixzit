#!/usr/bin/env sh
set -e

is_rebase() {
  git rev-parse --git-dir >/dev/null 2>&1 || return 1
  [ -d "$(git rev-parse --git-path rebase-apply)" ] || [ -d "$(git rev-parse --git-path rebase-merge)" ]
}

if is_rebase; then
  echo "[INFO] Rebase in progress; skipping pre-commit checks."
  exit 0
fi

pnpm audit --prod --audit-level=high
pnpm lint:prod
pnpm lint:inventory-org
pnpm guard:fm-hooks
bash scripts/security/check-hardcoded-uris.sh
