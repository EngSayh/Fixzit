# 📋 CATEGORIZED TASKS LIST

**Generated**: November 6, 2025  
**Source**: Past 5 days analysis + TODO/FIXME scan + Test results

---

## 📊 EXECUTIVE SUMMARY

**Total Tasks**: 45 tasks across 8 categories  
**Estimated Time**: 22-30 hours  
**High Priority**: 8 tasks (12-16 hours)  
**Medium Priority**: 15 tasks (8-12 hours)  
**Low Priority**: 22 tasks (2-4 hours)

---

## 🔴 CATEGORY 1: TESTING & QUALITY ASSURANCE (Priority: HIGH)

### 1.1 Fix Failing Tests ⚠️ CRITICAL

- **Status**: 143 tests failing
- **Issues**:
  - RBAC tests failing (role-based access control)
  - Secret scan issues in test files
  - Some test paths may need updating after file moves
- **Files**: Across test suite
- **Time**: 4-6 hours
- **Priority**: P0 - MUST FIX IMMEDIATELY

### 1.2 Update Test Import Paths

- **Status**: After PR #261 file moves
- **Action**: Verify all test imports point to correct locations
- **Files**: tests/unit/\* (newly moved files)
- **Time**: 1 hour
- **Priority**: P1

### 1.3 Add Missing Test Coverage

- **Current**: 42 new tests added (100% passing)
- **Needed**:
  - Marketplace components
  - FM (Facility Management) module
  - Auth middleware edge cases
- **Time**: 3-4 hours
- **Priority**: P2

---

## 🔴 CATEGORY 2: CODE QUALITY & STANDARDS (Priority: HIGH)

### 2.1 Console Statements Replacement - Phase 3 ⚠️ INCOMPLETE

- **Status**: API routes ✅ DONE (47 files), Components ✅ DONE (19 files)
- **Remaining**: ~50 app page files
- **Pattern**: Replace console.log/error/warn with logger utility
- **Locations**:
  - app/(dashboard)/\*_/_.tsx
  - app/admin/\*_/_.tsx
  - app/fm/\*_/_.tsx
  - app/marketplace/\*_/_.tsx
  - app/work-orders/\*_/_.tsx
  - app/properties/\*_/_.tsx
  - app/crm/\*_/_.tsx
  - app/hr/\*_/_.tsx
  - app/finance/\*_/_.tsx
- **Time**: 3-4 hours
- **Priority**: P0

### 2.2 Remove Placeholder Phone Numbers

- **Pattern**: +966XXXXXXXXX appears in multiple files
- **Action**: Replace with proper phone validation/formatting
- **Files**: Various components and services
- **Time**: 1 hour
- **Priority**: P2

### 2.3 TypeScript Strict Mode Issues

- **Action**: Enable strict mode and fix type errors
- **Files**: tsconfig.json + affected files
- **Time**: 2-3 hours
- **Priority**: P2

---

## 🟡 CATEGORY 3: ACCESSIBILITY (Priority: MEDIUM)

### 3.1 Navigation Accessibility - Category 6 ⚠️ INCOMPLETE

- **Status**: Not started
- **Files**: 17 files in nav/\*.ts
- **Requirements**:
  - Keyboard navigation support (Tab, Arrow keys, Enter, Escape)
  - ARIA attributes (aria-label, aria-current, aria-expanded)
  - Screen reader compatibility
  - Focus management
  - Skip navigation links
- **Files**:
  - nav/adminNav.ts
  - nav/dashboardNav.ts
  - nav/fmNav.ts
  - nav/marketplaceNav.ts
  - nav/hrNav.ts
  - nav/financeNav.ts
  - nav/crmNav.ts
  - nav/registry.ts
  - Plus 9 more nav files
- **Time**: 2-3 hours
- **Priority**: P1

### 3.2 Form Accessibility Audit

- **Action**: Ensure all forms meet WCAG 2.1 AA standards
- **Items**: Labels, error messages, keyboard navigation
- **Time**: 2 hours
- **Priority**: P2

### 3.3 Color Contrast Fixes

- **Action**: Verify color contrast ratios (4.5:1 minimum)
- **Tool**: Use automated scanner
- **Time**: 1 hour
- **Priority**: P2

---

## 🟡 CATEGORY 4: INTEGRATION & INFRASTRUCTURE (Priority: MEDIUM)

### 4.1 Monitoring Service Integration ⚠️ TODO

- **File**: lib/logger.ts
- **Current**: Using sessionStorage (client-side only)
- **Needed**: Integrate Sentry or DataDog
- **Action**:
  - Set up Sentry account/project
  - Add SDK and configuration
  - Implement error tracking
  - Add performance monitoring
- **Time**: 2-3 hours
- **Priority**: P1

### 4.2 Notification Services ⚠️ TODOs (4 items)

- **File**: lib/fm-notifications.ts
- **Needed Integrations**:
  1. FCM/Web Push for browser notifications
  2. Email service (SendGrid or AWS SES)
  3. SMS gateway (Twilio or AWS SNS)
  4. WhatsApp Business API
