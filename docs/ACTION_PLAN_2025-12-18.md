# Fixzit 100% Execution Action Plan
## Generated: 2025-12-18 08:40 AST
## Target: Production Ready, All Priority Levels

---

## CURRENT STATE ASSESSMENT (VERIFIED)
✅ TypeScript: 0 errors
✅ Tests: Last run successful (1576/1576 passing)
✅ Vitest Config: Bounded threads (maxWorkers: 4, minWorkers: 1)
✅ Git: Clean working state (few modified files)
✅ Aggregate Helper: Consolidated (server/db re-exports lib/db)

---

## PHASE 1: CRITICAL SECURITY & INFRASTRUCTURE (P0)
**Est: 4 hours | PR: #1-security-ssrf-async**

### 1.1 SSRF Validator Upgrade to v2.0 (ASYNC + DNS + IPv6)
- [ ] Create async validatePublicHttpsUrl function with dns.promises
- [ ] Add DNS resolution check (prevent rebinding attacks)
- [ ] Add IPv6 private range detection (fc00::/7, fe80::/10)
- [ ] Add tests for DNS rebinding, IPv6, redirect chains
- [ ] Update all call sites (app/api/admin/sms/settings/route.ts, etc.)
- [ ] Update docs/security/SSRF_AUDIT.md to v2.0

### 1.2 Consolidate Aggregate Helper (Remove Duplication)
- [ ] Update all imports from server/db/aggregateWithTenantScope → lib/db/aggregateWithTenantScope
- [ ] Add deprecation notice to server/db/aggregateWithTenantScope.ts
- [ ] Create codemod script for gradual migration
- [ ] Add tenancy guard integration tests

### 1.3 Environment Variable Validation
- [ ] Enhance scripts/ci/check-critical-env.ts with Zod schema
- [ ] Add runtime validation in instrumentation.ts
- [ ] Test with missing/invalid env vars

---

## PHASE 2: OBSERVABILITY & MONITORING (P0-P1)
**Est: 3 hours | PR: #2-observability**

### 2.1 Enable Sentry
- [ ] Add Sentry SDK to instrumentation.ts
- [ ] Configure sampling (10% traces, 100% errors)
- [ ] Add user context enrichment
- [ ] Test error capture with sample event
- [ ] Add source maps for production builds

### 2.2 Add Correlation IDs
- [ ] Add X-Request-ID header to middleware.ts
- [ ] Propagate through all API routes
- [ ] Include in error logs and Sentry events
- [ ] Update logging utilities

### 2.3 Rate Limit & SSRF Metrics
- [ ] Add rate-limit hit counters (by route)
- [ ] Add SSRF validation failure metrics
- [ ] Add MongoDB slow query logging
- [ ] Create observability dashboard docs

---

## PHASE 3: TESTING INFRASTRUCTURE (P1)
**Est: 6 hours | PR: #3-test-infrastructure**

### 3.1 CI Optimization
- [ ] Split CI matrix: server vs client projects
- [ ] Add test sharding for large suites
- [ ] Implement pre-push fast lane (--changed flag)
- [ ] Add nightly full run with coverage

### 3.2 Shared Test Helpers
- [ ] Consolidate clipboard/fetch/window mocks (tests/helpers/domMocks.ts)
- [ ] Create shared MongoMemoryServer helper
- [ ] Add reusable fixture factories (users, orgs, properties)
- [ ] Add smoke test for helper utilities

### 3.3 Integration Test Coverage
- [ ] Add marketplace unauth flow tests (guest context)
- [ ] Add filter integration tests (query builder → API)
- [ ] Add bulk actions smoke tests
- [ ] Target: 50% integration coverage

---

## PHASE 4: DATA TABLES & BULK ACTIONS (P1-P2)
**Est: 8 hours | PR: #4-bulk-actions**

### 4.1 Bulk Actions Bar Component
- [ ] Create components/tables/BulkActionsBar.tsx
- [ ] Add row selection state management
- [ ] Implement bulk delete action
- [ ] Implement bulk export (CSV/Excel)
- [ ] Add confirmation dialogs

### 4.2 Saved Filter Presets
- [ ] Create saved filter schema (user_id, name, filters, sort)
- [ ] Add FilterPresets model
- [ ] Implement save/load/delete preset API
- [ ] Add preset dropdown to TableToolbar
- [ ] Add tests for preset CRUD

### 4.3 Apply to Key Lists
- [ ] WorkOrdersViewNew (FM)
- [ ] UsersList (Administration)
- [ ] EmployeesList (HR)
- [ ] InvoicesList (Finance)
- [ ] AuditLogsList (Administration)

---

## PHASE 5: PERFORMANCE OPTIMIZATION (P2)
**Est: 5 hours | PR: #5-performance**

### 5.1 Query Optimization
- [ ] Add .lean() to high-volume listings (properties, products, orders)
- [ ] Add compound indexes for common filters
- [ ] Implement cursor-based pagination for large datasets
- [ ] Add query execution time logging

