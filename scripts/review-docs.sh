#!/bin/bash
# Documentation Review - Monthly review of docs/current/ for outdated content
# Run: ./scripts/review-docs.sh

set -e

CURRENT_DOCS="docs/current"
ARCHIVED_DOCS="docs/archived/reports"
REVIEW_AGE_DAYS=90  # Files older than 90 days should be reviewed

echo "=== Documentation Review Report ==="
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

if [ ! -d "$CURRENT_DOCS" ]; then
  echo "❌ Directory not found: $CURRENT_DOCS"
  exit 1
fi

echo "Checking: $CURRENT_DOCS"
echo ""

# Find all markdown files
current_files=$(find "$CURRENT_DOCS" -type f -name "*.md" 2>/dev/null || echo "")

if [ -z "$current_files" ]; then
  echo "✓ No files in current documentation directory"
  exit 0
fi

echo "=== Current Documentation Files ==="
echo ""

needs_review=0
old_files=""

while IFS= read -r file; do
  if [ -f "$file" ]; then
    # Get file age in days
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      mod_time=$(stat -f %m "$file")
      current_time=$(date +%s)
    else
      # Linux
      mod_time=$(stat -c %Y "$file")
      current_time=$(date +%s)
    fi
    
    age_days=$(( (current_time - mod_time) / 86400 ))
    
    # Get file info
    filename=$(basename "$file")
    size=$(du -h "$file" | cut -f1)
    mod_date=$(date -r "$file" '+%Y-%m-%d' 2>/dev/null || stat -f %Sm -t '%Y-%m-%d' "$file")
    
    # Check if file is old
    status="✓"
    if [ "$age_days" -gt "$REVIEW_AGE_DAYS" ]; then
      status="⚠️"
      needs_review=$((needs_review + 1))
      old_files="$old_files\n  - $filename (${age_days} days old, last modified: $mod_date)"
    fi
    
    echo "$status $filename"
    echo "   Size: $size | Age: ${age_days} days | Modified: $mod_date"
    
    # Extract first heading
    first_heading=$(grep -m 1 "^#" "$file" 2>/dev/null | sed 's/^#* *//' || echo "No title")
    echo "   Title: $first_heading"
    echo ""
  fi
done <<< "$current_files"

echo "=== Review Summary ==="
echo ""

if [ "$needs_review" -gt 0 ]; then
  echo "⚠️  $needs_review file(s) older than $REVIEW_AGE_DAYS days:"
  echo -e "$old_files"
  echo ""
  echo "📋 Recommended Actions:"
  echo "  1. Review each file for relevance and accuracy"
  echo "  2. Update content if still active"
  echo "  3. Move to $ARCHIVED_DOCS if completed/outdated"
  echo "  4. Delete if no longer needed"
  echo ""
  echo "Example archive command:"
  echo "  mv docs/current/OLD_FILE.md docs/archived/reports/"
else
  echo "✓ All files are current (less than $REVIEW_AGE_DAYS days old)"
fi

echo ""
echo "=== Archive Statistics ==="
archive_count=$(find "$ARCHIVED_DOCS" -type f -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
archive_size=$(du -sh "$ARCHIVED_DOCS" 2>/dev/null | cut -f1 || echo "0")
echo "Archived reports: $archive_count files ($archive_size)"

echo ""
echo "✓ Documentation review complete"
echo "✓ Schedule this to run monthly via cron or CI/CD"