- **Current**: Stub functions returning null
- **Time**: 6-8 hours (all 4 services)
- **Priority**: P1 (Email), P2 (others)

### 4.3 Auth Middleware - Real Queries ⚠️ TODOs (4 items)

- **File**: lib/fm-auth-middleware.ts
- **Issues**:
  - TODO: Get subscription plan from user/org (appears 2x)
  - TODO: Verify org membership (appears 2x)
  - TODO: Query FMProperty model for ownership
- **Current**: Placeholder returns
- **Action**: Implement real database queries
- **Time**: 2-3 hours
- **Priority**: P1

### 4.4 Approval Engine - User Queries ⚠️ TODOs (3 items)

- **File**: lib/fm-approval-engine.ts
- **Issues**:
  - TODO: Query users by role in org/property
  - TODO: Query and add user IDs for escalation roles
  - TODO: Send escalation notifications
  - TODO: Implement notification sending
- **Time**: 2-3 hours
- **Priority**: P2

---

## 🟢 CATEGORY 5: UI/UX IMPROVEMENTS (Priority: LOW-MEDIUM)

### 5.1 Logo Replacement ⚠️ TODO

- **File**: components/auth/LoginHeader.tsx
- **Issue**: "TODO: Replace with official logo"
- **Action**: Get official logo and update
- **Time**: 30 minutes
- **Priority**: P2

### 5.2 Mobile Responsive Features ⚠️ TODO

- **File**: components/aqar/SearchFilters.tsx
- **Issue**: "TODO: Add mobile filter state"
- **Action**: Implement mobile-friendly filter panel
- **Time**: 2-3 hours
- **Priority**: P2

### 5.3 Dynamic System Verifier ⚠️ TODO

- **File**: components/SystemVerifier.tsx
- **Issue**: "TODO: Make dynamic - fetch from autoFixManager"
- **Action**: Implement API endpoint and dynamic fetching
- **Time**: 1-2 hours
- **Priority**: P3

### 5.4 RTL (Right-to-Left) Support Audit

- **Action**: Verify Arabic layout properly mirrors
- **Files**: All components with directional styling
- **Time**: 2 hours
- **Priority**: P2

---

## 🟢 CATEGORY 6: BUSINESS LOGIC & FEATURES (Priority: LOW-MEDIUM)

### 6.1 WPS Calculation - HR Module ⚠️ TODO

- **File**: services/hr/wpsService.ts
- **Issue**: "TODO: Calculate actual work days from attendance"
- **Current**: Placeholder calculation
- **Action**: Implement proper WPS (Wage Protection System) calculations
- **Time**: 2-3 hours
- **Priority**: P2

### 6.2 PayTabs Integration - Task 2

- **Status**: ⏸️ PAUSED (from Implementation Guide)
- **Action**: Complete payment gateway integration
- **Note**: NOT Stripe (use PayTabs per requirements)
- **Time**: 4-6 hours
- **Priority**: P2 (User decision needed)

### 6.3 Referral System - Task 3

- **Status**: ⏸️ PAUSED
- **Action**: Implement user referral tracking and rewards
- **Time**: 3-4 hours
- **Priority**: P3

### 6.4 Tasks 4-15 from Implementation Guide

- **Status**: ⏸️ PAUSED
- **Items**: 12 additional feature tasks
- **Time**: 15-20 hours
- **Priority**: P3 (Awaiting user decision)

---

## 🟢 CATEGORY 7: DOCUMENTATION & MAINTENANCE (Priority: LOW)

### 7.1 Update README.md

- **Action**:
  - Add latest architecture changes
  - Update setup instructions
  - Document new modules (FM, HR, Finance)
- **Time**: 1-2 hours
- **Priority**: P2

### 7.2 API Documentation

- **File**: openapi.yaml
- **Action**: Update with latest endpoints
- **Time**: 2-3 hours
- **Priority**: P2

### 7.3 Component Documentation

- **Action**: Add JSDoc comments to complex components
- **Files**: components/fm/_, components/marketplace/_
- **Time**: 2-3 hours
- **Priority**: P3

### 7.4 Architecture Decision Records (ADRs)

- **Action**: Document key architectural decisions
- **Topics**: Module structure, auth flow, state management
- **Time**: 2 hours
- **Priority**: P3

---

## 🟢 CATEGORY 8: PERFORMANCE & OPTIMIZATION (Priority: LOW)

### 8.1 Bundle Size Analysis

- **Action**: Analyze and reduce bundle size
- **Tools**: next/bundle-analyzer
- **Time**: 2 hours
- **Priority**: P3

### 8.2 Image Optimization

- **Action**: Convert images to WebP, implement lazy loading
- **Folders**: public/_, assets/_
- **Time**: 1-2 hours
- **Priority**: P3

### 8.3 Database Query Optimization

- **Action**: Add indexes, optimize N+1 queries
- **Files**: models/_, services/_
- **Time**: 3-4 hours
- **Priority**: P3

### 8.4 Caching Strategy

- **Action**: Implement Redis caching for frequently accessed data
- **Time**: 3-4 hours
- **Priority**: P3