### 5.2 Caching Layer
- [ ] Cache static taxonomies (categories, brands, roles)
- [ ] Implement MongoDB caching for hot queries
- [ ] Add cache invalidation hooks
- [ ] Add cache hit/miss metrics

### 5.3 Bundle Size Reduction
- [ ] Code-split heavy admin modules
- [ ] Lazy load marketplace components
- [ ] Analyze bundle with webpack-bundle-analyzer
- [ ] Target: <500KB main bundle

---

## PHASE 6: UX ENHANCEMENTS (P2-P3)
**Est: 10 hours | PR: #6-ux-improvements**

### 6.1 Superadmin Experience
- [ ] Create guided setup wizard for first-time login
- [ ] Add branding preview (logo/favicon/colors)
- [ ] Add "simulate tenant" mode (preview theme/lang/currency)
- [ ] Add SMS webhook test button
- [ ] Enhance audit log filters

### 6.2 Loading States & Skeletons
- [ ] Add skeleton loaders to WorkOrdersViewNew
- [ ] Add skeleton loaders to InvoicesList
- [ ] Add skeleton loaders to ProductsList
- [ ] Add optimistic UI for bulk actions
- [ ] Add progress indicators for async operations

### 6.3 Error Recovery
- [ ] Add inline validation hints to forms
- [ ] Improve 401/allowlist messaging in marketplace
- [ ] Add empty states with recovery actions
- [ ] Add retry mechanisms for failed API calls

### 6.4 Search & CRM Enhancements
- [ ] Add saved filters to admin lists
- [ ] Add quick facets (org/role/status)
- [ ] Add pipeline/lead drill-down in CRM overview
- [ ] Implement global search (Cmd+K)

---

## PHASE 7: API COVERAGE & DOCUMENTATION (P3)
**Est: 15 hours | PR: #7-api-coverage**

### 7.1 Missing API Tests
- [ ] Identify untested routes (357 total - 88 tested = 269 remaining)
- [ ] Prioritize by usage frequency
- [ ] Create test templates for common patterns
- [ ] Target: 80% coverage (285 routes tested)

### 7.2 API Documentation
- [ ] Generate OpenAPI spec from route handlers
- [ ] Add request/response examples
- [ ] Add error code reference
- [ ] Set up API docs site (Swagger/Redoc)

---

## PHASE 8: MARKETPLACE RESILIENCE (P3)
**Est: 6 hours | PR: #8-marketplace-resilience**

### 8.1 Guest Context Improvements
- [ ] Make guest context deterministic (no random IDs)
- [ ] Add proper unauth flow tests
- [ ] Improve 401 error messaging
- [ ] Add cart persistence for guests

### 8.2 Error Handling
- [ ] Add fallback UI for failed product loads
- [ ] Add retry logic for order creation
- [ ] Improve checkout validation
- [ ] Add payment failure recovery

---

## PHASE 9: RTL & I18N POLISH (P3-P4)
**Est: 4 hours | PR: #9-i18n-polish**

### 9.1 RTL Consistency
- [ ] Audit all pages for RTL issues
- [ ] Ensure flag dropdown on all layouts
- [ ] Ensure currency selector on all pages
- [ ] Test with Arabic language

### 9.2 I18N Fallbacks
- [ ] Add ICU fallback monitoring
- [ ] Log missing translation keys
- [ ] Add translation coverage report
- [ ] Fix placeholder phone numbers (+966 XX XXX XXXX → real format)

---

## PHASE 10: OPTIONAL ENHANCEMENTS (P4)
**Est: 8 hours | PR: #10-optional**

### 10.1 Feature Flags
- [ ] Implement feature flag system
- [ ] Add flags for superadmin preview features
- [ ] Add flags for experimental UX

### 10.2 Real User Monitoring
- [ ] Add lightweight RUM hooks
- [ ] Capture TTFB/CLS/LCP metrics
- [ ] Add perf traces for high-traffic pages
- [ ] Create performance dashboard

### 10.3 Health Dashboards
- [ ] Create MongoDB health endpoint
- [ ] Create MongoDB health endpoint
- [ ] Add system status page
- [ ] Add incident response runbook

---

## EXECUTION STRATEGY

1. **Work Phase by Phase**: Complete all tasks in Phase N before moving to Phase N+1
2. **Create PR per Phase**: Each phase gets one PR with comprehensive description
3. **Update PENDING_MASTER**: After each phase completion
4. **No Shortcuts**: Fix root causes, not symptoms
5. **Test Before Commit**: Run typecheck + relevant test suites
6. **Consider Parallel Agent**: Check git status frequently to avoid conflicts

---

## VALIDATION CHECKLIST (Run After Each Phase)
- [ ] `pnpm typecheck` → 0 errors
- [ ] `pnpm lint` → 0 errors
- [ ] `pnpm vitest run --project=server --reporter=dot` → all passing
- [ ] `pnpm vitest run --project=client --reporter=dot` → all passing
- [ ] `git status` → only intended changes
- [ ] PR created with clear title and description

---

## ESTIMATED TOTAL TIME: 69 hours
## TARGET COMPLETION: 5-7 working days (10h/day)

**Status**: Phase 1 starting now...
