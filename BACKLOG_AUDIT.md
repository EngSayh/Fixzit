# BACKLOG_AUDIT (Derived from docs/PENDING_MASTER.md + Today’s Findings)

- SSOT is MongoDB Issue Tracker. This file is a derived snapshot for sync operations only.

## Open Items (PENDING_MASTER)

1) P3-AQAR-FILTERS — Refactor Aqar SearchFilters to standard filter components  
   - Source: pending_master:docs/PENDING_MASTER.md:214-219  
   - Evidence: “Task 1: Aqar Filters Refactoring (5 hours)”  
   - Category: refactor | Priority: P3 | Status: open

2) P3-SOUQ-PRODUCTS — Migrate Souq Products list to DataTableStandard with filters  
   - Source: pending_master:docs/PENDING_MASTER.md:221-226  
   - Evidence: “Replace: ProductsList placeholder with DataTableStandard”  
   - Category: feature | Priority: P3 | Status: open

3) P3-LIST-INTEGRATION-TESTS — Add integration tests for 12 list components across roles  
   - Source: pending_master:docs/PENDING_MASTER.md:227-230  
   - Evidence: “Test: All 12 List components × 3 roles”  
   - Category: tests | Priority: P3 | Status: open

## New Findings (Today)

4) BUG-WO-FILTERS-MISSING — WorkOrdersViewNew ignores overdue/assignment filters in API params  
   - Source: code-review:components/fm/WorkOrdersViewNew.tsx:124-153  
   - Evidence: “if (state.filters?.status) params.set(\"status\", String(state.filters.status)); if (state.filters?.priority) params.set(\"priority\", String(state.filters.priority));”  
   - Category: bug | Priority: unspecified | Status: open

5) BUG-USERS-FILTERS-MISSING — UsersList inactiveDays/lastLogin filters never sent to query  
   - Source: code-review:components/administration/UsersList.tsx:107-113  
   - Evidence: “{ key: \"inactive-30d\", label: \"Inactive > 30d\", onClick: () => updateState({ filters: { inactiveDays: 30 }, page: 1 }) },”  
   - Category: bug | Priority: unspecified | Status: open

6) BUG-EMPLOYEES-FILTERS-MISSING — EmployeesList joiningDate/reviewDue filters not wired to query  
   - Source: code-review:components/hr/EmployeesList.tsx:112-116  
   - Evidence: “{ key: \"new-hires\", label: \"New Hires\", onClick: () => updateState({ filters: { joiningDateDays: 30 }, page: 1 }) },”  
   - Category: bug | Priority: unspecified | Status: open

7) BUG-INVOICES-FILTERS-MISSING — InvoicesList dateRange filter unused in query  
   - Source: code-review:components/finance/InvoicesList.tsx:111-116  
   - Evidence: “{ key: \"this-month\", label: \"This Month\", onClick: () => updateState({ filters: { dateRange: \"month\" }, page: 1 }) },”  
   - Category: bug | Priority: unspecified | Status: open

8) BUG-AUDITLOGS-FILTERS-MISSING — AuditLogsList dateRange/action filters not sent to API  
   - Source: code-review:components/administration/AuditLogsList.tsx:108-114  
   - Evidence: “{ key: \"today\", label: \"Today\", onClick: () => updateState({ filters: { dateRange: \"today\" }, page: 1 }) },”  
   - Category: bug | Priority: unspecified | Status: open
