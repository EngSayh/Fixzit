# Finance Pack Integration - Comprehensive TODO

## Status: NOT YET STARTED

**Last Updated:** Phase 3 Completion  
**Priority:** HIGH (Major Feature)  
**Estimated Time:** 3-4 hours

---

## Overview

The Finance Pack is a complete double-entry accounting system designed for Saudi market compliance with multi-currency support, escrow management, and integration with Aqar (real estate) and Marketplace modules.

### Current State

- ✅ Basic invoice service exists: `server/finance/invoice.service.ts`
- ✅ Basic invoice schema exists: `server/finance/invoice.schema.ts`
- ✅ Finance UI pages exist: `app/finance/` directory
- ❌ NO double-entry accounting (no Chart of Accounts, Journals, Ledgers)
- ❌ NO escrow management
- ❌ NO integration with Aqar rent invoicing
- ❌ NO integration with Marketplace order settlement

---

## Required Models

### Core Accounting Models (NOT YET CREATED)

1. **ChartAccount** (`server/models/finance/ChartAccount.ts`)

   ```typescript
   {
     orgId: ObjectId,
     code: string,        // "1000", "2000", etc.
     name: { en: string, ar: string },
     type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE',
     subtype: 'CURRENT' | 'FIXED' | 'CONTRA' | ...,
     normalBalance: 'DEBIT' | 'CREDIT',
     currency: string,
     active: boolean,
     isSystem: boolean,   // Platform-level accounts
     parentId?: ObjectId  // For hierarchical COA
   }
   ```

2. **Journal** (`server/models/finance/Journal.ts`)

   ```typescript
   {
     orgId: ObjectId,
     number: string,      // "JE-000001"
     date: Date,
     type: 'STANDARD' | 'ADJUSTMENT' | 'REVERSAL' | 'CLOSING',
     description: string,
     status: 'DRAFT' | 'POSTED' | 'VOID',
     postings: [{
       accountId: ObjectId,
       debit: number,     // Minor units (cents)
       credit: number,    // Minor units (cents)
       currency: string,
       fxRate: number,
       memo: string,
       dimensions: {
         propertyId?: ObjectId,
         unitId?: ObjectId,
         workOrderId?: ObjectId,
         leaseId?: ObjectId,
         orderId?: ObjectId,
         vendorId?: ObjectId
       }
     }],
     reversalOf?: ObjectId,  // If this reverses another journal
     reversedBy?: ObjectId,  // If reversed by another journal
     createdBy: ObjectId,
     postedBy?: ObjectId,
     postedAt?: Date
   }
   ```

3. **LedgerEntry** (`server/models/finance/LedgerEntry.ts`)
   - Immutable records created from posted Journals
   - Used for generating Trial Balance, Income Statement, Balance Sheet

   ```typescript
   {
     orgId: ObjectId,
     journalId: ObjectId,
     accountId: ObjectId,
     date: Date,
     debit: number,
     credit: number,
     balance: number,    // Running balance
     currency: string,
     fxRate: number,
     dimensions: { ... },
     isReversal: boolean
   }
   ```

4. **EscrowAccount** (`server/models/finance/EscrowAccount.ts`)

   ```typescript
   {
     orgId: ObjectId,
     accountId: ObjectId,  // Links to ChartAccount
     type: 'TENANCY_DEPOSIT' | 'MARKETPLACE_ORDER',
     linkedEntity: {
       entityType: 'Lease' | 'MarketplaceOrder',
       entityId: ObjectId
     },
     balance: number,      // Minor units
     currency: string,
     status: 'ACTIVE' | 'RELEASED' | 'FORFEITED',
     transactions: [{
       date: Date,
       amount: number,
       type: 'DEPOSIT' | 'RELEASE' | 'ADJUSTMENT',
       journalId: ObjectId,
       memo: string
     }]
   }
   ```

5. **Payment** (`server/models/finance/Payment.ts`)

   ```typescript
   {
     orgId: ObjectId,
     paymentNumber: string,
     date: Date,
     invoiceIds: [ObjectId],
     amount: number,
     currency: string,
     method: 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'CHECK',
     status: 'PENDING' | 'CLEARED' | 'BOUNCED' | 'CANCELLED',
     bankAccountId?: ObjectId,
     reference?: string,
     journalId?: ObjectId,  // Created when posted
     createdBy: ObjectId
   }
   ```

