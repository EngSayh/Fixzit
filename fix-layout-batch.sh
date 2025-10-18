#!/bin/bash

# Batch fix for layout white space issues across all pages
# Adds "flex flex-col" to min-h-screen containers

echo "Starting batch layout fix..."

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
  if [ -f "$file" ]; then
    echo "Processing $file..."
    sed -i 's/className="min-h-screen bg-\[#F5F6F8\]"/className="min-h-screen bg-[#F5F6F8] flex flex-col"/g' "$file"
  fi
done

# Souq and Aqar pages
echo "Fixing souq/aqar pages..."
sed -i 's/className="min-h-screen"/className="min-h-screen flex flex-col"/g' app/souq/page.tsx
sed -i 's/className="min-h-screen bg-gray-50"/className="min-h-screen bg-gray-50 flex flex-col"/g' app/souq/catalog/page.tsx
sed -i 's/className="min-h-screen"/className="min-h-screen flex flex-col"/g' app/aqar/page.tsx

# System and vendor dashboard
echo "Fixing system/vendor pages..."
sed -i 's/className="min-h-screen bg-gray-50"/className="min-h-screen bg-gray-50 flex flex-col"/g' app/system/page.tsx
sed -i 's/className="min-h-screen bg-gray-50"/className="min-h-screen bg-gray-50 flex flex-col"/g' app/vendor/dashboard/page.tsx

# CMS pages
echo "Fixing CMS pages..."
sed -i 's/className="min-h-screen bg-gradient-to-b from-white to-gray-50"/className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex flex-col"/g' app/cms/[slug]/page.tsx

# Auth pages
echo "Fixing auth pages..."
sed -i 's/className="min-h-screen bg-gradient-to-br from-\[#0061A8\] via-\[#00A859\] to-\[#FFB400\] flex"/className="min-h-screen bg-gradient-to-br from-[#0061A8] via-[#00A859] to-[#FFB400] flex flex-col"/g' app/login/page.tsx
sed -i 's/className="min-h-screen flex items-center justify-center bg-gray-50"/className="min-h-screen flex flex-col items-center justify-center bg-gray-50"/g' app/logout/page.tsx

# Not found page
echo "Fixing not-found page..."
sed -i 's/className="min-h-screen bg-gray-50 flex items-center justify-center px-4"/className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4"/g' app/not-found.tsx

echo "Batch layout fix completed!"
echo "Run 'pnpm typecheck' to validate changes"
