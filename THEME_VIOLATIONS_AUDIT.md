# Theme Violations Audit - Fixzit Codebase
**Generated:** $(date)
**Total Violations:** 2,498 across 100+ files

## Semantic Token Rules (Fixzit Design System)
- `bg-white` → `bg-card` (cards/panels) or `bg-popover` (overlays)
- `bg-gray-50/100` → `bg-muted`
- `bg-gray-200/300` → `bg-accent` or `bg-muted`
- `border-gray-200/300` → `border-border`
- `text-gray-900` → `text-foreground`
- `text-gray-600/700` → `text-foreground` (primary) or `text-muted-foreground` (secondary)
- `text-gray-400/500` → `text-muted-foreground`
- `rounded-lg` → `rounded-2xl` (16px for cards/modals)
- NO hardcoded colors like `bg-[#0061A8]` - use `bg-brand-500`

## Priority 1: Critical User Flows (Top 20 Files - 863 violations)

### Payment & Finance (218 violations)
1. `app/finance/payments/new/page.tsx` - 75 violations - **CRITICAL** (payment creation)
2. `app/finance/expenses/new/page.tsx` - 58 violations - **CRITICAL** (expense tracking)
3. `app/finance/invoices/new/page.tsx` - 38 violations - **HIGH**
4. `app/finance/budgets/new/page.tsx` - 39 violations - **HIGH**
5. `components/finance/AccountActivityViewer.tsx` - 46 violations - **HIGH**
6. `components/finance/TrialBalanceReport.tsx` - 32 violations - **MEDIUM**

### Real Estate/Aqar (200 violations)
7. `components/aqar/ViewingScheduler.tsx` - 66 violations - **CRITICAL** (booking system)
8. `components/aqar/SearchFilters.tsx` - 52 violations - **HIGH** (search UX)
9. `components/aqar/MortgageCalculator.tsx` - 41 violations - **HIGH**
10. `app/aqar/filters/page.tsx` - 33 violations - **MEDIUM**

### Admin & Auth (204 violations)
11. `app/admin/audit-logs/page.tsx` - 65 violations - **CRITICAL** (security)
12. `app/admin/page.tsx` - 36 violations - **HIGH**
13. `app/profile/page.tsx` - 61 violations - **CRITICAL** (user profile)
14. `app/signup/page.tsx` - 39 violations - **CRITICAL** (registration)

### Property Management (109 violations)
15. `app/properties/documents/page.tsx` - 38 violations - **HIGH**
16. `app/properties/leases/page.tsx` - 32 violations - **MEDIUM**
17. `app/fm/vendors/[id]/page.tsx` - 35 violations - **MEDIUM**

### Marketplace (38 violations)
18. `app/marketplace/vendor/products/upload/page.tsx` - 38 violations - **HIGH**

### Core Components (94 violations)
19. `components/SystemVerifier.tsx` - 34 violations - **HIGH** (health checks)
20. `components/TopBar.tsx` - 32 violations - **CRITICAL** (navigation)

## Priority 2: Secondary Pages (50+ files, ~800 violations)
- Dashboard pages
- Report generators  
- Settings pages
- List/table views
- Form dialogs

## Priority 3: Low-Traffic Pages (~800 violations)
- Help/docs pages
- Admin tools
- Debug utilities

## Execution Plan

### Phase 1: Critical Paths (Week 1)
**Goal:** Make core user journeys perfect
- [ ] Payment creation flow (app/finance/payments/new)
- [ ] User registration/profile (app/signup, app/profile)
- [ ] Admin audit logs (security compliance)
- [ ] Aqar booking system (revenue critical)
- [ ] TopBar navigation (appears everywhere)

### Phase 2: High-Traffic Features (Week 2)
**Goal:** Fix pages users see most
- [ ] All finance pages (invoices, expenses, budgets)
- [ ] Aqar search & filters
- [ ] Property management core
- [ ] Marketplace vendor tools

### Phase 3: Secondary Features (Week 3)
**Goal:** Complete semantic token migration
- [ ] Dashboard pages
- [ ] Report generators
- [ ] Settings interfaces
- [ ] Admin tools

### Phase 4: Polish & Verification (Week 4)
**Goal:** Perfect dark mode, RTL, accessibility
- [ ] Dark mode testing all pages
- [ ] RTL layout verification
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance testing
- [ ] Documentation updates

## Automated Checks
```bash
# Count remaining violations
grep -r "bg-white\|bg-gray-\|border-gray-\|text-gray-" --include="*.tsx" components/ app/ | wc -l

# Find files still using rounded-lg (should be rounded-2xl for cards)
grep -r "rounded-lg" --include="*.tsx" components/ app/ | grep -v "rounded-2xl" | wc -l

# Find hardcoded hex colors
grep -r "bg-\[#\|text-\[#\|border-\[#" --include="*.tsx" components/ app/ | wc -l
```

## Success Criteria
- ✅ 0 hardcoded gray colors in critical paths
- ✅ All cards use rounded-2xl
- ✅ Dark mode works perfectly
- ✅ RTL layout correct for Arabic
- ✅ TypeScript 0 errors
- ✅ ESLint 0 errors
- ✅ All tests pass

---
**Next Action:** Start Phase 1 - Fix top 5 critical files
