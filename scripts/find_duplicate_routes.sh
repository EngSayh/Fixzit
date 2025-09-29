#!/bin/bash

# Fixzit Platform - Duplicate Route Checker
# This script finds Next.js pages that resolve to the same URL path,
# which causes a build error. It works by ignoring the "(group)" folders.

echo "🔍 Scanning for duplicate routes in the app directory..."

# Find all page files, strip the route group segments, then find duplicates.
find fixzit-postgres/frontend/app -name "page.tsx" | \
sed -E "s|/\([^)]+\)||g" | \
sort | \
uniq -d

DUPLICATES=$(find fixzit-postgres/frontend/app -name "page.tsx" | sed -E "s|/\([^)]+\)||g" | sort | uniq -d)

if [ -z "$DUPLICATES" ]; then
  echo "✅ No duplicate routes found. Your file structure is clean."
else
  echo "🚨 ERROR: Duplicate routes found! The paths listed above resolve to the same URL."
  echo "👉 To fix this, ensure that for each URL path, only one page.tsx file exists outside of any route groups."
fi