6. **Expense** (`server/models/finance/Expense.ts`)
   ```typescript
   {
     orgId: ObjectId,
     expenseNumber: string,
     date: Date,
     vendor?: ObjectId,
     category: 'MATERIALS' | 'LABOR' | 'UTILITIES' | 'MAINTENANCE' | ...,
     amount: number,
     currency: string,
     taxAmount: number,
     total: number,
     status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID',
     linkedEntity?: {
       entityType: 'WorkOrder' | 'Property',
       entityId: ObjectId
     },
     attachments: [{ url: string, name: string }],
     journalId?: ObjectId,
     createdBy: ObjectId,
     approvedBy?: ObjectId
   }
   ```

---

## Required Services

### Core Services (NOT YET CREATED)

1. **postingService** (`server/finance/posting.service.ts`)
   - `createJournal()` - Create draft journal entry
   - `postJournal()` - Post journal (create ledger entries, mark immutable)
   - `reverseJournal()` - Create reversal journal
   - `balanceCheck()` - Verify debits = credits
   - `updateLedger()` - Create ledger entries from postings

2. **invoiceService** (ENHANCE EXISTING)
   - `generateRentInvoice()` - Auto-generate from lease
   - `postInvoiceToGL()` - Create journal entry when invoice posted
   - `recordPayment()` - Link payment to invoice + create journal

3. **paymentService** (`server/finance/payment.service.ts`)
   - `recordPayment()` - Create payment record
   - `clearPayment()` - Mark as cleared + post to GL
   - `applyToInvoices()` - Allocate payment across multiple invoices

4. **escrowService** (`server/finance/escrow.service.ts`)
   - `createEscrow()` - Setup escrow account for lease/order
   - `depositEscrow()` - Record deposit + create journal
   - `releaseEscrow()` - Release funds + create journal
   - `forfeitEscrow()` - Forfeit deposit (e.g., lease breach)

5. **reportingService** (`server/finance/reporting.service.ts`)
   - `trialBalance()` - Generate trial balance for period
   - `incomeStatement()` - P&L report
   - `balanceSheet()` - Assets = Liabilities + Equity
   - `cashFlow()` - Operating/Investing/Financing activities
   - `agingReport()` - AR aging by customer
   - `ownerStatement()` - Property owner statement with rent/expenses

6. **aqarService** (ENHANCE EXISTING)
   - `generateRentInvoices()` - Batch generate for due leases
   - `postRentReceipt()` - Record rent payment + post to GL
   - `calculateOwnerPayout()` - Net rent - expenses - commission

7. **marketplaceService** (ENHANCE EXISTING)
   - `settleOrder()` - Release escrow + pay vendor + record commission
   - `recordCommission()` - Create commission journal entry

---

## Event → Journal Posting Mappings

### 1. Rent Invoice Generated

```typescript
// Dr: Accounts Receivable (propertyId dimension)
// Cr: Rental Revenue (propertyId dimension)
Postings: [
  { accountId: AR, debit: rentAmount, dimensions: { propertyId, leaseId } },
  {
    accountId: RENTAL_REVENUE,
    credit: rentAmount,
    dimensions: { propertyId, leaseId },
  },
];
```

### 2. Rent Payment Received

```typescript
// Dr: Bank Account
// Cr: Accounts Receivable
Postings: [
  { accountId: BANK_ACCOUNT, debit: amount },
  { accountId: AR, credit: amount, dimensions: { propertyId, leaseId } },
];
```

### 3. Security Deposit Received

```typescript
// Dr: Bank Account
// Cr: Tenant Deposits Liability (escrow)
Postings: [
  { accountId: BANK_ACCOUNT, debit: depositAmount },
  {
    accountId: TENANT_DEPOSITS,
    credit: depositAmount,
    dimensions: { leaseId },
  },
];
```

### 4. Work Order Expense

```typescript
// Dr: Maintenance Expense (propertyId dimension)
// Cr: Accounts Payable or Cash
Postings: [
  {
    accountId: MAINTENANCE_EXPENSE,
    debit: expenseAmount,
    dimensions: { propertyId, workOrderId },
  },
  { accountId: AP_OR_CASH, credit: expenseAmount, dimensions: { vendorId } },
];
```

