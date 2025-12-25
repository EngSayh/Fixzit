# System-Wide Issues Audit Summary

**Date:** November 18, 2025  
**Trigger:** Investigation of HR employees 404 error and useAutoTranslator.ts fix  
**Scope:** Complete system audit for similar architectural issues

---

## Overview

After fixing the `/fm/hr/employees` 404 error and the `useAutoTranslator.ts` scoped key resolution, a comprehensive system audit revealed **two major categories of similar issues** affecting the entire application.

---

## Issue Category 1: Route Alias Architecture ✅

### **Report:** `BROKEN_ROUTES_AUDIT.md`

**Summary:** 23 `/fm/*` alias files successfully resolve to 23 real targets. The alias layer now has zero duplication; ongoing work is focused on UX polish, data wiring, and translations inside each module.

### Reality Check:

- ✅ **All 23 aliases resolve:** `npm run check:route-aliases` + `_artifacts/route-aliases.json` confirm 0 missing targets and 0 duplication
- ⚠️ **Focus shift:** Newly built FM pages still rely on placeholder data + English copy until APIs/translation keys are wired
- 🎯 **Real issue:** Hook the new pages to live data, add scoped translations, and track adoption

### Status:

- ✅ **Verified:** All aliases resolve + CI guardrail (routes + translations) enforces it
- ⚠️ **Module Work Needed:** Finance, HR, Properties, Administration, Compliance, and CRM bespoke pages now need API + translation integration

### Immediate Priorities:

1. Wire HR leave/payroll dashboards to `/api/hr/*` services and finalize Arabic copy.
2. Connect Finance/Invoices flows to `/api/finance/invoices` + accounting exports.
3. Attach Properties inspections/units, Administration assets/policies, Compliance contracts/audits, and CRM accounts/leads to their respective services.

---

## Issue Category 2: Translation System Issues 🟡

### **Report:** `I18N_TRANSLATION_AUDIT.md`

**Summary:** Missing translations, inconsistent key patterns, and auto-translation fallback issues affecting 204+ files.

### Impact Breakdown:

- ✅ **FIXED:** Auto-translation key resolution (`useAutoTranslator.ts`)
- ✅ **FIXED:** Missing nav sidebar sub-module translations
- ⚠️ **ACTIVE:** Newly built FM pages (leave, payroll, invoices, properties, admin, compliance, CRM) still require scoped translations + dictionary entries
- ⚠️ **ACTIVE:** 204 files using translation hooks need audit

### Root Cause - Before Fix:

```typescript
// Everything was slugged under auto.*
translationKey = `auto.${scope}.${slugify(id)}`;
// Result: auto.landing.hero-title-line1 ❌
```

### Root Cause - After Fix:

```typescript
// Now resolves scoped keys properly
if (id.startsWith(`${scope}.`) || id.startsWith("auto.")) {
  translationKey = id;
}
// Result: landing.hero.title.line1 ✅
```

### Translation Coverage:

- ✅ **High (90%+):** Navigation, dashboard, landing pages
- 🟡 **Medium (60-90%):** Work orders, finance, HR, properties
- 🔴 **Low (<60%):** 404 pages, admin, system config

---

## Pattern Recognition: The Common Thread

Both issue categories share the same architectural problem:

### **Dual-Path Architecture Pattern**

#### Routes:

```
Frontend: /fm/hr/employees (what users see)
Backend: /app/hr/employees/page.tsx (where code lives)
Alias: export { default } from '@/app/hr/employees/page';
Reality: Target exists but is shared by several menu entries, so users see the same placeholder UX
```

#### Translations:

```
Frontend: "Employee Directory" (what users see)
Backend: nav.hr.directory (translation key)
Lookup: useAutoTranslator('nav') → nav.hr.directory
Problem: Key wasn't in dictionary
```

### **The Symptom:**

Both create a **layer of indirection** that hides missing bespoke implementations:

