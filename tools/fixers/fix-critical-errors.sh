#!/bin/bash
# Automated Fix Script for Critical Errors

echo "=========================================="
echo "FIXING CRITICAL ERRORS"
echo "=========================================="
echo ""

FIXED=0
FAILED=0

# Fix 1: req.ip in server/plugins/auditPlugin.ts
echo "1. Fixing req.ip in server/plugins/auditPlugin.ts..."
if [ -f "server/plugins/auditPlugin.ts" ]; then
    sed -i 's/req\.ip || req\.connection?\.remoteAddress || req\.headers\[.x-forwarded-for.\]?\.split(.,.)?\[0\]/req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown"/g' server/plugins/auditPlugin.ts
    echo "   ✅ Fixed"
    FIXED=$((FIXED+1))
else
    echo "   ⏭️  File not found"
fi
echo ""

# Fix 2: req.ip in src/server/plugins/auditPlugin.ts
echo "2. Fixing req.ip in src/server/plugins/auditPlugin.ts..."
if [ -f "src/server/plugins/auditPlugin.ts" ]; then
    sed -i 's/req\.ip || req\.connection?\.remoteAddress || req\.headers\[.x-forwarded-for.\]?\.split(.,.)?\[0\]/req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown"/g' src/server/plugins/auditPlugin.ts
    echo "   ✅ Fixed"
    FIXED=$((FIXED+1))
else
    echo "   ⏭️  File not found"
fi
echo ""

# Fix 3: Subscription import in jobs/recurring-charge.ts
echo "3. Fixing Subscription import in jobs/recurring-charge.ts..."
if [ -f "jobs/recurring-charge.ts" ]; then
    sed -i "s/import { Subscription } from '..\/server\/models\/Subscription';/import Subscription from '@\/server\/models\/Subscription';/g" jobs/recurring-charge.ts
    echo "   ✅ Fixed"
    FIXED=$((FIXED+1))
else
    echo "   ⏭️  File not found"
fi
echo ""

# Fix 4: Subscription imports in src/jobs/recurring-charge.ts
echo "4. Fixing Subscription import in src/jobs/recurring-charge.ts..."
if [ -f "src/jobs/recurring-charge.ts" ]; then
    sed -i "s/import Subscription from '..\/db\/models\/Subscription';/import Subscription from '@\/server\/models\/Subscription';/g" src/jobs/recurring-charge.ts
    echo "   ✅ Fixed"
    FIXED=$((FIXED+1))
else
    echo "   ⏭️  File not found"
fi
echo ""

# Fix 5: Subscription imports in src/services/
echo "5. Fixing Subscription imports in src/services/..."
for file in src/services/paytabs.ts src/services/checkout.ts src/services/provision.ts; do
    if [ -f "$file" ]; then
        sed -i "s/import Subscription from '..\/db\/models\/Subscription';/import Subscription from '@\/server\/models\/Subscription';/g" "$file"
        echo "   ✅ Fixed $file"
        FIXED=$((FIXED+1))
    fi
done
echo ""

# Fix 6: Install missing type packages
echo "6. Installing missing type packages..."
if npm install --save-dev @types/babel__traverse @types/js-yaml --silent; then
    echo "   ✅ Types installed"
    FIXED=$((FIXED+1))
else
    echo "   ❌ Failed to install types"
    FAILED=$((FAILED+1))
fi
echo ""

echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo "✅ Fixed: $FIXED"
echo "❌ Failed: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo "🎉 All fixes applied successfully!"
    exit 0
else
    echo "⚠️  Some fixes failed - manual intervention required"
    exit 1
fi