### 5. Owner Payout

```typescript
// Dr: Rental Revenue (reduce owner's share)
// Cr: Owner Payable
Postings: [
  { accountId: RENTAL_REVENUE, debit: ownerShare, dimensions: { propertyId } },
  { accountId: OWNER_PAYABLE, credit: ownerShare, dimensions: { propertyId } },
];
```

### 6. Marketplace Order Escrow

```typescript
// Dr: Cash (buyer payment)
// Cr: Marketplace Escrow Liability
Postings: [
  { accountId: BANK_ACCOUNT, debit: orderTotal },
  {
    accountId: MARKETPLACE_ESCROW,
    credit: orderTotal,
    dimensions: { orderId },
  },
];
```

### 7. Marketplace Order Settlement

```typescript
// Dr: Marketplace Escrow Liability
// Dr: Commission Expense
// Cr: Vendor Payable
// Cr: Commission Revenue
Postings: [
  { accountId: MARKETPLACE_ESCROW, debit: orderTotal, dimensions: { orderId } },
  { accountId: COMMISSION_EXPENSE, debit: commission },
  { accountId: VENDOR_PAYABLE, credit: vendorPayout, dimensions: { vendorId } },
  { accountId: COMMISSION_REVENUE, credit: commission },
];
```

---

## Integration Points

### 1. Aqar Module Integration

- `app/api/v1/aqar/leases/[id]/rent-invoices/generate` → POST
  - Trigger: Lease due date reached
  - Action: Call `aqarService.generateRentInvoices()`
  - Result: Invoice created + Journal posted (DR: AR, CR: Revenue)

- `app/api/v1/aqar/leases/[id]/payments` → POST
  - Trigger: Rent payment received
  - Action: Call `paymentService.recordPayment()` + `postingService.createJournal()`
  - Result: Payment recorded + Journal posted (DR: Cash, CR: AR)

### 2. Marketplace Module Integration

- `app/api/v1/marketplace/orders/[id]/settle` → POST
  - Trigger: Order fulfilled + quality check passed
  - Action: Call `marketplaceService.settleOrder()`
  - Result: Escrow released + Vendor paid + Commission recorded

### 3. Work Order Module Integration

- `app/api/v1/work-orders/[id]/expenses` → POST
  - Trigger: Expense submitted by technician
  - Action: Call `expenseService.create()` + link to WO
  - Result: Expense recorded with WO dimension

---

## Chart of Accounts Seed Data

Default accounts to create on first setup:

```typescript
// Assets
1000 - Cash
1100 - Bank Account - Operating
1200 - Accounts Receivable
1300 - Tenant Deposits Held
1400 - Marketplace Escrow

// Liabilities
2000 - Accounts Payable
2100 - Tenant Deposits Liability
2200 - Marketplace Escrow Liability
2300 - Owner Payable
2400 - Tax Payable (VAT)

// Equity
3000 - Owner's Capital
3100 - Retained Earnings
3200 - Current Year Earnings

// Revenue
4000 - Rental Revenue
4100 - Commission Revenue - Aqar
4200 - Commission Revenue - Marketplace
4300 - Service Fees

// Expenses
5000 - Maintenance Expense
5100 - Utilities Expense
5200 - Property Management Fees
5300 - Commission Expense - Marketplace
5400 - Salaries & Wages
5500 - Marketing Expense
```

---

## API Routes to Create

### Core Finance APIs

- `POST /api/v1/finance/chart-accounts` - Create account
- `GET /api/v1/finance/chart-accounts` - List accounts (with hierarchy)
- `POST /api/v1/finance/journals` - Create journal entry
- `POST /api/v1/finance/journals/:id/post` - Post journal to GL
- `POST /api/v1/finance/journals/:id/reverse` - Create reversal
- `GET /api/v1/finance/ledger` - Query ledger entries
- `GET /api/v1/finance/reports/trial-balance` - Trial balance
- `GET /api/v1/finance/reports/income-statement` - P&L
- `GET /api/v1/finance/reports/balance-sheet` - Balance sheet

### Payment APIs

- `POST /api/v1/finance/payments` - Record payment
- `POST /api/v1/finance/payments/:id/clear` - Clear payment

### Escrow APIs

