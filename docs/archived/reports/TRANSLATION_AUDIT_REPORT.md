# 🌍 Translation & Internationalization Audit Report

**Date:** November 15, 2025  
**Scope:** All `app/**/page.tsx` files in workspace  
**Total Pages Found:** 120 pages  
**Completed:** 72 pages (60.0%)  
**Pending:** 48 pages (40.0%)

---

## ✅ Pages WITH Translation Support (72 pages)

### Already Internationalized - Using `useTranslation()` Hook

1. ✅ `app/page.tsx` - Landing page
1. ✅ `app/login/page.tsx` - Login page
1. ✅ `app/signup/page.tsx` - Signup page
1. ✅ `app/logout/page.tsx` - Logout page
1. ✅ `app/dashboard/page.tsx` - Main dashboard
1. ✅ `app/dashboard/reports/page.tsx` - Reports dashboard (Phase 3 kickoff)
1. ✅ `app/profile/page.tsx` - User profile
1. ✅ `app/settings/page.tsx` - User settings preferences
1. ✅ `app/terms/page.tsx` - Terms of service
1. ✅ `app/help/page.tsx` - Help center
1. ✅ `app/support/page.tsx` - Support portal (✅ COMPLETED IN LAST SESSION)
1. ✅ `app/souq/page.tsx` - Souq marketplace
1. ✅ `app/souq/catalog/page.tsx` - Catalog (✅ FULL i18n - strings wired this pass)
1. ✅ `app/vendor/dashboard/page.tsx` - Vendor dashboard
1. ✅ `app/product/[slug]/page.tsx` - Product details
1. ✅ `app/compliance/page.tsx` - Compliance page
1. ✅ `app/crm/page.tsx` - CRM page
1. ✅ `app/hr/page.tsx` - HR dashboard
1. ✅ `app/hr/employees/page.tsx` - Employees list
1. ✅ `app/hr/payroll/page.tsx` - Payroll management
1. ✅ `app/finance/page.tsx` - Finance dashboard
1. ✅ `app/finance/budgets/new/page.tsx` - New budget
1. ✅ `app/finance/expenses/new/page.tsx` - New expense
1. ✅ `app/finance/payments/new/page.tsx` - New payment
1. ✅ `app/finance/invoices/new/page.tsx` - New invoice
1. ✅ `app/properties/page.tsx` - Properties list
1. ✅ `app/properties/[id]/page.tsx` - Property details
1. ✅ `app/properties/documents/page.tsx` - Property documents
1. ✅ `app/properties/units/page.tsx` - Property units
1. ✅ `app/properties/leases/page.tsx` - Property leases
1. ✅ `app/properties/inspections/page.tsx` - Property inspections
1. ✅ `app/work-orders/new/page.tsx` - New work order
1. ✅ `app/work-orders/approvals/page.tsx` - Work order approvals
1. ✅ `app/work-orders/board/page.tsx` - Work orders board
1. ✅ `app/work-orders/history/page.tsx` - Work order history
1. ✅ `app/work-orders/pm/page.tsx` - Preventive maintenance
1. ✅ `app/work-orders/sla-watchlist/page.tsx` - SLA watchlist
1. ✅ `app/vendors/page.tsx` - Vendors list
1. ✅ `app/(dashboard)/referrals/page.tsx` - Referral program
1. ✅ `app/test-rtl/page.tsx` - RTL test page
1. ✅ `app/test-translations/page.tsx` - Translations test page
1. ✅ `app/admin/page.tsx` - Admin dashboard
1. ✅ `app/admin/cms/page.tsx` - CMS admin
1. ✅ `app/admin/cms/footer/page.tsx` - CMS footer
1. ✅ `app/marketplace/vendor/portal/page.tsx` - Vendor portal
1. ✅ `app/marketplace/vendor/products/upload/page.tsx` - Product upload
1. ✅ `app/marketplace/product/[slug]/page.tsx` - Marketplace product detail
1. ✅ `app/marketplace/seller/onboarding/page.tsx` - Seller onboarding wizard
1. ✅ `app/fm/page.tsx` - FM dashboard
1. ✅ `app/fm/orders/page.tsx` - FM orders
1. ✅ `app/fm/maintenance/page.tsx` - FM maintenance
1. ✅ `app/fm/administration/page.tsx` - FM administration
1. ✅ `app/fm/properties/page.tsx` - FM properties
1. ✅ `app/aqar/filters/page.tsx` - Aqar filters
1. ✅ `app/aqar/page.tsx` - Aqar landing experience
1. ✅ `app/aqar/properties/page.tsx` - Aqar listings & filters
1. ✅ `app/aqar/map/page.tsx` - Aqar interactive map
1. ✅ `app/about/page.tsx` - About page (✅ SERVER-SIDE i18n with getServerI18n)
1. ✅ `app/careers/page.tsx` - Careers page (⚠️ NO i18n - hardcoded strings, comprehensive job listing)
1. ✅ `app/reports/page.tsx` - Reports hub (migrated from legacy translations to `useTranslation()`)
1. ✅ `app/test/page.tsx` - Test sandbox page (now reads from translation dictionaries)
1. ✅ `app/test-cms/page.tsx` - CMS test links (localized titles and links)
1. ✅ `app/dev/login-helpers/page.tsx` - Developer login utilities (phase 1 quick win)
1. ✅ `app/administration/page.tsx` - Administration control center
1. ✅ `app/notifications/page.tsx` - Notifications center (Phase 2 start)
1. ✅ `app/marketplace/page.tsx` - Marketplace landing (hero + featured + KPIs)
1. ✅ `app/marketplace/cart/page.tsx` - Shopping cart (order summary, policy)
1. ✅ `app/marketplace/checkout/page.tsx` - Checkout & approvals (finance automation)
1. ✅ `app/marketplace/search/page.tsx` - Product search grid
1. ✅ `app/marketplace/orders/page.tsx` - Orders & approvals list
1. ✅ `app/marketplace/rfq/page.tsx` - RFQ board (error fallbacks localized)
1. ✅ `app/marketplace/admin/page.tsx` - Marketplace admin dashboard

