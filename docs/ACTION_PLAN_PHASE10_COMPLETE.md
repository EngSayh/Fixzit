# Fixzit Phase 10-15 Complete Action Plan
## Session: 2025-12-18 09:50 AST
## Agent: GitHub Copilot (100% Execution Mode)

---

## IMMEDIATE BLOCKERS (MUST FIX FIRST)

### ESLint Error (Blocking Push)
- **File:** `app/api/filters/presets/route.ts:23`
- **Error:** `'FilterEntityType' is defined but never used`
- **Fix:** Remove unused import or use it

### TypeScript Errors (Blocking Build)
- **File:** `tests/integration/filters.test.ts:89,94`
- **Error:** Property 'assigned_to' does not exist on work order type
- **Fix:** Add assigned_to to createTestWorkOrder fixture

### Workflow Warnings (Non-blocking)
- GitHub Actions context warnings for SENTRY_* and OPENAI_KEY secrets
- Can be addressed in later phase

---

## PHASE 10: IMMEDIATE FIXES (Critical Blockers)
**Duration:** 10 minutes

### 10.1 Fix ESLint Error
- [ ] Remove unused FilterEntityType import from presets route
- [ ] Run `pnpm lint` to verify

### 10.2 Fix TypeScript Errors
- [ ] Add assigned_to field to createTestWorkOrder in fixtures.ts
- [ ] Run `pnpm typecheck` to verify

### 10.3 Verify Tests Still Pass
- [ ] Run `pnpm vitest run tests/integration/filters.test.ts`
- [ ] Ensure all integration tests pass

---

## PHASE 11: UX ENHANCEMENTS (High Priority)
**Duration:** 2 hours

### 11.1 Saved Views/Presets UX Polish
- [ ] Add "Set as Default" toggle in FilterPresetsDropdown
- [ ] Add preset management modal (edit/delete)
- [ ] Add toast notifications on save/load/delete
- [ ] Add keyboard shortcuts (Cmd+K for quick filter)

### 11.2 Skeleton Loaders
- [ ] Create TableSkeleton component
- [ ] Add to WorkOrdersViewNew during SWR loading
- [ ] Add to InvoicesList, UsersList, EmployeesList
- [ ] Add CardListSkeleton for mobile views

### 11.3 Bulk Actions Enhancement
- [ ] Add "Select All" checkbox in table headers
- [ ] Add "Clear Selection" in bulk action bar
- [ ] Add bulk export progress indicator
- [ ] Add confirmation dialog for bulk delete

---

## PHASE 12: SUPERADMIN EXPERIENCE
**Duration:** 3 hours

### 12.1 Setup Wizard
- [ ] Create components/superadmin/SetupWizard.tsx
- [ ] Step 1: Branding (logo, colors, company name)
- [ ] Step 2: Tenant defaults (language, currency, timezone)
- [ ] Step 3: Initial users (create first admin)
- [ ] Add route /superadmin/setup
- [ ] Show wizard on first login (check org.setup_complete)

### 12.2 Tenant Preview
- [ ] Add "Preview as Tenant" button in tenant list
- [ ] Create preview context (non-destructive)
- [ ] Show preview banner when active
- [ ] Add "Exit Preview" button

### 12.3 Guided Tours
- [ ] Add react-joyride dependency
- [ ] Create tour definitions for:
  * Dashboard overview
  * Work order creation
  * Filter presets
  * Bulk actions
- [ ] Add tour trigger in user menu

---

## PHASE 13: OBSERVABILITY IN UI
**Duration:** 2 hours

### 13.1 Rate Limit Pre-warnings
- [ ] Add rate-limit-remaining header extraction
- [ ] Show warning toast at 80% consumption
- [ ] Add rate limit indicator in dev tools panel
- [ ] Log rate limit hits to Sentry

### 13.2 Performance Indicators
- [ ] Add LoadingTime component (shows elapsed time)
- [ ] Add to Work Orders list (flag if >2s)
- [ ] Add to Marketplace listings
- [ ] Add to large reports

### 13.3 Error Recovery UI
- [ ] Add "Retry" button to error boundaries
- [ ] Add "Reload Data" button to empty states
- [ ] Add network status indicator (offline banner)
- [ ] Add stale data indicator (show age of cached data)

---

