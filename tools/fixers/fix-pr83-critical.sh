#!/bin/bash
# Fix PR #83 Critical Issues
# Auto-fixes for P0 and P1 priority items

echo "=========================================="
echo "FIXING PR #83 CRITICAL ISSUES"
echo "=========================================="
echo ""

FIXED=0
FAILED=0

# Fix 1: Role check in ATS convert-to-employee
echo "1. Fixing role check in app/api/ats/convert-to-employee/route.ts..."
if [ -f "app/api/ats/convert-to-employee/route.ts" ]; then
    sed -i "s/\['ADMIN', 'HR'\]/['corporate_admin', 'hr_manager']/g" app/api/ats/convert-to-employee/route.ts
    echo "   ✅ Fixed"
    FIXED=$((FIXED+1))
else
    echo "   ⏭️  File not found"
fi
echo ""

# Fix 2: Role casing in subscribe/corporate
echo "2. Fixing role casing in app/api/subscribe/corporate/route.ts..."
if [ -f "app/api/subscribe/corporate/route.ts" ]; then
    sed -i "s/'SUPER_ADMIN'/'super_admin'/g" app/api/subscribe/corporate/route.ts
    echo "   ✅ Fixed"
    FIXED=$((FIXED+1))
else
    echo "   ⏭️  File not found"
fi
echo ""

# Fix 3: Shebang in diagnose script
echo "3. Fixing shebang in diagnose-replace-issue.sh..."
if [ -f "diagnose-replace-issue.sh" ]; then
    sed -i '1s/the dual #!/#!/' diagnose-replace-issue.sh
    echo "   ✅ Fixed"
    FIXED=$((FIXED+1))
else
    echo "   ⏭️  File not found"
fi
echo ""

echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo "✅ Fixed: $FIXED"
echo "❌ Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 All automated fixes applied successfully!"
    echo ""
    echo "⚠️  MANUAL FIXES STILL REQUIRED:"
    echo "   - Add authentication to subscribe endpoints"
    echo "   - Add tenant fields to 4 models"
    echo "   - Guard password logging in seed scripts"
    echo "   - Mask secrets in test scripts"
    echo "   - Fix CORS security issue"
    echo ""
    echo "See PR83_FIXES_PLAN.md for details"
    exit 0
else
    echo "⚠️  Some fixes failed - manual intervention required"
    exit 1
fi