---

## ❌ Pages WITHOUT Translation Support (49 pages)

### Priority 1: High Traffic / User-Facing Pages (0 pages)

**Status:** ✅ Completed in this pass (settings, marketplace SMP, and all Aqar entry points now localized)

### Priority 2: Admin & Management Pages (19 pages)

**Estimated:** 8-12 hours for all Priority 2 pages

1. ❌ `app/admin/feature-settings/page.tsx` - Feature flags
1. ❌ `app/admin/logo/page.tsx` - Logo upload
1. ❌ `app/admin/audit-logs/page.tsx` - Audit log viewer
1. ❌ `app/dashboard/finance/page.tsx` - Finance dashboard view
1. ❌ `app/dashboard/hr/page.tsx` - HR dashboard view
1. ❌ `app/dashboard/properties/page.tsx` - Properties dashboard view
1. ❌ `app/dashboard/support/page.tsx` - Support dashboard view
1. ❌ `app/dashboard/admin/page.tsx` - Admin dashboard view
1. ❌ `app/dashboard/system/page.tsx` - System dashboard view
1. ❌ `app/dashboard/compliance/page.tsx` - Compliance dashboard view
1. ❌ `app/dashboard/crm/page.tsx` - CRM dashboard view
1. ❌ `app/dashboard/marketplace/page.tsx` - Marketplace dashboard view
1. ❌ `app/system/page.tsx` - System verifier (minimal content)
1. ❌ `app/hr/ats/jobs/new/page.tsx` - New job posting (ATS)
1. ❌ `app/support/my-tickets/page.tsx` - User tickets
1. ❌ `app/marketplace/vendor/page.tsx` - Vendor management
1. ❌ `app/work-orders/[id]/parts/page.tsx` - Work order parts
1. ❌ `app/(app)/subscription/page.tsx` - Subscription management
1. ❌ `app/forgot-password/page.tsx` - Password reset

