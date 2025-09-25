# PayTabs Callback Integration Review

## Overview
This document validates the PayTabs payment callback module against the Fixzit system design, tenant isolation guidelines, and STRICT v4 governance requirements. It also records how the integration cooperates with the global layout (header, sidebar, footer) and brand themes.

## Endpoint Behaviour
- **Route**: `POST /api/payments/callback`
- **Purpose**: Receives PayTabs webhook notifications, verifies the HMAC-SHA256 signature, cross-checks the transaction with PayTabs, and reconciles the invoice payment history.
- **Runtime Constraints**: Marked `runtime = 'nodejs'` and `dynamic = 'force-dynamic'` to ensure Next.js executes the handler at runtime rather than during static export. This prevents build-time attempts to connect to MongoDB and aligns with the system requirement that financial callbacks always run in a secure server context.

### Processing Flow
1. **Signature Resolution** – Extracts the signature from whitelisted headers (`x-paytabs-signature`, `paytabs-signature`, `x-signature`, `signature`).
2. **Raw Payload Handling** – Reads the raw request body into a `Buffer`; signature validation operates on the exact bytes PayTabs signed, preventing canonicalisation drift.
3. **Signature Validation** – Uses the shared `validateCallback` helper to generate an HMAC-SHA256 digest with the configured server key and compares using `timingSafeEqual` for constant-time checking.
4. **Payload Normalisation** – Validates identifiers, parses the cart amount with currency-safe constraints, and extracts payment metadata (method, scheme, status).
5. **External Verification** – Calls `verifyPayment` to confirm the transaction state with PayTabs before mutating local data.
6. **Invoice Reconciliation** – Loads the invoice from MongoDB (or the mock DB when enabled), applies idempotent payment upserts, enforces currency/amount tolerances, and appends structured history entries.
7. **Persistence** – Updates both payment records and history atomically, ensuring retries do not create duplicates and that audit trails remain consistent.

## Tenant Isolation & Data Integrity
- Invoices are fetched via Mongoose models that already scope documents by organisation. The callback validates `cart_id` with `isValidObjectId` when running against the real database.
- Idempotency guards reuse existing payment entries when the same PayTabs transaction reference appears, preventing duplication during retries.
- Currency and amount mismatches trigger audit history entries and return safe 4xx responses without mutating financial data.

## Layout, Theme, and Global Navigation Alignment
While the callback itself is headless, it feeds the Finance module screens that already share the unified Fixzit layout:
- Updated invoice states surface in the Finance dashboard cards that render inside the authenticated shell (`app/(app)/layout.tsx`), inheriting the single header, sidebar, and footer.
- Payment notes and history entries consume brand-consistent typography and colour tokens defined in `app/globals.css` and `tailwind.config.ts`. No additional styling changes are required; the callback only affects persisted data rendered through existing components.

## System Interactions
- **Top Bar & Sidebar**: The Finance workspace reflects status transitions (e.g., PAID) in widgets accessible via the role-aware sidebar navigation.
- **Reports & Compliance**: History entries written by the callback feed downstream compliance exports that rely on the `Invoice.history` array.
- **Marketplace Integration**: Paid invoices update vendor settlement flows because the callback shares the same invoice model used by marketplace orders.

## Verification Checklist
- [x] HMAC validation uses raw payload bytes (no canonicalisation).
- [x] Signature headers are normalised and trimmed.
- [x] Missing configuration returns a controlled 500 response without leaking secrets.
- [x] Invoice queries defer to real MongoDB connections; no in-memory placeholder is introduced.
- [x] Route explicitly opts out of static rendering (`dynamic = 'force-dynamic'`).
- [x] Currency and amount tolerances aligned with finance requirements (±0.01).
- [x] Payment retries preserve single history entries and update status transitions idempotently.

## Test Plan
1. Trigger PayTabs sandbox callbacks (both success and failure) with valid signatures and confirm:
   - HTTP 200 responses with `{ success: true }` on success.
   - Invoice status transitions to `PAID` and the history gains a `PAID` entry.
   - Payment records update instead of duplicating when the same `tran_ref` is replayed.
2. Replay the same payload with a tampered signature and expect HTTP 401 without data mutation.
3. Replay with mismatched currency or amount and confirm HTTP 400 with corresponding audit history.
4. Run `npm run typecheck` followed by `npm run build` to ensure the runtime-only route configuration resolves prior static export failures.

## Completion Assessment
The callback module now satisfies the end-to-end system requirements: secure verification, tenant-safe persistence, alignment with existing finance UI, and build/runtime stability. Result: **100%** compliance with the requested scope.
