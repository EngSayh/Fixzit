#!/usr/bin/env python3
"""
Final conflict marker cleanup - removes ALL types of conflict markers
"""
import re
import sys
from pathlib import Path

files_to_fix = [
    "app/api/admin/footer/route.ts",
    "app/api/billing/charge-recurring/route.ts",
    "app/api/finance/expenses/route.ts",
    "app/api/marketplace/search/route.ts",
    "app/api/owner/statements/route.ts",
    "app/api/work-orders/sla-check/route.ts",
    "app/aqar/map/page.tsx",
    "app/aqar/properties/page.tsx",
    "app/cms/[slug]/page.tsx",
    "app/finance/fm-finance-hooks.ts",
    "app/finance/payments/new/page.tsx",
    "app/hr/payroll/page.tsx",
    "app/marketplace/admin/page.tsx",
    "app/marketplace/checkout/page.tsx",
    "app/marketplace/orders/page.tsx",
    "app/marketplace/product/[slug]/page.tsx",
    "app/marketplace/rfq/page.tsx",
    "app/notifications/page.tsx",
    "app/souq/catalog/page.tsx",
    "app/support/my-tickets/page.tsx",
    "app/work-orders/pm/page.tsx",
    "components/ClientLayout.tsx",
    "components/ErrorBoundary.tsx",
    "components/finance/AccountActivityViewer.tsx",
    "components/topbar/GlobalSearch.tsx",
    "contexts/FormStateContext.tsx",
    "contexts/TranslationContext.tsx",
    "lib/api/crud-factory.ts",
    "lib/audit.ts",
    "lib/audit/middleware.ts",
    "lib/finance/pricing.ts",
    "lib/fm-approval-engine.ts",
    "lib/fm-auth-middleware.ts",
    "lib/fm-notifications.ts",
    "lib/mongo.ts",
    "lib/mongodb-unified.ts",
    "locales/ar.ts",
    "locales/en.ts",
    "server/copilot/tools.ts",
    "server/middleware/withAuthRbac.ts",
    "server/models/FeatureFlag.ts",
    "server/models/finance/Journal.ts",
    "server/models/finance/Payment.ts",
    "server/services/owner/financeIntegration.ts",
    "server/work-orders/wo.service.ts",
    "tests/system/verify-passwords.ts",
]

base_dir = Path("/Users/eng.sultanalhassni/Downloads/Fixzit/Fixzit")

fixed_count = 0
error_count = 0

for rel_path in files_to_fix:
    file_path = base_dir / rel_path
    
    if not file_path.exists():
        print(f"⚠️  Not found: {rel_path}")
        continue
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        if '<<<<<<< HEAD' not in content and '=======' not in content and '>>>>>>>' not in content:
            continue
        
        # Remove all conflict markers
        # Pattern 1: Full conflict block (keep incoming)
        pattern1 = r'<<<<<<< HEAD.*?=======\s*(.*?)\s*>>>>>>> [a-f0-9]{7,40}'
        content = re.sub(pattern1, r'\1', content, flags=re.DOTALL)
        
        # Pattern 2: Standalone markers that might remain
        content = re.sub(r'^<<<<<<< HEAD\s*\n', '', content, flags=re.MULTILINE)
        content = re.sub(r'^=======\s*\n', '', content, flags=re.MULTILINE)
        content = re.sub(r'^>>>>>>> [a-f0-9]{7,40}\s*\n', '', content, flags=re.MULTILINE)
        
        # Write back
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✅ Fixed: {rel_path}")
        fixed_count += 1
        
    except Exception as e:
        print(f"❌ Error fixing {rel_path}: {e}")
        error_count += 1

print()
print(f"✅ Fixed {fixed_count} files")
if error_count > 0:
    print(f"❌ Errors: {error_count} files")
print()
print("Verification:")
print("Run: grep -r '<<<<<<< HEAD' app lib components contexts server tests | wc -l")
