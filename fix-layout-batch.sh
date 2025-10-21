#!/bin/bash

# Batch fix for layout white space issues across all pages
# Adds "flex flex-col" to min-h-screen containers

echo "Starting batch layout fix..."

# Function to safely apply sed with backup and error checking
# Params:
#   $1 - file path
#   $2 - sed pattern
# Returns: 0 on success, 1 on failure
safe_sed() {
  local file="$1"
  local sed_script="$2"

  if [ ! -f "$file" ]; then
    echo "  ⚠️  File not found: $file"
    return 1
  fi

  echo "  Processing $file..."
  # Directly check the exit code of sed. If it fails, restore the backup.
  # Removed `2>/dev/null` to allow sed errors to be visible for debugging.
  if ! sed -i.bak "$sed_script" "$file"; then
    echo "  ✗ sed command failed for $file (exit code: $?)."
    if [ -f "$file.bak" ]; then
      echo "  ↩️  Restoring from backup..."
      mv "$file.bak" "$file"
    fi
    return 1
  fi

  echo "  ✓ Successfully updated $file"
  return 0
}

# Marketplace pages
echo "Fixing marketplace pages..."
files=(
  "app/marketplace/orders/page.tsx"
  "app/marketplace/search/page.tsx"
  "app/marketplace/rfq/page.tsx"
  "app/marketplace/admin/page.tsx"
  "app/marketplace/vendor/page.tsx"
  "app/marketplace/vendor/portal/page.tsx"
  "app/marketplace/vendor/products/upload/page.tsx"
  "app/marketplace/product/[slug]/page.tsx"
)

for file in "${files[@]}"; do
  safe_sed "$file" 's/className="min-h-screen bg-\[#F5F6F8\]"\( \|>\)/className="min-h-screen bg-[#F5F6F8] flex flex-col"\1/g'
done

# Souq and Aqar pages
echo "Fixing souq/aqar pages..."
safe_sed "app/souq/page.tsx" 's/className="min-h-screen"\( \|>\)/className="min-h-screen flex flex-col"\1/g'
safe_sed "app/souq/catalog/page.tsx" 's/className="min-h-screen bg-gray-50"\( \|>\)/className="min-h-screen bg-gray-50 flex flex-col"\1/g'
safe_sed "app/aqar/page.tsx" 's/className="min-h-screen"\( \|>\)/className="min-h-screen flex flex-col"\1/g'

# System and vendor dashboard
echo "Fixing system/vendor pages..."
safe_sed "app/system/page.tsx" 's/className="min-h-screen bg-gray-50"\( \|>\)/className="min-h-screen bg-gray-50 flex flex-col"\1/g'
safe_sed "app/vendor/dashboard/page.tsx" 's/className="min-h-screen bg-gray-50"\( \|>\)/className="min-h-screen bg-gray-50 flex flex-col"\1/g'

# CMS pages
echo "Fixing CMS pages..."
safe_sed "app/cms/[slug]/page.tsx" 's/className="min-h-screen bg-gradient-to-b from-white to-gray-50"\( \|>\)/className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col"\1/g'

# Auth pages - fix login page carefully to avoid duplicating flex
echo "Fixing auth pages..."
# SKIP app/login/page.tsx - manual horizontal layout change (no flex-col needed)
# safe_sed "app/login/page.tsx" 's/className="min-h-screen bg-gradient-to-br from-\[#0061A8\] via-\[#00A859\] to-\[#FFB400\] flex"\( \|>\)/className="min-h-screen bg-gradient-to-br from-[#0061A8] via-[#00A859] to-[#FFB400] flex flex-col"\1/g'
safe_sed "app/logout/page.tsx" 's/className="min-h-screen \(flex\) items-center justify-center bg-gray-50"/className="min-h-screen \1 flex-col items-center justify-center bg-gray-50"/g'

# Not found page
echo "Fixing not-found page..."
safe_sed "app/not-found.tsx" 's/className="min-h-screen bg-gray-50 \(flex\) items-center justify-center px-4"/className="min-h-screen bg-gray-50 \1 flex-col items-center justify-center px-4"/g'

echo ""
echo "Batch layout fix completed!"
echo ""
echo "Showing git diff of changes:"
git diff --stat
echo ""
echo "Run 'pnpm typecheck' to validate changes"
echo "To remove backup files, run: find . -name '*.bak' -type f -delete"
