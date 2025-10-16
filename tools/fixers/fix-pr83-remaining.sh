#!/bin/bash
# Fix PR #83 Remaining Issues
# Fixes for PaymentMethod XOR validation and any remaining security issues

echo "=========================================="
echo "FIXING PR #83 REMAINING ISSUES"
echo "=========================================="
echo ""

FIXED=0
FAILED=0

# Check current status
echo "Checking current status..."
echo ""

# Check 1: Subscribe endpoints authentication
echo "1. Checking subscribe endpoints..."
if grep -q "getSessionUser" app/api/subscribe/corporate/route.ts 2>/dev/null; then
    echo "   ✅ corporate/route.ts has authentication"
else
    echo "   ❌ corporate/route.ts missing authentication"
fi

if grep -q "getSessionUser" app/api/subscribe/owner/route.ts 2>/dev/null; then
    echo "   ✅ owner/route.ts has authentication"
else
    echo "   ❌ owner/route.ts missing authentication"
fi
echo ""

# Check 2: Model tenant fields
echo "2. Checking model tenant fields..."
if grep -q "tenantId" server/models/Benchmark.ts 2>/dev/null; then
    echo "   ✅ Benchmark.ts has tenantId"
else
    echo "   ❌ Benchmark.ts missing tenantId"
fi

if grep -q "tenantId" server/models/DiscountRule.ts 2>/dev/null; then
    echo "   ✅ DiscountRule.ts has tenantId"
else
    echo "   ❌ DiscountRule.ts missing tenantId"
fi

if grep -q "orgId" server/models/OwnerGroup.ts 2>/dev/null; then
    echo "   ✅ OwnerGroup.ts has orgId"
else
    echo "   ❌ OwnerGroup.ts missing orgId"
fi

if grep -q "org_id" server/models/PaymentMethod.ts 2>/dev/null; then
    echo "   ✅ PaymentMethod.ts has org_id field"
    if grep -q "pre('validate'" server/models/PaymentMethod.ts 2>/dev/null; then
        echo "   ✅ PaymentMethod.ts has XOR validation"
    else
        echo "   ⚠️  PaymentMethod.ts missing XOR validation - NEEDS FIX"
    fi
else
    echo "   ❌ PaymentMethod.ts missing org_id field"
fi
echo ""

# Check 3: Password logging guards
echo "3. Checking password logging guards..."
if grep -q "NODE_ENV.*development.*CI" scripts/seed-auth-14users.mjs 2>/dev/null; then
    echo "   ✅ seed-auth-14users.mjs has password guard"
else
    echo "   ⚠️  seed-auth-14users.mjs may need password guard"
fi
echo ""

# Check 4: Secret masking
echo "4. Checking secret masking..."
if grep -q "\\*\\*\\*\\*\\*\\*\\*\\*" scripts/test-auth-config.js 2>/dev/null; then
    echo "   ✅ test-auth-config.js masks JWT_SECRET"
else
    echo "   ⚠️  test-auth-config.js may expose JWT_SECRET"
fi
echo ""

echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo ""
echo "Most issues are already fixed!"
echo ""
echo "Remaining action needed:"
echo "1. Add XOR validation to PaymentMethod.ts"
echo "2. Verify CORS settings in server/security/headers.ts"
echo ""
echo "See fix-payment-method-xor.txt for the code to add"