- Routes: Alias → Existing target file → Same overview/place-holder view for multiple menu entries
- i18n: Key → Missing dictionary entry → Fallback English

---

## Issue Intersection: Bespoke Pages + Translation Coverage

**Every `/fm/*` page now renders its own implementation. The remaining work is translating and wiring those screens to real services.**

| Module         | Pages built                                              | Translation / API status                                 |
| -------------- | -------------------------------------------------------- | -------------------------------------------------------- |
| HR             | Leave, approvals, payroll dashboards, payroll run wizard | Needs `/api/hr/*` integration + Arabic copy              |
| Finance        | Invoice creation (finance + ops contexts)                | Needs `/api/finance/invoices` + approval workflow wiring |
| Properties     | Inspections dashboards/forms, unit manager/onboarding    | Needs `/api/properties/*` integrations + translations    |
| Administration | Asset + policy creation workflows                        | Needs admin service wiring + bilingual copy              |
| Compliance     | Contracts + audit plan creators                          | Needs compliance service + legal glossary                |
| CRM            | Account + lead creation                                  | Needs CRM service + localization                         |

**Impact:** Each page now requires:

1. Hooking to the corresponding API/service layer
2. Adding translation keys + rebuilding dictionaries
3. Testing in EN/AR (and verifying `pnpm i18n:coverage` stays green)

---

## Recommended Fix Strategy

## Recommended Fix Strategy

### Phase 1: Wire critical FM dashboards (Week 1) 🔴

- HR leave + payroll: connect to `/api/hr/leaves`, `/api/hr/payroll`, and persist translations in `i18n/sources/hr.translations.json`.
- Finance invoices: link both FM invoice flows to `/api/finance/invoices/new`, accounting exports, and nav translations.

### Phase 2: Operations focus (Week 2) 🟡

- Properties inspections + units: hydrate with `/api/properties/*` data, add inspector/vendor selectors, and ensure Arabic copy.
- Administration assets + policies: wire to admin services and produce bilingual templates.

### Phase 3: Compliance/CRM polish (Week 3) 🟢

- Compliance contracts + audits and CRM accounts + leads: connect to their services, add approval routing, and expand translations.

---

## Validation Strategy

### For Each Newly Built Page / Experience:

#### 1. Route Testing

```bash
# Ensure alias target resolves
npm run check:route-aliases

# Test route loads
curl http://localhost:3000/fm/MODULE/ROUTE

# Expected: 200 OK with bespoke UX (not the shared overview)
```

#### 2. Translation Testing

```bash
# Check translation keys exist
pnpm tsx scripts/detect-unlocalized-strings.ts --locales=en,ar

# Rebuild dictionaries
pnpm run i18n:build

# Verify key coverage
grep "module.section" i18n/generated/en.dictionary.json
```

#### 3. E2E Testing

```bash
# Test as super admin
# Navigate to /fm/MODULE/ROUTE
# Verify page loads
# Toggle EN/AR language
# Verify translations appear
```

---

## Automation Opportunities

### 1. Route Alias Validation (CI)

- ✅ Implemented via `.github/workflows/route-quality.yml` (runs `pnpm run check:route-aliases` and `pnpm run verify:routes`)

### 2. Translation Coverage (CI)

- ⏳ Add `pnpm i18n:coverage` (or `pnpm tsx scripts/detect-unlocalized-strings.ts --locales=en,ar --fail-threshold=0.2`) to the same workflow for parity with routing guardrails

### 3. Pre-commit Hooks

- Optional: add `check-route-aliases` and `i18n:coverage` to Husky for fast feedback while authoring bespoke pages

---

## Progress Tracking

### Current Status:

#### Alias Integrity:

- ✅ Valid aliases: 23/23 resolve to real targets (guarded by script + CI)
- ✅ Dedicated UX delivered: 23/23 (no shared targets remain)

#### Translations:

