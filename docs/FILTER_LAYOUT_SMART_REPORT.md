# Filter Layout Standardization - SMART Report

**Agent Token:** [AGENT-0013]  
**Date:** 2026-01-06  
**Branch:** fix/s3-503-service-unavailable  

---

## SMART Framework

### Specific
Standardize ALL pages across the codebase to use a consistent horizontal filter layout:
- **Row 1:** Search input (full-width)
- **Row 2:** Filter dropdowns (horizontal, responsive wrap)
- **Standard Component:** `SimpleFilterBar` or `CompactFilterBar` from `@/components/ui/compact-filter-bar`

### Measurable
| Metric | Baseline | Target | Current |
|--------|----------|--------|---------|
| Pages with filters | ~50 | 50 | TBD |
| Using standard layout | 2 | 50 | TBD |
| Compliance % | 4% | 100% | TBD |
| TypeScript errors | 0 | 0 | TBD |
| Lint errors | 0 | 0 | TBD |

### Achievable
- Standard components already exist (`SimpleFilterBar`, `CompactFilterBar`)
- Pattern already applied successfully to superadmin pages (22 pages)
- All pages follow similar React patterns with useState for filters

### Relevant
- User requested consistent UI across entire codebase
- Improves maintainability (single source for filter patterns)
- Reduces code duplication
- Better UX (predictable filter location and behavior)

### Time-bound
- Session target: Complete all fixes within current agent session
- Verification: 100% compliance before session end

---

## Page Audit Results

### Section 1: Superadmin (22 pages)
**Status:** ✅ FIXED (Previous session [AGENT-0012])  
**Verification:** Pending

| Page | Status | Notes |
|------|--------|-------|
| audit | ✅ | Search + filter row |
| billing | ✅ | Search + filter row |
| catalog | ✅ | Search + filter row |
| customer-requests | ✅ | Search + filter row |
| emails | ✅ | Search + filter row |
| features | ✅ | Search + filter row |
| footer-content | ✅ | Search + filter row |
| issues | ✅ | Search + filter row |
| jobs | ✅ | Search + filter row |
| notifications | ✅ | Search + filter row |
| permissions | ✅ | Uses SimpleFilterBar |
| quotas | ✅ | Search + filter row |
| reports | ✅ | Search + filter row |
| scheduled-tasks | ✅ | Search + filter row |
| subscriptions | ✅ | Search + filter row |
| support | ✅ | Search + filter row |
| tenants | ✅ | Search + filter row |
| translations | ✅ | Search + filter row |
| user-logs | ✅ | Search + filter row |
| users | ✅ | Reference implementation |
| vendors | ✅ | Search + filter row |
| webhooks | ✅ | Search + filter row |

### Section 2: FM Module (17 pages)
**Status:** 🔴 PENDING

| Page | Has Filters | Current Layout | Action Needed |
|------|-------------|----------------|---------------|
| (fm)/admin/audit-logs | ✅ | Custom inline | Convert to standard |
| (fm)/admin/issues | ✅ | Custom inline | Convert to standard |
| (fm)/admin/onboarding | ✅ | SimpleFilterBar | ✅ Already compliant |
| (fm)/admin/route-metrics | ✅ | Custom inline | Convert to standard |
| (fm)/fm/page | ✅ | Custom inline | Convert to standard |
| (fm)/fm/assets | ✅ | Custom inline | Convert to standard |
| (fm)/fm/compliance/audits | ✅ | Custom inline | Convert to standard |
| (fm)/fm/compliance/policies | ✅ | Custom inline | Convert to standard |
| (fm)/fm/finance/invoices | ✅ | Custom inline | Convert to standard |
| (fm)/fm/finance/reports | ✅ | Custom inline | Convert to standard |
| (fm)/fm/hr/directory | ✅ | Custom inline | Convert to standard |
| (fm)/fm/hr/recruitment | ✅ | Custom inline | Convert to standard |
| (fm)/fm/orders | ✅ | Custom inline | Convert to standard |
| (fm)/fm/projects | ✅ | Custom inline | Convert to standard |
| (fm)/fm/rfqs | ✅ | Custom inline | Convert to standard |
| (fm)/fm/tenants | ✅ | Custom inline | Convert to standard |
| (fm)/hr/attendance | ✅ | Custom inline | Convert to standard |
| (fm)/hr/leave | ✅ | Custom inline | Convert to standard |
| (fm)/fm/properties/leases | ✅ | Custom inline | Convert to standard |

### Section 3: App Module (8 pages)
**Status:** 🔴 PENDING

| Page | Has Filters | Current Layout | Action Needed |
|------|-------------|----------------|---------------|
| (app)/notifications | ✅ | Custom inline | Convert to standard |
| (app)/aqar/filters | ✅ | Custom full-page | Keep (specialty page) |
| (app)/aqar/search | ✅ | Custom inline | Convert to standard |
| (app)/marketplace/seller-central/advertising | ✅ | Custom inline | Convert to standard |
| (app)/marketplace/seller-central/analytics | ✅ | TBD | Verify |
| (app)/marketplace/seller-central/reviews | ✅ | TBD | Verify |
| (app)/souq/catalog | ✅ | Custom inline | Convert to standard |
| (app)/souq/search | ✅ | TBD | Verify |

### Section 4: Dashboard Module (2 pages)
**Status:** 🔴 PENDING

| Page | Has Filters | Current Layout | Action Needed |
|------|-------------|----------------|---------------|
| (dashboard)/issues | ✅ | Custom inline | Convert to standard |
| (dashboard)/onboarding | ✅ | TBD | Verify |

---

## Progress Tracking

| Phase | Description | Status | Pages Fixed |
|-------|-------------|--------|-------------|
| 1 | Audit complete | ✅ | 0 |
| 2 | Superadmin verified | 🔄 | 22 |
| 3 | FM module fixed | ⏳ | 0/17 |
| 4 | App module fixed | ⏳ | 0/8 |
| 5 | Dashboard fixed | ⏳ | 0/2 |
| 6 | TypeCheck pass | ⏳ | - |
| 7 | Lint pass | ⏳ | - |
| 8 | Push to remote | ⏳ | - |

---

## Session Log

- **2026-01-06 Session Start:** Comprehensive audit initiated
- **Agent Token:** [AGENT-0013]
- **Baseline:** 2 pages using SimpleFilterBar, ~48 pages with custom filter layouts

---

*This report will be updated as fixes are applied.*
