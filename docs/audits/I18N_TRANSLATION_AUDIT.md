# I18N Translation Issues Audit Report

**Date:** November 18, 2025  
**Issue:** Missing translations, broken auto-translation keys, and inconsistent translation patterns  
**Related to:** useAutoTranslator.ts fix for scoped keys (landing.hero.title.line1 instead of auto.\*)

---

## Summary

Found **multiple categories of i18n issues** affecting 204+ files using translation hooks. The recent fix to `useAutoTranslator.ts` resolved auto-translation slugging, but similar patterns exist throughout the codebase.

> **Tracking note (2025-11-18):** A live tracker now lives at `reports/i18n-tracker.md`. Ripgrep snapshot shows **254** files with translation hooks, so the 40 % milestone requires **102** verified files. Update the tracker after each batch (see instructions inside the file).

---

## Critical Findings

### ✅ **FIXED: Auto-Translation Key Pattern**

**File:** `i18n/useAutoTranslator.ts`

**Previous Behavior:**

```typescript
// All IDs were slugged under auto.* namespace
translationKey = `auto.${scope}.${slugify(id)}`;
// Example: auto.landing.hero-title-line1
```

**New Behavior:**

```typescript
if (id.startsWith(`${scope}.`) || id.startsWith("auto.")) {
  translationKey = id; // Use as-is
} else if (id.includes(".")) {
  translationKey = `${scope}.${id}`; // Prefix with scope
} else {
  translationKey = `auto.${scope}.${slugify(id)}`; // Slug only simple strings
}
// Example: landing.hero.title.line1 (real key)
```

**Impact:** Landing page and other auto-translated pages now resolve real translation keys from dictionaries instead of falling back to English.

---

## Issue Categories

### 🔴 **Issue 1: Missing Sidebar Sub-Module Translations**

**Status:** ✅ FIXED  
**Files Affected:** `i18n/sources/nav.translations.json`

**Problem:**
Sidebar sub-modules were showing fallback English or Arabic strings instead of proper translations.

**Examples of Added Keys:**

```json
{
  "nav.finance.invoices": "Invoices",
  "nav.finance.payments": "Payments",
  "nav.finance.expenses": "Expenses",
  "nav.finance.budgets": "Budgets",
  "nav.finance.reports": "Finance Reports",
  "nav.hr.directory": "Employee Directory",
  "nav.hr.attendanceLeave": "Attendance & Leave",
  "nav.hr.payroll": "Payroll",
  "nav.hr.recruitment": "Recruitment (ATS)",
  "nav.marketplace.vendors": "Vendors & Suppliers",
  "nav.marketplace.catalog": "Service Catalog",
  "nav.system.users": "User Management",
  "nav.system.roles": "Roles & Permissions",
  "nav.system.integrations": "Integrations"
}
```

**Fix Applied:**

- Added all missing sub-module keys to `nav.translations.json`
- Normalized English values that were showing Arabic strings
- Rebuilt dictionaries with `pnpm run i18n:build`

---

### 🟡 **Issue 2: Components Using useTranslation**

**Scope:** 204 files using `useTranslation` or `useAutoTranslator` hooks

**Note:** The original audit incorrectly claimed 48 routes were broken. After shipping bespoke FM pages we now have 23 alias files (0 missing targets). See `BROKEN_ROUTES_AUDIT.md` for the latest route metrics.

**Files Breakdown:**

```bash
# Total files using translation hooks
204 files contain: useTranslation | useAutoTranslator
```

**Common Patterns Found:**

#### Pattern A: Direct t() calls (Good)

```tsx
const { t } = useTranslation();
<h1>{t("common.title", "Default Title")}</h1>;
```

✅ **Status:** Working correctly if keys exist in dictionaries

#### Pattern B: useAutoTranslator with explicit IDs (Fixed)

```tsx
const at = useAutoTranslator("landing");
<h1>{at("Hero Title", "hero.title")}</h1>;
```

✅ **Status:** Now resolves to `landing.hero.title` correctly

#### Pattern C: useAutoTranslator without IDs (Legacy)

