# BACKLOG_AUDIT (Derived from docs/PENDING_MASTER.md + Today's Findings)

- SSOT is MongoDB Issue Tracker. This file is a derived snapshot for sync operations only.

## Open Items (PENDING_MASTER)

1) P3-AQAR-FILTERS - Refactor Aqar SearchFilters to standard filter components
   - Source: pending_master:docs/PENDING_MASTER.md:214-219
   - Evidence: "Task 1: Aqar Filters Refactoring (5 hours)"
   - Category: refactor | Priority: P3 | Status: open

2) P3-SOUQ-PRODUCTS - Migrate Souq Products list to DataTableStandard with filters
   - Source: pending_master:docs/PENDING_MASTER.md:221-226
   - Evidence: "Replace: ProductsList placeholder with DataTableStandard"
   - Category: feature | Priority: P3 | Status: open

3) P3-LIST-INTEGRATION-TESTS - Add integration tests for 12 list components across roles
   - Source: pending_master:docs/PENDING_MASTER.md:227-230
   - Evidence: "Test: All 12 List components x 3 roles"
   - Category: tests | Priority: P3 | Status: open

## Resolved Items (Verified 2025-12-25 - FALSE POSITIVES)

These bugs were marked open based on stale evidence. Re-verification found all 5 list components
correctly use serializeFilters(state.filters, *_FILTER_SCHEMA, params) to wire filters to API params.

4) BUG-WO-FILTERS-MISSING - RESOLVED (serializeFilters on line 189)
5) BUG-USERS-FILTERS-MISSING - RESOLVED (serializeFilters on line 127)
6) BUG-EMPLOYEES-FILTERS-MISSING - RESOLVED (serializeFilters on line 137)
7) BUG-INVOICES-FILTERS-MISSING - RESOLVED (serializeFilters on line 170)
8) BUG-AUDITLOGS-FILTERS-MISSING - RESOLVED (serializeFilters on line 130)

---
Last verified: 2025-12-25 by [AGENT-001-A]
