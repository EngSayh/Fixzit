#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FM_DIR="$REPO_ROOT/app/fm"

if [[ ! -d "$FM_DIR" ]]; then
  echo "Could not find app/fm directory at $FM_DIR" >&2
  exit 2
fi

if ! command -v rg >/dev/null 2>&1; then
  echo "This script requires ripgrep (rg). Please install it and retry." >&2
  exit 3
fi

missing=()
while IFS= read -r page; do
  [[ -z "$page" ]] && continue
  # Check for either direct hook usage OR FmGuardedPage component wrapper
  if ! rg -q -e "useSupportOrg" -e "useOrgGuard" -e "useFmOrgGuard" -e "FmGuardedPage" "$page"; then
    rel_path="${page#$REPO_ROOT/}"
    missing+=("$rel_path")
  fi
done < <(find "$FM_DIR" -name 'page.tsx' -type f | sort)

if ((${#missing[@]} > 0)); then
  echo "❌ Org guard missing in the following FM pages:"
  for file in "${missing[@]}"; do
    echo " - $file"
  done
  echo ""
  echo "Add the standard org guard (useSupportOrg(), useFmOrgGuard(), or FmGuardedPage component) before rerunning this script."
  exit 1
fi

echo "✅ All FM pages include org guard (hook or FmGuardedPage component)."