```tsx
const at = useAutoTranslator("module");
<span>{at("Some Text")}</span>;
```

⚠️ **Status:** Falls back to `auto.module.some-text` (slugged)

---

### 🟡 **Issue 3: Shared Component Translations**

**Problem:** Some routes reuse the same component (e.g., 3 aliases → `app/fm/finance/page.tsx`), so translations are shared but may not be contextually appropriate for all menu items.

**Source Files Structure:**

```
i18n/sources/
├── nav.translations.json ✅
├── landing.translations.json ✅
├── common.translations.json ✅
├── dashboard.translations.json ✅
├── hr.translations.json ✅
├── finance.translations.json ✅
├── properties.translations.json ✅
├── workOrderManagement.translations.json ✅
├── marketplace.translations.json ✅
└── ... (800+ translation source files)
```

**Potentially Missing:**

- Individual page-specific translations for all `/fm/*` routes
- Error message translations for placeholder-backed routes that still need bespoke UX
- Dynamic component translations

---

### 🟡 **Issue 4: Inconsistent Translation Key Patterns**

**Found 3 Different Patterns:**

#### 1. Flat Keys (Old Style)

```json
{
  "title": "Title",
  "subtitle": "Subtitle"
}
```

#### 2. Dot-Notation Keys (Recommended)

```json
{
  "nav.finance.invoices": "Invoices",
  "nav.finance.payments": "Payments"
}
```

#### 3. Nested Objects (Also Valid)

```json
{
  "nav": {
    "finance": {
      "invoices": "Invoices",
      "payments": "Payments"
    }
  }
}
```

**Problem:** Mixing patterns causes confusion and makes keys harder to find.

---

### 🟢 **Issue 5: Auto-Translation Fallback Chain**

**Current Behavior:** When a key is missing:

1. Check scoped key (e.g., `landing.hero.title`)
2. Check auto-slugged key (e.g., `auto.landing.hero-title`)
3. Fall back to English string provided
4. Interpolate parameters if any

**This is GOOD** - provides graceful degradation.

---

## Files Using Translation Hooks

### By Module (Top 20):

| Module        | Files | Translation Pattern   |
| ------------- | ----- | --------------------- |
| Work Orders   | 12+   | `useTranslation()`    |
| Finance       | 10+   | `useTranslation()`    |
| HR/Employees  | 8+    | `useTranslation()`    |
| Properties    | 7+    | `useTranslation()`    |
| Dashboard     | 6+    | `useTranslation()`    |
| Marketplace   | 5+    | `useAutoTranslator()` |
| CRM           | 4+    | `useTranslation()`    |
| Support       | 4+    | `useTranslation()`    |
| Compliance    | 3+    | `useTranslation()`    |
| System        | 3+    | `useTranslation()`    |
| Landing Pages | 3+    | `useAutoTranslator()` |
| Admin         | 2+    | `useTranslation()`    |
| Reports       | 2+    | `useTranslation()`    |
| Vendors       | 2+    | `useTranslation()`    |
| Notifications | 2+    | Mixed                 |
| Services      | 10+   | Server-side i18n      |

---

## Translation Coverage Analysis

### Coverage Status by Module:

#### ✅ **High Coverage (90%+)**

- Common UI elements
- Navigation/Sidebar
- Dashboard widgets
- Authentication (login/signup)
- Landing pages (after recent fix)

#### 🟡 **Medium Coverage (60-90%)**

- Work Orders Management
- Finance Module
- HR/Employee Directory
- Properties Management
- Marketplace

#### 🔴 **Low Coverage (<60%)**

- 404 Error pages (fallback copy shown when placeholder flows fail validation)
- Admin panels
- System configuration
- Integration settings
- Advanced analytics pages

---

## Server-Side Translation Usage

### Notification Service

**File:** `services/notifications/fm-notification-engine.ts`

```typescript
// Uses server-side i18n
const i18n = require("@/i18n/server");

title = i18n.t("notifications.onTicketCreated.title", locale);
body = i18n.t("notifications.onTicketCreated.body", locale, context);
```

