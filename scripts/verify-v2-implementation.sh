#!/bin/bash

echo "🔍 V2 Theme & Internationalization - Verification Script"
echo "=========================================================="
echo ""

cd /Users/eng.sultanalhassni/Downloads/Fixzit/Fixzit

# Check for merge conflicts
echo "1. Checking for merge conflicts..."
CONFLICTS=$(grep -r "<<<<<<< HEAD" app lib components contexts server tests 2>/dev/null | wc -l | tr -d ' ')
if [ "$CONFLICTS" -eq "0" ]; then
    echo "   ✅ No merge conflicts in source code"
else
    echo "   ❌ Found $CONFLICTS merge conflict markers"
fi
echo ""

# Check translation files
echo "2. Checking translation files..."
for lang in ar en fr pt ru es ur hi zh; do
    if [ -f "i18n/$lang.json" ]; then
        if python3 -m json.tool "i18n/$lang.json" > /dev/null 2>&1; then
            echo "   ✅ i18n/$lang.json is valid JSON"
        else
            echo "   ❌ i18n/$lang.json is INVALID JSON"
        fi
    else
        echo "   ❌ i18n/$lang.json NOT FOUND"
    fi
done
echo ""

# Check package.json
echo "3. Checking package.json..."
if grep -q "<<<<<<< HEAD" package.json 2>/dev/null; then
    echo "   ❌ package.json has merge conflicts"
else
    if python3 -c "import json; json.load(open('package.json'))" 2>/dev/null; then
        echo "   ✅ package.json is valid JSON"
    else
        echo "   ❌ package.json is INVALID JSON"
    fi
fi
echo ""

# Check pnpm-lock.yaml
echo "4. Checking pnpm-lock.yaml..."
if [ -f "pnpm-lock.yaml" ]; then
    LINES=$(wc -l < pnpm-lock.yaml)
    echo "   ✅ pnpm-lock.yaml exists ($LINES lines)"
else
    echo "   ❌ pnpm-lock.yaml NOT FOUND"
fi
echo ""

# Check key configuration files
echo "5. Checking key configuration files..."
FILES=(
    "config/constants.ts"
    "config/language-options.ts"
    "contexts/ThemeContext.tsx"
    "contexts/TranslationContext.tsx"
    "components/i18n/LanguageSelector.tsx"
    "components/Sidebar.tsx"
    "components/Footer.tsx"
    "app/globals.css"
    "app/api/user/preferences/route.ts"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file exists"
    else
        echo "   ❌ $file NOT FOUND"
    fi
done
echo ""

# Summary
echo "=========================================================="
echo "Verification Complete!"
echo ""
echo "Next Steps:"
echo "  1. Run: pnpm dev (start development server)"
echo "  2. Test theme switching in UI"
echo "  3. Test language selector dropdown"
echo "  4. Verify RTL layout for Arabic"
echo "  5. Check localStorage for fxz.theme key"
echo ""
echo "For full details, see:"
echo "  - V2_IMPLEMENTATION_SUMMARY.md"
echo "  - V2_THEME_INTL_COMPLETION_REPORT.md"