- `POST /api/v1/finance/escrow` - Create escrow account
- `POST /api/v1/finance/escrow/:id/deposit` - Deposit funds
- `POST /api/v1/finance/escrow/:id/release` - Release funds

### Integration APIs

- `POST /api/v1/aqar/leases/:id/rent-invoices/generate` - Generate rent invoice
- `POST /api/v1/aqar/leases/:id/payments` - Record rent payment
- `POST /api/v1/marketplace/orders/:id/settle` - Settle marketplace order
- `GET /api/v1/aqar/properties/:id/owner-statement` - Owner statement

---

## UI Components to Create

### Finance Dashboard (`app/finance/page.tsx` - ENHANCE)

- Key metrics: Total AR, Total AP, Cash balance, Monthly revenue
- Charts: Revenue trend, Expense breakdown, AR aging

### Chart of Accounts (`app/finance/chart-accounts/page.tsx`)

- Tree view of accounts hierarchy
- Add/Edit/Deactivate accounts
- Balance display per account

### Journal Entries (`app/finance/journals/page.tsx`)

- List journals with filters (date, status, type)
- Create manual journal entry
- Post/Reverse actions

### Reports (`app/finance/reports/`)

- Trial Balance
- Income Statement (P&L)
- Balance Sheet
- Cash Flow Statement
- AR Aging Report
- Owner Statements (property-specific)

---

## Migration Strategy

### Phase 1: Setup (Week 1)

1. Create all models with plugins (tenantIsolation + audit)
2. Create seed script for Chart of Accounts
3. Create postingService with balance validation
4. Run migration on staging environment

### Phase 2: Core Integration (Week 2)

1. Enhance invoiceService with GL posting
2. Create paymentService with journal creation
3. Create escrowService for deposits
4. Add event listeners for Aqar rent cycle

### Phase 3: Marketplace Integration (Week 3)

1. Add escrow to order creation
2. Implement settlement workflow with journal posting
3. Add commission calculation
4. Test end-to-end order → payment → settlement

### Phase 4: Reporting (Week 4)

1. Implement reportingService
2. Create financial statements
3. Add owner statement generation
4. Add AR aging report

---

## Testing Requirements

### Unit Tests

- Journal balance validation (debits = credits)
- Currency conversion with fxRate
- Reversal journal creation
- Escrow release logic

### Integration Tests

- Rent invoice → Payment → GL posting
- Work order expense → GL posting with dimensions
- Marketplace order → Escrow → Settlement → Vendor payout

### E2E Tests

- Complete rent cycle (lease → invoice → payment → owner payout)
- Complete marketplace order (create → pay → fulfill → settle)
- Financial reports generation with real data

---

## Configuration

### Environment Variables Required

```bash
FINANCE_ENABLE_AUTO_POSTING=true        # Auto-post journals on invoice/payment
FINANCE_BASE_CURRENCY=SAR               # Default currency
FINANCE_VAT_RATE=15                     # Saudi VAT rate (15%)
FINANCE_COMMISSION_RATE_AQAR=10         # Aqar commission (10%)
FINANCE_COMMISSION_RATE_MARKETPLACE=5   # Marketplace commission (5%)
FINANCE_FISCAL_YEAR_START=01-01         # Fiscal year start (Jan 1)
```

---

## Success Criteria

✅ Chart of Accounts seeded with Saudi market structure  
✅ All financial transactions create journal entries  
✅ Trial Balance balances (debits = credits)  
✅ Income Statement shows accurate revenue/expenses  
✅ Balance Sheet balances (Assets = Liabilities + Equity)  
✅ Owner statements generated correctly with rent/expenses  
✅ Marketplace escrow lifecycle works end-to-end  
✅ All journals have complete audit trail (who/when/what)  
✅ Multi-currency support working with FX rates  
✅ No breaking changes to existing invoice functionality

---

## Next Steps

1. Review this document with finance domain expert
2. Create `domain/finance/finance.behavior.ts` (similar to fm.behavior.ts)
3. Create all models in `server/models/finance/`
4. Create all services in `server/finance/`
5. Create seed script in `scripts/seed-chart-accounts.ts`
6. Create API routes in `app/api/v1/finance/`
7. Create UI pages in `app/finance/`
8. Write comprehensive tests
9. Run on staging environment
10. Deploy to production with migration plan
