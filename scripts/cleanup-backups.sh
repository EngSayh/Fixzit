#!/bin/bash
# Backup Retention Policy - Keep only last 2 backups
# Run: ./scripts/cleanup-backups.sh

set -e

BACKUP_DIRS=(
  "i18n/dictionaries/backup"
  ".archive"
)

echo "=== Backup Retention Policy ==="
echo "Keeping only the 2 most recent backups in each directory"
echo ""

for dir in "${BACKUP_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "Checking: $dir"
    
    # Find backup files (various patterns)
    find "$dir" -type f \( \
      -name "*.backup*" -o \
      -name "*.bak" -o \
      -name "*.old" -o \
      -name "*.orig" \
    \) -print0 | while IFS= read -r -d '' file; do
      echo "  Found: $file"
    done | head -20
    
    # Get backup files sorted by modification time (newest first)
    backup_files=$(find "$dir" -type f \( \
      -name "*.backup*" -o \
      -name "*.bak" -o \
      -name "*.old" -o \
      -name "*.orig" \
    \) -print0 | xargs -0 ls -t 2>/dev/null || echo "")
    
    if [ -z "$backup_files" ]; then
      echo "  No backup files found"
      continue
    fi
    
    # Count total backups
    total=$(echo "$backup_files" | wc -l | tr -d ' ')
    echo "  Total backups: $total"
    
    if [ "$total" -gt 2 ]; then
      # Delete all except the 2 most recent
      to_delete=$((total - 2))
      echo "  Deleting $to_delete old backups..."
      
      echo "$backup_files" | tail -n +3 | while read -r file; do
        if [ -f "$file" ]; then
          size=$(du -h "$file" | cut -f1)
          echo "    Removing: $file ($size)"
          rm -f "$file"
        fi
      done
      
      echo "  ✓ Cleanup complete"
    else
      echo "  ✓ Already within retention policy (≤2 backups)"
    fi
    echo ""
  fi
done

# Summary
echo "=== Summary ==="
total_size=0
for dir in "${BACKUP_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    size=$(du -sh "$dir" 2>/dev/null | cut -f1 || echo "0")
    count=$(find "$dir" -type f \( -name "*.backup*" -o -name "*.bak" -o -name "*.old" -o -name "*.orig" \) 2>/dev/null | wc -l | tr -d ' ')
    echo "$dir: $count backups ($size)"
  fi
done

echo ""
echo "✓ Backup retention policy applied"
echo "✓ Run this script monthly or add to cron/CI"