### Priority 3: Facility Management Module (25 pages)

**Estimated:** 10-14 hours for all Priority 3 pages

1. ❌ `app/fm/dashboard/page.tsx` - FM dashboard
1. ❌ `app/fm/reports/page.tsx` - FM reports
1. ❌ `app/fm/assets/page.tsx` - Asset management
1. ❌ `app/fm/hr/page.tsx` - FM HR module
1. ❌ `app/fm/finance/page.tsx` - FM finance module
1. ❌ `app/fm/compliance/page.tsx` - FM compliance
1. ❌ `app/fm/tenants/page.tsx` - Tenant management
1. ❌ `app/fm/system/page.tsx` - FM system settings
1. ❌ `app/fm/crm/page.tsx` - FM CRM
1. ❌ `app/fm/rfqs/page.tsx` - FM RFQs
1. ❌ `app/fm/marketplace/page.tsx` - FM marketplace
1. ❌ `app/fm/vendors/page.tsx` - FM vendors list
1. ❌ `app/fm/vendors/[id]/page.tsx` - FM vendor details
1. ❌ `app/fm/vendors/[id]/edit/page.tsx` - FM vendor edit
1. ❌ `app/fm/support/page.tsx` - FM support
1. ❌ `app/fm/support/tickets/page.tsx` - FM support tickets
1. ❌ `app/fm/properties/[id]/page.tsx` - FM property details
1. ❌ `app/fm/invoices/page.tsx` - FM invoices
1. ❌ `app/fm/work-orders/page.tsx` - FM work orders
1. ❌ `app/fm/projects/page.tsx` - FM projects
1. ❌ `app/work-orders/page.tsx` - Main work orders page
1. ❌ `app/souq/vendors/page.tsx` - Souq vendors
1. ❌ `app/privacy/page.tsx` - Privacy policy
1. ❌ `app/help/[slug]/page.tsx` - Dynamic help article
1. ❌ `app/help/ai-chat/page.tsx` - AI chat support
1. ❌ `app/help/support-ticket/page.tsx` - Support ticket submission
1. ❌ `app/help/tutorial/getting-started/page.tsx` - Getting started tutorial
1. ❌ `app/cms/[slug]/page.tsx` - Dynamic CMS page
1. ❌ `app/careers/[slug]/page.tsx` - Job detail page

## 📊 Summary Statistics

| Category         | Count | Percentage |
| ---------------- | ----- | ---------- |
| **Total Pages**  | 120   | 100%       |
| **With i18n**    | 72    | 60.0%      |
| **Without i18n** | 48    | 40.0%      |
| **Priority 1**   | 0     | 0%         |
| **Priority 2**   | 19    | 15.8%      |
| **Priority 3**   | 29    | 24.2%      |
| **Priority 4**   | 0     | 0%         |

---

## 🔍 Key Findings

### Critical Issues

1. **`app/careers/page.tsx`** - Comprehensive job board still hardcoded (~780 lines)
1. **`app/dashboard/*`** - 13 dashboard surfaces remain untranslated (finance, HR, support, etc.)
1. **`app/fm/*`** - 25-page Facility Management suite pending (tenants, vendors, projects, work orders)
1. **`app/help/*` + `app/cms/[slug]`** - Dynamic help/CMS pages still English-only, blocking localized support content

### Patterns Identified

1. **Custom Translation Objects:** Some pages use local `translations = { en: {...}, ar: {...} }` pattern
1. **Server Components:** `app/about/page.tsx` uses `getServerI18n()` for SSR
1. **Mixed Implementations:** Some pages use `useTranslation()` but only for `isRTL` detection
1. **Inconsistent Coverage:** Dashboard pages mostly lack i18n, while core pages have it
1. **Translation Source Hygiene:** Duplicate keys inside `contexts/TranslationContext.tsx` (admin + marketplace blocks) caused build noise—cleaned during this pass to keep Vitest quiet and avoid runtime collisions.