## PHASE 14: PROCESS EFFICIENCY
**Duration:** 2 hours

### 14.1 CI Enhancements
- [ ] Create .github/workflows/ci-fast-lane.yml (already exists, verify)
- [ ] Create .github/workflows/ci-full-suite.yml (already exists, verify)
- [ ] Add npm script: `test:changed` → `vitest run --changed`
- [ ] Add npm script: `test:server` → `vitest run --project=server`
- [ ] Add npm script: `test:client` → `vitest run --project=client`

### 14.2 Test Helper Consolidation
- [ ] Audit all test files for inline mocks
- [ ] Migrate to tests/helpers/domMocks.ts
- [ ] Create tests/helpers/domMocks.test.ts (smoke tests)
- [ ] Document helper usage in CONTRIBUTING.md

### 14.3 MongoMemoryServer Standardization
- [ ] Ensure all DB tests use tests/helpers/mongoMemory.ts
- [ ] Add connection pooling config
- [ ] Add retry logic for flaky connections
- [ ] Document best practices

---

## PHASE 15: OPTIONAL ENHANCEMENTS
**Duration:** 4 hours

### 15.1 Feature Flags
- [ ] Create lib/feature-flags.ts
- [ ] Add environment-based flags
- [ ] Add user-based flags (superadmin only)
- [ ] Wrap preview features with flag checks

### 15.2 Lightweight RUM
- [ ] Create hooks/usePerformanceMetrics.ts
- [ ] Track TTFB, CLS, LCP on key pages
- [ ] Send to Sentry performance monitoring
- [ ] Add performance dashboard (superadmin only)

### 15.3 Export Center
- [ ] Create components/exports/ExportCenter.tsx
- [ ] Add background export job queue
- [ ] Add export history table
- [ ] Add status indicators (queued/processing/complete)
- [ ] Support CSV/Excel formats

### 15.4 Data Aggregations
- [ ] Add groupBy prop to DataTableStandard
- [ ] Add summary row (totals, averages)
- [ ] Add chart view toggle
- [ ] Add tests for aggregations

---

## VERIFICATION CHECKLIST (After Each Phase)

### Code Quality
- [ ] `pnpm typecheck` → 0 errors
- [ ] `pnpm lint` → 0 errors
- [ ] `pnpm vitest run --project=server` → All passing
- [ ] `pnpm vitest run --project=client` → All passing

### Git Hygiene
- [ ] Commit messages follow conventional commits
- [ ] PR created with detailed description
- [ ] No merge conflicts with main/parallel agent
- [ ] Pre-push hooks pass

### Production Readiness
- [ ] No console.log in production code
- [ ] No hardcoded localhost URLs
- [ ] All environment variables documented
- [ ] Security best practices followed

---

## PARALLEL AGENT COORDINATION

### Recent Commits by Parallel Agent
- `98c3e71ae` - fix(phase9): Centralized filter entity types
- `193e5179b` - feat(phase2): Marketplace UX + RBAC
- `7455827e5` - fix(phase1): TypeScript errors

### Coordination Strategy
- Pull before each phase to sync changes
- Use descriptive commit messages to avoid conflicts
- Focus on different files when possible
- Communicate via commit messages

---

## ESTIMATED TIMELINE

| Phase | Duration | Priority | Status |
|-------|----------|----------|--------|
| Phase 10: Immediate Fixes | 10 min | P0 | ⏳ Starting |
| Phase 11: UX Enhancements | 2 hours | P1 | 🔲 Queued |
| Phase 12: Superadmin | 3 hours | P1 | 🔲 Queued |
| Phase 13: Observability UI | 2 hours | P2 | 🔲 Queued |
| Phase 14: Process Efficiency | 2 hours | P2 | 🔲 Queued |
| Phase 15: Optional | 4 hours | P3 | 🔲 Queued |

**Total:** ~13 hours (can be parallelized with other agent)

---

## SUCCESS CRITERIA

✅ All TypeScript/ESLint errors resolved
✅ All tests passing (integration + unit)
✅ PR created for each phase
✅ PENDING_MASTER.md updated after each phase
✅ Production-ready code (no shortcuts)
✅ Best practices applied (no partial fixes)
✅ Parallel agent changes merged smoothly

---

**PROCEEDING WITH PHASE 10...**
