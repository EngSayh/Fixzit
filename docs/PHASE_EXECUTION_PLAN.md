# Phase Execution Plan (live)

## Pending Items (scoped to avoid other-agent changes)
- Filter parity for admin lists: Users, Employees, Invoices, Audit Logs — ensure UI filters map to query params and APIs enforce them.
- FM endpoint alignment: confirm `/api/fm/work-orders` vs `/api/work-orders` for FM UI and adjust SWR keys/tests accordingly.
- QA log: update docs/PENDING_MASTER after filters/endpoint alignment.

## Phases
1) Filters Phase  
   - Audit list components vs API params.  
   - Implement missing params + add unit tests.  
   - Run targeted Vitest shards (`--maxWorkers=2`) to limit memory.

2) Endpoint Phase  
   - Align FM UI to the chosen work-orders endpoint.  
   - Update client tests to match.

3) Docs/QA Phase  
   - Reflect completed work in PENDING_MASTER.  
   - Re-run typecheck and targeted tests.

Notes: Avoid touching files currently modified by other agents (see git status) to prevent conflicts. Use small, scoped PR per phase.