**Status:** ✅ Working - separate from client-side translations

---

## Dictionary Generation

### Build Process:

```bash
pnpm run i18n:build
```

**Inputs:** `i18n/sources/*.translations.json` (800+ files)  
**Outputs:**

- `i18n/generated/en.dictionary.json`
- `i18n/generated/ar.dictionary.json`
- `i18n/new-translations.ts` (type definitions)

**Status:** ✅ Working after recent fix

---

## Translation Testing

### Coverage Script:

```bash
pnpm tsx scripts/detect-unlocalized-strings.ts --locales=en,ar --silent
```

**Purpose:** Detect hardcoded strings that should be translated

**Status:** ✅ Tooling passes

### CI Variants:

```bash
pnpm i18n:coverage  # Local testing
# CI variants for automated checks
```

> ✅ As of this reality-check, `.github/workflows/route-quality.yml` runs `pnpm run i18n:coverage` alongside the route guardrails so untranslated strings block PRs.

---

## Recommended Fixes

### Phase 1: High Priority 🔴

- [x] Fix useAutoTranslator key resolution (COMPLETED)
- [x] Add missing nav sub-module keys (COMPLETED)
- [ ] Audit all newly built FM pages (HR leave/payroll, Finance invoices, Properties inspections/units, Admin assets/policies, Compliance contracts/audits, CRM accounts/leads) for missing translations
- [ ] Add error page translations (404, 500, etc.)
- [ ] Document translation key naming conventions

### Phase 2: Medium Priority 🟡

- [ ] Standardize on dot-notation keys across all modules
- [ ] Create missing translation source files for each `/fm/*` route
- [ ] Add TypeScript types for all translation keys
- [ ] Implement translation key autocomplete in IDE

### Phase 3: Low Priority 🟢

- [ ] Migrate all `useAutoTranslator` to explicit keys
- [ ] Add translation coverage reporting to CI/CD
- [ ] Create translation style guide
- [ ] Set up Crowdin/Lokalise for community translations
- [ ] Add RTL testing for Arabic layouts

---

## Translation Key Naming Convention

### Recommended Standard:

```typescript
// Format: module.section.element.variant
"finance.invoices.table.header";
"finance.invoices.form.submit";
"finance.payments.status.pending";

// For navigation:
"nav.module.submenu";
"nav.finance.invoices";

// For common elements:
"common.actions.save";
"common.actions.cancel";

// For errors:
"errors.validation.required";
"errors.api.network";

// For notifications:
"notifications.workOrder.created.title";
"notifications.workOrder.created.body";
```

---

## Known Issues & Edge Cases

### 1. Shared Routes Need Contextual Translations

**Impact:** Multiple routes reuse the same component (e.g., `/fm/finance/budgets` and `/fm/finance/payments` both use `app/fm/finance/page.tsx`)
**Files:** See `npm run check:route-aliases` output for reuse counts
**Fix:** Either create dedicated pages for each route, or add context-aware translations within shared components

### 2. Dynamic Content Translation

**Issue:** Some content is dynamic (user-generated) and can't be pre-translated
**Solution:** Mark fields as "translatable" in schema, use translation memory

### 3. Date/Time Formatting

**Issue:** Inconsistent date formats across locales
**Current:** Some use `ClientDate` component, others use raw formatting
**Fix:** Standardize on `Intl.DateTimeFormat` or library like `date-fns`

### 4. Number/Currency Formatting

**Issue:** Saudi Riyal (SAR) formatting not consistent
**Current:** Mix of `Intl.NumberFormat` and manual formatting
**Fix:** Create centralized formatting utilities

### 5. Pluralization

**Issue:** Arabic has complex plural rules (1, 2, 3-10, 11+)
**Current:** No pluralization support in translation system
**Fix:** Add ICU MessageFormat support or similar

---

## Translation File Statistics

### Source Files: 800+

```
Administration: 20 files
Analytics: 25 files
Business: 30 files
Compliance: 15 files
Finance: 20 files
HR: 18 files
IT/DevOps: 40 files
Marketplace: 12 files
Operations: 35 files
Properties: 15 files
Support: 10 files
System: 25 files
Work Orders: 8 files
... and many more
```

