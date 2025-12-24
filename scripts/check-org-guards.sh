#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# FM pages are under the (fm) route group
FM_DIR="$REPO_ROOT/app/(fm)/fm"

if [[ ! -d "$FM_DIR" ]]; then
  echo "Could not find app/(fm)/fm directory at $FM_DIR" >&2
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
  if rg -q -e "useSupportOrg" -e "useOrgGuard" -e "useFmOrgGuard" -e "FmGuardedPage" "$page"; then
    continue
  fi
  
  # For server components that import a client component, check if the client component has the guard
  page_dir=$(dirname "$page")
  # Look for Client component imports and check those files
  has_guarded_client=false
  while IFS= read -r client_import; do
    [[ -z "$client_import" ]] && continue
    # Extract the import path (handles "./ComponentClient" or "./Component")
    client_file=$(echo "$client_import" | sed -E 's/.*from ["\x27]\.\/([^"\x27]+)["\x27].*/\1/')
    # Try with .tsx extension
    client_path="$page_dir/${client_file}.tsx"
    if [[ -f "$client_path" ]] && rg -q -e "useSupportOrg" -e "useOrgGuard" -e "useFmOrgGuard" -e "FmGuardedPage" "$client_path"; then
      has_guarded_client=true
      break
    fi
  done < <(rg -o 'import .* from ["\x27]\./[A-Za-z]+Client["\x27]' "$page" 2>/dev/null || true)
  
  if [[ "$has_guarded_client" == "true" ]]; then
    continue
  fi
  
  rel_path="${page#$REPO_ROOT/}"
  missing+=("$rel_path")
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
