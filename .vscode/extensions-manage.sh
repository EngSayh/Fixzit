#!/usr/bin/env bash
# Manage VSCode extensions for low-memory environments
# Usage:
#   WHITELIST="publisher.ext1,publisher.ext2" ./extensions-manage.sh [--uninstall]
# If WHITELIST is empty, script will prompt before disabling each extension.

set -euo pipefail

WHITELIST=${WHITELIST:-}
UNINSTALL=false

for arg in "$@"; do
  case "$arg" in
    --uninstall) UNINSTALL=true ;;
    *) ;;
  esac
done

IFS=',' read -r -a KEEP <<< "${WHITELIST}"

echo "Installed extensions:"
code --list-extensions | sed -e 's/^/  - /'

echo
if [ -z "${WHITELIST}" ]; then
  echo "No WHITELIST provided. The script will disable extensions interactively unless --uninstall is passed."
  echo "To run non-interactively provide WHITELIST, e.g.:\n  WHITELIST=ms-vscode.cpptools,coderabbit.coderabbit ./extensions-manage.sh --uninstall"
fi

DISABLED=()
UNINSTALLED=()

while IFS= read -r ext; do
  ext_trimmed=$(echo "$ext" | tr -d '\r')
  keep=false
  for k in "${KEEP[@]}"; do
    if [ -n "$k" ] && [ "$k" = "$ext_trimmed" ]; then
      keep=true
      break
    fi
  done

  if [ "$keep" = true ]; then
    echo "Keeping: $ext_trimmed"
    continue
  fi

  if [ -z "${WHITELIST}" ]; then
    read -p "Disable $ext_trimmed? (y/N) " reply
    if [[ ! "$reply" =~ ^[Yy]$ ]]; then
      echo "Skipping: $ext_trimmed"
      continue
    fi
  else
    echo "Disabling: $ext_trimmed"
  fi

  code --disable-extension "$ext_trimmed" || true
  DISABLED+=("$ext_trimmed")

  if [ "$UNINSTALL" = true ]; then
    echo "Uninstalling: $ext_trimmed"
    code --uninstall-extension "$ext_trimmed" || true
    UNINSTALLED+=("$ext_trimmed")
  fi

done < <(code --list-extensions)

echo
echo "Summary:"
if [ ${#DISABLED[@]} -eq 0 ]; then
  echo "  No extensions were disabled"
else
  printf '  Disabled: %s\n' "${DISABLED[@]}"
fi

if [ "$UNINSTALL" = true ]; then
  if [ ${#UNINSTALLED[@]} -eq 0 ]; then
    echo "  No extensions were uninstalled"
  else
    printf '  Uninstalled: %s\n' "${UNINSTALLED[@]}"
  fi
fi

echo "Done. Restart VSCode for changes to take effect."