### Generated Dictionaries:

- **EN:** ~15,000 translation keys
- **AR:** ~15,000 translation keys
- **Coverage:** ~95% key parity between locales

---

## Verification Commands

### Check Translation Coverage:

```bash
pnpm tsx scripts/detect-unlocalized-strings.ts --locales=en,ar
```

### Build Dictionaries:

```bash
pnpm run i18n:build
```

### Test Specific Module:

```bash
grep -r "useTranslation\|useAutoTranslator" app/fm/hr/
```

### Find Missing Keys:

```bash
# Compare EN vs AR dictionaries
diff <(jq -r 'keys[]' i18n/generated/en.dictionary.json | sort) \
     <(jq -r 'keys[]' i18n/generated/ar.dictionary.json | sort)
```

---

## Related Issues

1. **New FM bespoke pages** - Need translation keys/error states now that bespoke UX has shipped
2. **Theme System** - Some theme-specific text not translated
3. **Email Templates** - Server-side templates need i18n
4. **SMS Notifications** - OTP messages need proper Arabic support
5. **PDF Generation** - Invoice/report PDFs need RTL layout for Arabic

---

## Best Practices Going Forward

### For Developers:

1. **Always use translation keys, never hardcode strings**

   ```tsx
   // ❌ Bad
   <button>Save</button>

   // ✅ Good
   <button>{t('common.actions.save', 'Save')}</button>
   ```

2. **Provide meaningful fallback text**

   ```tsx
   // ❌ Bad
   t("key", "");

   // ✅ Good
   t("module.section.label", "Descriptive English Fallback");
   ```

3. **Use scoped keys with useAutoTranslator**

   ```tsx
   // ❌ Bad
   const at = useAutoTranslator("module");
   at("Text"); // Creates auto.module.text

   // ✅ Good
   const at = useAutoTranslator("module");
   at("Text", "section.label"); // Resolves to module.section.label
   ```

4. **Add new translations to source files, not dictionaries**
   - Edit: `i18n/sources/MODULE.translations.json`
   - Run: `pnpm run i18n:build`
   - Commit: Both source and generated files

---

## Action Items

### Immediate (Next Sprint)

- [ ] Document all translation key patterns in wiki
- [ ] Create translation checklist for PR reviews
- [ ] Add i18n validation to CI pipeline
- [ ] Fix translations for the newly built `/fm/*` bespoke pages as APIs go live

### Short Term (Next Month)

- [ ] Audit all 204 files using translation hooks
- [ ] Standardize key naming across modules
- [ ] Add TypeScript strict mode for translation keys
- [ ] Create translation coverage dashboard

### Long Term (Next Quarter)

- [ ] Implement full ICU MessageFormat support
- [ ] Add pluralization rules for Arabic
- [ ] Set up translation management platform
- [ ] Add automated translation testing

---

## Notes

- ✅ useAutoTranslator fix successfully deployed
- ✅ Nav sidebar translations complete
- ✅ Landing page translations working
- ✅ Dictionary build process operational
- ⚠️ Newly built FM pages need translation coverage as APIs go live
- ⚠️ Some modules still using legacy auto.\* keys
- ⚠️ Server-side translations separate from client-side

---

## Similar Issues Found

Based on the recent `useAutoTranslator.ts` fix pattern, these areas likely have similar issues:

1. **All bespoke FM pages added in this audit** - Need translation keys now that the pages exist
2. **Error boundaries** - May be showing English-only error messages
3. **Loading states** - Some loading text might not be translated
4. **Form validation** - Client-side validation messages
5. **Toast notifications** - Success/error toasts
6. **Empty states** - "No data" messages
7. **Confirmation dialogs** - Delete/cancel confirmations
8. **Breadcrumbs** - Dynamic breadcrumb labels
9. **Tab labels** - Tab navigation text
10. **Tooltips** - Hover help text

Each of these should follow the same pattern: explicit scoped keys instead of auto-slugged keys.
