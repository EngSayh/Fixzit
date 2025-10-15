#!/bin/bash
# Comprehensive fix for all duplicate imports and scope issues

echo "🔧 Comprehensive System-Wide Fixes..."
echo ""

# Fix 1: Remove duplicate createSecureResponse imports
echo "1️⃣ Fixing duplicate createSecureResponse imports..."
FILES_WITH_DUP_SECURE=$(grep -l "import { createSecureResponse }" app/api/**/*.ts | xargs -I {} sh -c 'if [ $(grep -c "import { createSecureResponse }" {}) -gt 1 ]; then echo {}; fi')

for file in $FILES_WITH_DUP_SECURE; do
  # Keep only the first occurrence
  awk '!seen[$0]++ || !/import.*createSecureResponse/' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
  echo "  ✓ Fixed: $file"
done

# Fix 2: Remove duplicate rateLimit imports  
echo ""
echo "2️⃣ Fixing duplicate rateLimit imports..."
FILES_WITH_DUP_RATE=$(grep -l "import { rateLimit }" app/api/**/*.ts | xargs -I {} sh -c 'if [ $(grep -c "import { rateLimit }" {}) -gt 1 ]; then echo {}; fi')

for file in $FILES_WITH_DUP_RATE; do
  # Keep only the first occurrence
  awk '!seen[$0]++ || !/import.*rateLimit.*from.*@\/server\/security\/rateLimit/' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
  echo "  ✓ Fixed: $file"
done

# Fix 3: Fix req/request parameter mismatches
echo ""
echo "3️⃣ Fixing req/request parameter scope issues..."

# app/api/i18n/route.ts - change req to request
if grep -q "return createSecureResponse({ ok: false }, 400, req);" app/api/i18n/route.ts 2>/dev/null; then
  sed -i 's/return createSecureResponse({ ok: false }, 400, req);/return createSecureResponse({ ok: false }, 400, request);/g' app/api/i18n/route.ts
  echo "  ✓ Fixed: app/api/i18n/route.ts (req → request)"
fi

# app/api/cms/pages/[slug]/route.ts - change req to _req in GET handler
if grep -q 'return createSecureResponse({ error: "Not found" }, 404, req);' app/api/cms/pages/[slug]/route.ts 2>/dev/null; then
  sed -i 's/return createSecureResponse({ error: "Not found" }, 404, req);/return createSecureResponse({ error: "Not found" }, 404, _req);/g' app/api/cms/pages/[slug]/route.ts
  sed -i 's/return createSecureResponse(page, 200, req);/return createSecureResponse(page, 200, _req);/g' app/api/cms/pages/[slug]/route.ts
  echo "  ✓ Fixed: app/api/cms/pages/[slug]/route.ts (req → _req in GET)"
fi

# Fix PATCH handler in same file
if grep -q 'return createSecureResponse({ error: "Forbidden" }, 403, req);' app/api/cms/pages/[slug]/route.ts 2>/dev/null; then
  # This one is in PATCH handler, need to check the parameter name
  echo "  ℹ️  app/api/cms/pages/[slug]/route.ts PATCH handler needs manual review"
fi

# Fix 4: Fix ats/convert-to-employee global scope issue
echo ""
echo "4️⃣ Fixing global scope issues..."
if grep -q "const canConvertApplications = \['admin', 'hr'\].includes(user.role);" app/api/ats/convert-to-employee/route.ts 2>/dev/null; then
  echo "  ⚠️  app/api/ats/convert-to-employee/route.ts has global scope 'user' reference"
  echo "      This needs manual fix - move inside POST handler"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Automated fixes complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "⚠️  Manual fixes still needed:"
echo "  1. app/api/ats/convert-to-employee/route.ts - move canConvertApplications inside handler"
echo "  2. app/api/cms/pages/[slug]/route.ts - verify req/request naming in PATCH handler"
echo ""
