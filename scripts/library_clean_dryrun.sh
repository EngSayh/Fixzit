#!/usr/bin/env bash
set -euo pipefail
shopt -s nullglob

ROOT="."
APPLY="${APPLY:-0}"

log(){ printf "%s\n" "$*"; }
do_move(){
  local src="$1" dest="$2"
  [[ -e "$src" ]] || return 0
  [[ -d "$dest" ]] || { log "SKIP (no dest): $src -> $dest"; return 0; }
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    if [[ "$APPLY" == "1" ]]; then git mv -v -- "$src" "$dest/"; else echo git mv -v -- "$src" "$dest/"; fi
  else
    if [[ "$APPLY" == "1" ]]; then mv -vn -- "$src" "$dest/"; else echo mv -vn -- "$src" "$dest/"; fi
  fi
}

# 1) Reports clutter -> reports/ (only if reports/ exists)
if [[ -d reports ]]; then
  for p in audit-report*.* audit*.* COMPREHENSIVE_*.* COMPLETE_*_REPORT*.* final-*.* final_*.* \
           final-security*.* verification_*.* verify*.* VERIFY_* SYSTEM_HEALTH_REPORT*.* \
           *_report.json *_REPORT.json *_REPORT.md report*.json; do
    for f in "$p"; do do_move "$f" reports; done
  done
fi

# 2) Tools/tests at root -> tools/ (only if tools/ exists)
if [[ -d tools ]]; then
  for p in test_*.* *-test.* *-checker*.* *-scanner*.* analyzer-*.* create_*.* usage_logger.*; do
    for f in "$p"; do do_move "$f" tools; done
  done
fi

# 3) Backups -> ARCHIVE_DUPLICATES/ (only if ARCHIVE_DUPLICATES/ exists)
if [[ -d ARCHIVE_DUPLICATES ]]; then
  for p in *.bak *.bakup *backup* backup_* *~ *.old; do
    for f in "$p"; do do_move "$f" ARCHIVE_DUPLICATES; done
  done
fi

# 4) Legacy Next.js pages/ -> ARCHIVE_DUPLICATES/legacy_pages_YYYYMMDD (ONLY if ARCHIVE_DUPLICATES/ and src/app/ exist)
DATE=$(date +%Y%m%d)
if [[ -d pages && -d src/app && -d ARCHIVE_DUPLICATES ]]; then
  LEG="ARCHIVE_DUPLICATES/legacy_pages_${DATE}"
  mkdir -p "$LEG"
  if [[ "$APPLY" == "1" ]]; then mv -vn pages "$LEG/"; else echo mv -vn pages "$LEG/"; fi
fi

# 5) styles -> src/styles (only if both exist)
if [[ -d styles && -d src/styles ]]; then
  find styles -maxdepth 1 -type f -name '*.*' | while read -r f; do do_move "$f" src/styles; done
  # Optional: move subfolders safely (non-destructive)
  for d in styles/*/; do do_move "$d" src/styles; done
fi

# 6) ui -> src/components/ui (only if both exist)
if [[ -d ui && -d src/components/ui ]]; then
  find ui -maxdepth 1 -type f -name '*.*' | while read -r f; do do_move "$f" src/components/ui; done
  for d in ui/*/; do do_move "$d" src/components/ui; done
fi

# 7) attached_assets -> assets (only if both exist)
if [[ -d attached_assets && -d assets ]]; then
  for f in attached_assets/*; do do_move "$f" assets; done
fi

echo
if [[ "$APPLY" == "1" ]]; then echo "APPLIED: moves executed."; else echo "DRY-RUN ONLY. To apply: APPLY=1 bash ./library_clean_dryrun.sh"; fi