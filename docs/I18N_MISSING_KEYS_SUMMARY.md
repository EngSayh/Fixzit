# i18n Missing Translation Keys Summary

**Generated:** 2025-11-08  
**Source:** reports/i18n-missing.json (Fixzit Agent run)

## Overview

- **Total Missing Keys:** 1,330
- **Existing en.json Keys:** 366
- **Existing ar.json Keys:** 366
- **Keys Used in Code:** 1,466
- **Coverage:** 25% (366/1,466)

## Issue Analysis

The codebase uses 1,330 translation keys that are **not defined** in either `i18n/locales/en.json` or `i18n/locales/ar.json`. These keys will render as their literal key names (e.g., "admin.users.cancel" instead of "Cancel") in the UI.

## Key Breakdown by Module

Based on the first 50 keys from the report, the missing keys span these namespaces:

### 1. **Admin Module** (`admin.*`)

- User management: `admin.users.*` (cancel, create, searchPlaceholder, filterRole, filterStatus, deleteSelected, name, edit, delete, total, etc.)
- Role management: `admin.roles.*` (comingSoon, superAdminDesc, adminDesc, managerDesc, userDesc)
- Audit logs: `admin.audit.*` (filterUser, filterAction, clear, loadFailed, time, entity, previous, page, next)
- Feature flags: `admin.features.*` (desc, open)

### 2. **Finance Module** (`finance.*`)

Likely includes: budget management, invoices, payments, reports

### 3. **HR Module** (`hr.*`)

Likely includes: employees, attendance, leave, payroll

### 4. **Work Orders** (`workOrders.*`)

Likely includes: create, status, assign, close, filter

### 5. **Properties** (`properties.*`)

Likely includes: listings, details, search, filter

### 6. **Common UI** (buttons, forms, tables)

- Pagination: previous, page, next, of, total
- Actions: cancel, create, edit, delete, save, clear
- Filters: filterRole, filterStatus, filterUser, filterAction
- Search: searchPlaceholder

## Priority Levels

### 🔴 CRITICAL (P0) - Immediate Action

Keys used in authentication, navigation, and core workflows:

- Login/logout flows
- Primary navigation labels
- Error messages and validation
- Form submission buttons

### 🟡 HIGH (P1) - Short Term

Keys used in frequently accessed modules:

- Admin user management
- Work order creation and status
- Property listings and details
- Financial dashboards

### 🟢 MEDIUM (P2) - Medium Term

Keys used in secondary features:

- Audit logs and reports
- Feature flag descriptions
- Advanced filters
- Bulk actions

### ⚪ LOW (P3) - Long Term

Keys used in edge cases or admin-only features:

- Role descriptions
- "Coming Soon" placeholders
- Debug/developer tools

## Recommended Actions

### Option 1: Auto-Generate Placeholders (Quick Fix)

```bash
# Generate skeleton keys from the missing list
node scripts/generate-i18n-placeholders.js
```

- Pros: Fast, prevents UI breakage
- Cons: English-only, requires manual translation

### Option 2: Manual Curation (Quality Fix)

1. Review `reports/i18n-missing.json` full list
2. Prioritize by module and frequency
3. Add translations in batches:
   - Week 1: Admin + Auth (P0)
   - Week 2: Work Orders + Properties (P1)
   - Week 3: Finance + HR (P1)
   - Week 4: Reports + Settings (P2)

### Option 3: Hybrid Approach (Recommended)

1. Auto-generate English placeholders for all 1,330 keys
2. Machine-translate to Arabic using i18n library
3. Manual review and refinement by native speakers
4. Deploy in stages with feature flags

## Technical Notes

### Key Naming Convention

Current pattern: `module.feature.action` (e.g., `admin.users.create`)

**Recommendation:** Maintain consistency:

- ✅ `admin.users.create` (Good)
- ❌ `adminUserCreate` (Bad - hard to namespace)
- ❌ `admin_users_create` (Bad - inconsistent delimiter)

### Translation File Structure

```json
{
  "admin": {
    "users": {
      "create": "Create User",
      "edit": "Edit User",
      "delete": "Delete User"
    }
  }
}
```

### Usage in Code

```tsx
import { useTranslations } from "next-intl";

export default function UsersPage() {
  const t = useTranslations("admin.users");

  return (
    <button>{t("create")}</button> // ✅ Resolves to "admin.users.create"
  );
}
```

## Next Steps

1. **Immediate (This Sprint):**
   - Review missing keys from critical modules (admin, auth, navigation)
   - Add P0 translations to en.json and ar.json
   - Test with `pnpm run fixzit:agent` to verify coverage increase

2. **Short Term (Next Sprint):**
   - Create script to auto-generate placeholder translations
   - Add P1 translations (work orders, properties, finance)
   - Update test snapshots if needed

3. **Long Term (Backlog):**
   - Implement translation coverage CI/CD check
   - Add ESLint rule to enforce t() usage for user-facing strings
   - Consider lazy-loading translations by module

## References

- Full list: `reports/i18n-missing.json`
- Existing translations: `i18n/locales/en.json`, `i18n/locales/ar.json`
- i18n config: `i18n/index.ts`
- Translation hook: `useTranslations()` from next-intl

---

**Action Owner:** TBD  
**Target Completion:** TBD  
**Related Issues:** #[TBD]