- ✅ Nav sidebar + landing pages: Complete
- ⚠️ Page content: Needs scoped copy for the newly built FM pages (leave, payroll, invoices, inspections, units, admin, compliance, CRM)

### Target Status (End of Phase 3):

#### Routes / UX:

- ✅ Dedicated UX: 39/39 menu entries have bespoke experiences while keeping alias coverage

#### Translations:

- ✅ All modules + routes include localized copy for those bespoke pages

---

## Cost/Benefit Analysis

### Current State:

- **User Impact:** Low – All `/fm/*` routes render bespoke experiences, albeit with placeholder data
- **Translation Quality:** Medium – Landing/nav solid, new FM pages still rely on English fallbacks
- **Maintainability:** High – Route + translation guardrails run in CI
- **Developer Experience:** Good – Tooling/dashboard exist; focus now on data wiring + translation authoring

### Post-Fix State:

- **User Impact:** None – Every menu entry has a bespoke experience
- **Translation Quality:** High – Scoped EN/AR copy for the new flows
- **Maintainability:** High – Route guardrail + translation coverage in CI + dashboard history
- **Developer Experience:** Great – Consistent patterns, automated checks, documented steps

### Effort Estimate:

- **API wiring + state management:** 3-4 hours per module × 6 modules ≈ 18-24 hours
- **Translation keys & QA:** 1-2 hours per page × 12 new FM pages = 12-24 hours
- **Testing:** ~30 min per page × 12 pages = 6 hours
- **Telemetry/dashboard updates:** 2 hours (optional historical tracking)

**Total:** ~38-56 hours (~1 work-week for a single developer)

### ROI:

- **Immediate:** Deliver bespoke UX for top 10 duplicated routes
- **Short-term:** Prevent regressions via CI guardrails
- **Long-term:** Improved user experience (bilingual)
- **Strategic:** Professional, production-ready application

---

## Key Takeaways

1. **Pattern Recognition:**
   - The `/fm/*` alias layer still mirrors `/app/<module>`; UX + i18n only feel complete when bespoke targets + scoped keys exist.

2. **Systematic Issues:**
   - Alias duplication is solved; the remaining systematic work is ensuring every FM page has API coverage + translations so they feel production-ready.

3. **Testing Gap:**
   - Route guardrail is solved (script + CI). The remaining gap is enforcing translation coverage in CI so placeholder copy stops slipping through.

4. **Quick Wins:**
   - Alias validation, nav translations, and the dashboard already demonstrate the pattern. The remaining work is mechanical page building + localization.

5. **Long-term Solution:**
   - Keep CI guardrails required, add translation coverage, document the alias pattern for new devs, and later consider consolidating `/fm/*` directories once bespoke UX ships.

---

## Related Documentation

- **Route Issues:** `BROKEN_ROUTES_AUDIT.md`
- **Translation Issues:** `I18N_TRANSLATION_AUDIT.md`
- **CI Plan:** `docs/ci-cd/CI_INTEGRATION_PLAN.md`
- **Navigation Config:** `nav/registry.ts`
- **Auto-Translator Fix:** `i18n/useAutoTranslator.ts`
- **Verification Scripts:**
  - `scripts/check-route-aliases.ts`
  - `scripts/detect-unlocalized-strings.ts`

---

## Next Steps

1. **Review both audit reports** (`BROKEN_ROUTES_AUDIT.md` + `I18N_TRANSLATION_AUDIT.md`)
2. **Prioritize fixes** based on business impact
3. **Assign tasks** to development team
4. **Keep route guardrail required + add translation coverage to CI**
5. **Begin Phase 1 bespoke UX builds** (HR leave/payroll + Finance invoices/new)

---

## Contact

For questions about this audit:

- Route issues: See `BROKEN_ROUTES_AUDIT.md`
- Translation issues: See `I18N_TRANSLATION_AUDIT.md`
- Implementation guidance: Check related documentation
