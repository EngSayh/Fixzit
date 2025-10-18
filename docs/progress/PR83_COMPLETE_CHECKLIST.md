# PR #83 Complete Comment Checklist

## Systematic Verification of Every Comment

---

## gemini-code-assist bot Comments

### Comment 1: app/api/ats/convert-to-employee/route.ts

**Issue**: Role check incorrect - `['ADMIN', 'HR']` doesn't match RBAC config
**Expected**: `['corporate_admin', 'hr_manager']`
**Status**: Checking...

### Comment 2: app/api/subscribe/corporate/route.ts

**Issue**: Casing inconsistency - `'SUPER_ADMIN'` vs `'corporate_admin'`
**Expected**: `['super_admin', 'corporate_admin']`
**Status**: Checking...

---

## greptile-apps bot Comments

### Comment 3: app/api/marketplace/products/route.ts (line 42)

**Issue**: Redundant database connection calls - both dbConnect() and connectToDatabase()
**Expected**: Choose one pattern consistently
**Status**: Checking...

### Comment 4: server/security/headers.ts (line 51)

**Issue**: `Access-Control-Allow-Origin: '*'` with `Access-Control-Allow-Credentials: 'true'`
**Expected**: Fix CORS violation
**Status**: Checking...

### Comment 5: PR_COMMENT_FIXES_COMPLETE.md (line 1)

**Issue**: Claim contradicts actual state - security issues remain unresolved
**Expected**: Remove or update file
**Status**: Checking...

### Comment 6: diagnose-replace-issue.sh (line 1)

**Issue**: Invalid shebang - `the dual #!/bin/bash`
**Expected**: `#!/bin/bash`
**Status**: Checking...

### Comment 7: fix_retrieval.py (lines 9-12)

**Issue**: Simple string replacement may be fragile
**Expected**: Consider more specific matching
**Status**: Checking...

### Comment 8: create-pr.sh (line 43)

**Issue**: PR title doesn't match actual PR
**Expected**: Update title to match security focus
**Status**: Checking...

### Comment 9: create-pr.sh (line 45)

**Issue**: Missing 'security' label
**Expected**: Add security label
**Status**: Checking...

### Comment 10: PR_DESCRIPTION.md (lines 1-5)

**Issue**: Content mismatch - description is for tooling fixes but PR is security fixes
**Expected**: Update description to match PR
**Status**: Checking...

### Comment 11: PR_DESCRIPTION.md (lines 9-17)

**Issue**: Tool improvements unrelated to security vulnerabilities
**Expected**: Update to focus on security
**Status**: Checking...

### Comment 12: PR_DESCRIPTION.md (lines 218-222)

**Issue**: Next steps focus on package/import management, not security
**Expected**: Update next steps
**Status**: Checking...

### Comment 13: fix_role_enum.py (lines 10-13)

**Issue**: Import detection could miss variations
**Expected**: More robust import detection
**Status**: Checking...

### Comment 14: fix-critical-errors.sh (line 15)

**Issue**: Complex regex may not handle all variations
**Expected**: Test on actual files first
**Status**: Checking...

---

## coderabbitai bot Comments

### Comment 15: scripts/seed-direct.mjs

**Issue**: Plaintext password may be logged
**Expected**: Gate password logs behind NODE_ENV==='development' && !CI
**Status**: Checking...

### Comment 16: scripts/seed-auth-14users.mjs

**Issue**: Password value echoed
**Expected**: Same guard; use SEED_PASSWORD; avoid literals
**Status**: Checking...

### Comment 17: scripts/test-auth-config.js

**Issue**: JWT_SECRET substring displayed
**Expected**: Don't print substring; confirm presence/length only
**Status**: Checking...

### Comment 18: scripts/test-mongodb-atlas.js

**Issue**: URI substring logged
**Expected**: Never echo URIs; only state Atlas/non-Atlas
**Status**: Checking...

### Comment 19: app/api/subscribe/corporate/route.ts

**Issue**: Missing auth & tenant guard
**Expected**: Add getSessionUser, role allowlist, cross-tenant guard
**Status**: Checking...

### Comment 20: app/api/subscribe/owner/route.ts

**Issue**: Missing auth & role/self guard
**Expected**: Add getSessionUser, owner/admin allowlist, default ownerUserId
**Status**: Checking...

### Comment 21: server/models/Benchmark.ts

**Issue**: Missing tenantId
**Expected**: Add required tenantId + unique compound index
**Status**: Checking...

### Comment 22: server/models/DiscountRule.ts

**Issue**: Missing tenantId
**Expected**: Add tenantId + unique (tenantId,key)
**Status**: Checking...

### Comment 23: server/models/OwnerGroup.ts

**Issue**: Missing orgId
**Expected**: Add orgId + unique (orgId,name)
**Status**: Checking...

### Comment 24: server/models/PaymentMethod.ts

**Issue**: Requires both org_id and owner_user_id
**Expected**: Enforce XOR (org_id OR owner_user_id) via pre-validate; add indexes
**Status**: Checking...

### Comment 25: components/topbar/GlobalSearch.tsx

**Issue**: Hardcoded EN; limited keyboard/focus
**Expected**: useTranslation + ARIA + Ctrl/Cmd+K + Escape + focus
**Status**: Checking...

### Comment 26: components/topbar/QuickActions.tsx

**Issue**: Hardcoded brand hex
**Expected**: Replace with brand token class
**Status**: Checking...

### Comment 27: app/api/subscribe/*

**Issue**: Missing OpenAPI 3.0
**Expected**: Provide OpenAPI YAML for both endpoints
**Status**: Checking...

### Comment 28: app/api/subscribe/*

**Issue**: No normalized error shape
**Expected**: {error, code, userMessage, devMessage, correlationId}
**Status**: Checking...

---

## Verification Process

Now checking each item...
