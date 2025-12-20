# System-Wide Test and Guard Audit

Generated: 2025-12-20

## Executive Summary

| Category | Finding | Risk |
|----------|---------|------|
| Placeholder Patterns | ✅ 0 strong violations | Low |
| Allow Comments | ⚠️ 10 dashboard hubs with allow | Medium - need ticketing |
| Coming Soon | ✅ 7 occurrences - all in proper context | Low |
| .only in Tests | ✅ 0 found | Low |
| .skip in Tests | ⚠️ 925 skipped test cases | High - need governance |
| Inline SUPER_ADMIN Checks | ⚠️ 40+ routes with inline role checks | Medium - need standardization |
| Status 500 Responses | ℹ️ 30+ catch blocks returning 500 | Low - acceptable for unexpected errors |

---

## 1. Placeholder Patterns

### Strong Patterns (always forbidden)
- `will be implemented here`
- `Content will be implemented here`
- `Under Construction`
- `TODO: Implement`
- `PLACEHOLDER`

**Result:** ✅ No violations found in app/ or components/

---

## 2. Allow Comments

10 dashboard hub pages use `guard-placeholders:allow`:

| File | Line | Ticket? |
|------|------|---------|
| `app/(fm)/dashboard/marketplace/page.tsx` | 173 | ❌ None |
| `app/(fm)/dashboard/crm/page.tsx` | 156 | ❌ None |
| `app/(fm)/dashboard/admin/page.tsx` | 49 | ❌ None |
| `app/(fm)/dashboard/compliance/page.tsx` | 51 | ❌ None |
| `app/(fm)/dashboard/system/page.tsx` | 154 | ❌ None |
| `app/(fm)/dashboard/properties/page.tsx` | 168 | ❌ None |
| `app/(fm)/dashboard/support/page.tsx` | 145 | ❌ None |
| `app/(fm)/dashboard/hr/page.tsx` | 205 | ❌ None |
| `app/(fm)/dashboard/finance/page.tsx` | 236 | ❌ None |
| `app/(fm)/dashboard/reports/page.tsx` | 71 | ❌ None |

**Action Required:** Update guard script to require ticketed format: `guard-placeholders:allow(FIXZIT-XXX)`

---

## 3. Coming Soon Usages

All current "Coming Soon" usages are in allowed contexts:

| File | Context | Status |
|------|---------|--------|
| `app/(fm)/fm/properties/leases/page.tsx:328` | JSX comment | ✅ OK |
| `app/(fm)/fm/properties/leases/page.tsx:334` | i18n t() call | ✅ OK |
| `app/(fm)/fm/properties/documents/page.tsx:294` | JSX comment | ✅ OK |
| `app/(fm)/fm/properties/documents/page.tsx:300` | i18n t() call | ✅ OK |
| `app/superadmin/import-export/page.tsx:234` | Badge component | ✅ OK (excluded) |
| `components/superadmin/PlannedFeature.tsx:6` | Component definition | ✅ OK (excluded) |
| `components/admin/AdminNotificationsTab.tsx:354` | i18n t() call | ✅ OK |

---

## 4. Test Integrity

### .only Check
**Result:** ✅ 0 occurrences found in tests/

### .skip Count
**Result:** ⚠️ 925 occurrences of describe.skip, it.skip, or test.skip

**Action Required:**
1. Create baseline tracking
2. CI should warn when skip count grows without ticket
3. Periodic skip cleanup sprints

---

## 5. Inline Admin Role Checks

Routes with inline SUPER_ADMIN role checking (sample):

| Route | Pattern | Needs Migration |
|-------|---------|-----------------|
| `app/api/admin/users/route.ts` | `session.user.role !== "SUPER_ADMIN"` | Yes |
| `app/api/sms/test/route.ts:39` | `session.user.role !== "SUPER_ADMIN"` | Yes |
| `app/api/kb/ingest/route.ts:44` | `!["SUPER_ADMIN", "ADMIN"].includes(user.role)` | Yes |
| `app/api/contracts/route.ts:100` | `!["SUPER_ADMIN", "ADMIN", "MANAGER"].includes(user.role)` | Yes |
| `app/api/fm/work-orders/auto-assign/route.ts:83` | `actor.role === "SUPER_ADMIN"` | Conditional logic, review |
| `app/api/fm/work-orders/[id]/assign/route.ts:51` | `actor.role === 'SUPER_ADMIN'` | Conditional logic, review |

**Canonical Guard Location:** `lib/api/admin-guard.ts`

**Migration Priority:**
1. `/api/admin/*` routes - High (should use `requireAdmin()`)
2. `/api/superadmin/*` routes - Already using `getSuperadminSession()`
3. FM routes with SUPER_ADMIN checks - Medium (conditional bypass logic)

---

## 6. Status 500 Error Responses

Found 30+ catch blocks returning status 500. Sample:

| Route | Context |
|-------|---------|
| `app/api/organization/settings/route.ts:163` | Unexpected error handler |
| `app/api/pm/plans/route.ts:60,141` | CRUD error handlers |
| `app/api/payments/tap/webhook/route.ts:203` | Payment processing errors |
| `app/api/aqar/leads/route.ts:318,463` | Lead management errors |

**Assessment:** These are legitimate catch-all error handlers for unexpected errors. Status 500 is appropriate.

**Not an Issue:** Authentication/authorization failures properly return 401/403/404, not 500.

---

## Recommendations

### Immediate (Before Next Deploy)
1. ✅ Placeholder patterns - already clean
2. ⚠️ Tighten allow comments to require ticket IDs

### Short-term (Next Sprint)
1. Baseline skip/todo count and add governance
2. Migrate 2-3 admin routes to use canonical guards
3. Add CI warning for new inline role checks

### Medium-term (Backlog)
1. Replace dashboard hub roadmap blocks with real navigation
2. Clean up skipped tests in batches
3. Complete admin guard standardization

---

## Scan Commands Reference

```bash
# Placeholder patterns
grep -rn "will be implemented here\|Under Construction\|TODO: Implement" app components --include="*.tsx"

# Allow comments
grep -rn "guard-placeholders:allow" app --include="*.tsx"

# Coming Soon
grep -rn "Coming Soon" app components --include="*.tsx"

# Test .only (must be 0)
grep -rn "describe\.only\|it\.only\|test\.only" tests --include="*.ts"

# Test .skip count
grep -rn "describe\.skip\|it\.skip\|test\.skip" tests --include="*.ts" | wc -l

# Inline SUPER_ADMIN checks
grep -rn 'role.*"SUPER_ADMIN"\|role !== "SUPER_ADMIN"' app/api --include="*.ts"

# Status 500 responses
grep -rn "status:\s*500" app/api --include="*.ts"
```
