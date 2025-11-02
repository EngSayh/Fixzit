#!/bin/bash
# Script to fix ALL _id to id references in production code
# Generated: 2025-01-02
# Purpose: Fix schema leakage by normalizing MongoDB _id to id

set -e

echo "=== Fixing _id → id References ==="
echo ""

# Backup files first
echo "Creating backups..."
find app/ components/ lib/ server/ -name "*.ts" -o -name "*.tsx" | while read file; do
  if [[ ! "$file" =~ \.test\. ]] && [[ ! "$file" =~ \.spec\. ]]; then
    cp "$file" "$file.bak"
  fi
done

echo "✅ Backups created (.bak files)"
echo ""

# Fix all instances
echo "Fixing _id references..."

# Pattern 1: mod._id → mod.id
sed -i 's/mod\._id/mod.id/g' app/api/admin/price-tiers/route.ts

# Pattern 2: sub._id → sub.id
sed -i 's/\bsub\._id\b/sub.id/g' app/api/billing/callback/paytabs/route.ts
sed -i 's/\bs\._id\b/s.id/g' app/api/billing/charge-recurring/route.ts

# Pattern 3: inv._id → inv.id
sed -i 's/\binv\._id\b/inv.id/g' app/api/billing/subscribe/route.ts app/api/billing/charge-recurring/route.ts

# Pattern 4: pm._id → pm.id  
sed -i 's/\bpm\._id\b/pm.id/g' app/api/billing/callback/paytabs/route.ts

# Pattern 5: customer._id → customer.id
sed -i 's/\bcustomer\._id\b/customer.id/g' app/api/billing/subscribe/route.ts

# Pattern 6: item._id → item.id
sed -i 's/\bitem\._id\b/item.id/g' app/api/search/route.ts app/api/public/rfqs/route.ts app/api/aqar/map/route.ts

# Pattern 7: user._id → user.id
sed -i 's/\buser\._id\b/user.id/g' app/api/auth/credentials/route.ts lib/auth.ts

# Pattern 8: newUser._id → newUser.id
sed -i 's/\bnewUser\._id\b/newUser.id/g' app/api/auth/signup/route.ts

# Pattern 9: invoice._id → invoice.id
sed -i 's/\binvoice\._id\b/invoice.id/g' app/api/payments/create/route.ts

# Pattern 10: job._id → job.id
sed -i 's/\bjob\._id\b/job.id/g' app/api/ats/jobs/[id]/apply/route.ts app/api/ats/convert-to-employee/route.ts app/api/integrations/linkedin/apply/route.ts

# Pattern 11: candidate._id → candidate.id
sed -i 's/\bcandidate\._id\b/candidate.id/g' app/api/ats/jobs/[id]/apply/route.ts app/api/integrations/linkedin/apply/route.ts

# Pattern 12: application._id → application.id  
sed -i 's/\bapplication\._id\b/application.id/g' app/api/ats/jobs/[id]/apply/route.ts

# Pattern 13: existingApplication._id → existingApplication.id
sed -i 's/\bexistingApplication\._id\b/existingApplication.id/g' app/api/ats/jobs/[id]/apply/route.ts

# Pattern 14: app._id → app.id
sed -i 's/\bapp\._id\b/app.id/g' app/api/ats/convert-to-employee/route.ts app/api/integrations/linkedin/apply/route.ts

# Pattern 15: employee._id → employee.id
sed -i 's/\bemployee\._id\b/employee.id/g' app/api/hr/payroll/runs/[id]/calculate/route.ts

# Pattern 16: run._id → run.id
sed -i 's/\brun\._id\b/run.id/g' app/api/hr/payroll/runs/[id]/calculate/route.ts app/api/hr/payroll/runs/[id]/export/wps/route.ts

# Pattern 17: plan._id → plan.id
sed -i 's/\bplan\._id\b/plan.id/g' app/api/pm/generate-wos/route.ts

# Pattern 18: product._id → product.id
sed -i 's/\bproduct\._id\b/product.id/g' app/api/marketplace/cart/route.ts

# Pattern 19: categoryDoc._id → categoryDoc.id
sed -i 's/\bcategoryDoc\._id\b/categoryDoc.id/g' app/api/marketplace/search/route.ts

# Pattern 20: node._id → node.id
sed -i 's/\bnode\._id\b/node.id/g' app/api/marketplace/categories/route.ts

# Pattern 21: rfq._id → rfq.id
sed -i 's/\brfq\._id\b/rfq.id/g' app/api/rfqs/[id]/publish/route.ts

# Pattern 22: listing/project map patterns
sed -i 's/\bl\._id\b/l.id/g' app/api/aqar/favorites/route.ts
sed -i 's/\bp\._id\b/p.id/g' app/api/aqar/favorites/route.ts

# Pattern 23: pkg._id → pkg.id
sed -i 's/\bpkg\._id\b/pkg.id/g' app/api/aqar/packages/route.ts

# Pattern 24: payment._id → payment.id
sed -i 's/\bpayment\._id\b/payment.id/g' app/api/aqar/packages/route.ts

# Pattern 25: r._id (gx/gy pattern) → r.id
sed -i 's/\br\._id\b/r.id/g' app/api/aqar/map/route.ts

# Pattern 26: value._id → value.id (in notifications)
sed -i 's/\bvalue\._id\b/value.id/g' app/api/notifications/[id]/route.ts

# Pattern 27: n._id → n.id (in notifications array)
sed -i 's/\bn\._id\b/n.id/g' app/api/notifications/route.ts

# Pattern 28: entry._id → entry.id
sed -i 's/\bentry\._id\b/entry.id/g' app/api/finance/ledger/account-activity/[accountId]/route.ts

# Pattern 29: account._id → account.id
sed -i 's/\baccount\._id\b/account.id/g' app/api/finance/ledger/account-activity/[accountId]/route.ts app/api/finance/accounts/[id]/route.ts

# Pattern 30: savedExpense._id → savedExpense.id
sed -i 's/\bsavedExpense\._id\b/savedExpense.id/g' lib/fm-finance-hooks.ts

# Pattern 31: dup._id → dup.id
sed -i 's/\bdup\._id\b/dup.id/g' app/api/integrations/linkedin/apply/route.ts

echo "✅ All _id references fixed"
echo ""

# Count changes
echo "=== Summary ==="
total_changes=$(find app/ components/ lib/ server/ -name "*.ts" -o -name "*.tsx" | while read file; do
  if [[ ! "$file" =~ \.test\. ]] && [[ ! "$file" =~ \.spec\. ]] && [ -f "$file.bak" ]; then
    diff -u "$file.bak" "$file" | grep "^-.*\._id" | wc -l
  fi
done | awk '{sum+=$1} END {print sum}')

echo "Total _id → id changes: $total_changes"
echo ""
echo "✅ Script complete!"
echo ""
echo "To verify: grep -r '\._id' app/ components/ lib/ server/ --include='*.ts' --include='*.tsx' | grep -v '\.test\.' | grep -v '\.spec\.' | wc -l"