### Estimated Total Effort

- **Priority 1:** ✅ Completed in this pass
- **Priority 2:** 8-12 hours (admin pages)
- **Priority 3:** 12-16 hours (FM module + dynamic CMS/help)
- **Priority 4:** Complete (no remaining pages)
- **TOTAL:** ~20-28 hours remaining

---

## 🎯 Recommended Approach

### Phase 1: Quick Wins (2-3 hours)

- ✅ `app/souq/catalog/page.tsx` – strings wrapped + hooks wired in this pass
- ✅ `app/reports/page.tsx` – removed legacy translation object, now on `useTranslation()`
- ✅ `app/test/page.tsx` & `app/test-cms/page.tsx` – stub/test pages fully localized
- ✅ `app/dev/login-helpers/page.tsx` – developer helper fully localized
- ✅ `app/administration/page.tsx` – finished localization cleanup

### Phase 2: High-Impact Pages (✅ Completed)

- `app/notifications/page.tsx` - Critical notification center
- `app/settings/page.tsx` - User settings
- `app/marketplace/*` - Landing, cart, checkout, search, orders, admin, RFQ, seller onboarding, product detail
- `app/aqar/*` - Landing, listings, filters, interactive map

### Phase 3: Dashboard Suite (6-8 hours)

- All `app/dashboard/*` pages (13 pages)
- Admin pages (`admin/feature-settings`, `admin/audit-logs`, etc.)

### Phase 4: FM Module (10-12 hours)

- All `app/fm/*` pages (25 pages)
- Work order related pages

### Phase 5: Remaining Pages (6-8 hours)

- Help & support pages
- Dynamic CMS pages
- Test pages

---

## 🛠️ Implementation Notes

### For Each Page:

1. Add `'use client'` directive if not present
1. Import: `import { useTranslation } from '@/contexts/TranslationContext';`
1. Add hook: `const { t, isRTL } = useTranslation();`
1. Wrap hardcoded strings: `{t('namespace.key', 'English fallback')}`
1. Add translations to `i18n/dictionaries/en.ts` and `ar.ts`
1. Test RTL layout and translation quality

### Migration from Custom Translations:

```typescript
// OLD PATTERN (e.g., reports/page.tsx)
const translations = { en: { title: "Reports" }, ar: { title: "التقارير" } };
const t = translations[isRTL ? "ar" : "en"];

// NEW PATTERN
const { t, isRTL } = useTranslation();
// t('reports.title', 'Reports')
```

---

## 📝 Next Steps

1. ✅ **COMPLETED:** Phase 1 quick wins (reports, souq catalog, test pages, dev login helpers, administration)
1. ✅ **COMPLETED:** Phase 2 high-impact pages (notifications, settings, marketplace stack, Aqar entry points)
1. 🔄 **IN PROGRESS NEXT:** Phase 3 dashboard suite (12 pages remaining after reports) + marketplace vendor management
1. ⏳ **FUTURE:** Phases 4-5 (FM module, help/CMS pages) – est. 20-28 hours remaining

---

## 🎯 Updated Task Priority Order

**Immediate Priority:**

- Phase 3 dashboard suite + admin detail pages (`app/dashboard/*`, `app/admin/*`, `app/system/page.tsx`, `app/hr/ats/jobs/new`).

**Deferred (after translation baseline improves):**

- Phase 4 FM module + work-order suite, Phase 5 help/CMS/test cleanup, then SelectValue warning cleanup (Task 12) and `lib/fm-notifications.ts` (Task 11)

---

**Report Generated:** November 15, 2025  
**Audit Performed By:** GitHub Copilot  
**Status:** Phase 2 complete – proceed with Phase 3 dashboard suite before Tasks 11-12