---

## 📈 PROGRESS TRACKING

### Completed in Past 5 Days ✅

- ✅ PR #237: Accessibility improvements (MortgageCalculator labels)
- ✅ PR #238: Theme compliance (20 violations fixed)
- ✅ PR #239/263: Security fixes (GUEST role, format.ts, ErrorBoundary)
- ✅ PR #240: Type safety improvements
- ✅ PR #241: Console statements in API routes (47 files)
- ✅ PR #242: Console statements in components (19 files)
- ✅ PR #257: Auto-restart mechanism (PM2)
- ✅ PR #261: File organization (tests, legacy cleanup)
- ✅ 10 WIP/draft PRs closed
- ✅ All branches cleaned up
- ✅ 42 new tests added (100% passing)
- ✅ Documentation files organized into categories

### In Progress 🔄

- 🔄 File organization refinement (this session)
- 🔄 Categorized task list creation

### Immediate Next (This Week) ⏸️

- ⏸️ Fix 143 failing tests (P0 - 4-6 hours)
- ⏸️ Console statements Phase 3 (P0 - 3-4 hours)
- ⏸️ Navigation accessibility (P1 - 2-3 hours)
- ⏸️ Monitoring integration (P1 - 2-3 hours)

---

## 🎯 RECOMMENDED EXECUTION ORDER

### Sprint 1 (Week 1): Critical Fixes

1. **Day 1-2**: Fix 143 failing tests (6 hours)
2. **Day 2-3**: Console statements Phase 3 (4 hours)
3. **Day 3-4**: Monitoring integration (Sentry) (3 hours)
4. **Day 4-5**: Navigation accessibility (3 hours)

**Sprint 1 Total**: ~16 hours

### Sprint 2 (Week 2): Infrastructure & Auth

1. **Day 1-2**: Auth middleware real queries (3 hours)
2. **Day 2-3**: Email notification service (3 hours)
3. **Day 3-4**: Approval engine user queries (3 hours)
4. **Day 4-5**: Test coverage improvements (4 hours)

**Sprint 2 Total**: ~13 hours

### Sprint 3 (Week 3): Polish & Features

1. **Day 1**: Form/Color accessibility (3 hours)
2. **Day 2**: Mobile responsive features (3 hours)
3. **Day 3**: WPS calculations (3 hours)
4. **Day 4**: Documentation updates (3 hours)
5. **Day 5**: UI polish (logo, RTL audit) (2 hours)

**Sprint 3 Total**: ~14 hours

### Sprint 4+ (Week 4+): Optional Enhancements

- PayTabs integration (if approved)
- Additional notification services (SMS, WhatsApp)
- Performance optimizations
- Referral system
- Tasks 4-15 from Implementation Guide

---

## ⏱️ TIME ESTIMATES BY PRIORITY

### P0 - Critical (Must Do This Week)

- Test failures: 4-6 hours
- Console statements: 3-4 hours
- **Subtotal**: 7-10 hours

### P1 - High Priority (Do This Month)

- Navigation accessibility: 2-3 hours
- Monitoring integration: 2-3 hours
- Auth middleware: 2-3 hours
- Email notifications: 3 hours
- **Subtotal**: 9-12 hours

### P2 - Medium Priority (Do This Quarter)

- Approval engine: 2-3 hours
- Form accessibility: 2 hours
- Mobile responsive: 2-3 hours
- WPS calculations: 2-3 hours
- Test coverage: 3-4 hours
- Documentation: 3-5 hours
- **Subtotal**: 14-20 hours

### P3 - Low Priority (Backlog)

- Performance optimizations: 8-10 hours
- Component docs: 2-3 hours
- Bundle analysis: 2 hours
- Optional features: 20+ hours
- **Subtotal**: 32+ hours

**Total Identified Work**: 62-74 hours

---

## 🔍 TASK DEPENDENCIES

### Must Complete Before Others:

1. **Test Fixes** → Blocks all PR merges
2. **Console Statements** → Blocks production deployment
3. **Monitoring Integration** → Needed before production issues occur
4. **Auth Middleware** → Blocks FM module features

### Can Be Done in Parallel:

- Navigation accessibility
- Test coverage improvements
- Documentation updates
- UI polish items

---

## ✅ COMPLETION CRITERIA

### Definition of Done for Each Task:

- [ ] Code implemented and tested locally
- [ ] All tests passing (including new tests)
- [ ] Code review completed
- [ ] Documentation updated (if applicable)
- [ ] No console errors or warnings
- [ ] Accessibility verified (if UI change)
- [ ] Merged to main branch
- [ ] Deployment verified (if applicable)

---

## 📞 DECISION POINTS (Require User Input)

1. **PayTabs Integration**: Proceed with Task 2?
2. **Notification Services Priority**: Which services first? (Email > SMS > WhatsApp?)
3. **Implementation Guide Tasks 4-15**: Continue or deprioritize?
4. **Performance Work**: When to prioritize optimization sprint?

---

_Generated: November 6, 2025_  
_Next Review: After Sprint 1 completion_  
_Owner: Development Team_
