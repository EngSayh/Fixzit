# Finance Module Architecture

**Module**: Finance (AR/AP/GL)
**Version**: 1.0.0
**Status**: In Development
**Branch**: feature/finance-module

---

## Overview

Comprehensive Finance module for Fixzit Property Management System with:
- **AR** (Accounts Receivable): Invoices, Payments, Credit Notes, Aging
- **AP** (Accounts Payable): Vendor Bills, Purchase Orders, Expenses
- **GL** (General Ledger): Budgets, Property Sub-ledgers, Owner Statements, Reports

All with RBAC integration and DoA (Delegation of Authority) approval workflows.

---

## Module Structure

### 1. Database Models (Mongoose)

#### AR Models
- **Invoice**: Tenant/Customer invoicing with line items, taxes, due dates
- **Payment**: Payment tracking, allocation to invoices, payment methods
- **CreditNote**: Credit notes for refunds, discounts, write-offs
- **AgingReport**: Automated aging analysis (30/60/90/120+ days)

#### AP Models
- **VendorBill**: Vendor invoices with approval workflow
- **PurchaseOrder**: PO creation, approval, receiving
- **Expense**: Expense tracking with categories, properties, cost centers

#### GL Models
- **Budget**: Annual/periodic budgets by property, category
- **LedgerEntry**: Double-entry accounting transactions
- **PropertyLedger**: Sub-ledger per property for detailed tracking
- **OwnerStatement**: Monthly statements for property owners

### 2. Services Layer

#### AR Services
- \services/finance/ar/invoice.service.ts\ - Invoice CRUD, PDF generation
- \services/finance/ar/payment.service.ts\ - Payment processing, allocation
- \services/finance/ar/aging.service.ts\ - Aging report generation

#### AP Services
- \services/finance/ap/bill.service.ts\ - Vendor bill management
- \services/finance/ap/purchase-order.service.ts\ - PO workflow
- \services/finance/ap/expense.service.ts\ - Expense tracking

#### GL Services
- \services/finance/gl/posting.service.ts\ - Journal entry posting
- \services/finance/gl/budget.service.ts\ - Budget management
- \services/finance/gl/reporting.service.ts\ - Financial reports

#### Approval Service
- \services/finance/approval.service.ts\ - DoA workflow engine

### 3. API Routes (Next.js App Router)

#### AR Endpoints
- \POST /api/finance/invoices\ - Create invoice
- \GET /api/finance/invoices\ - List invoices (filtered)
- \GET /api/finance/invoices/[id]\ - Invoice details
- \PATCH /api/finance/invoices/[id]\ - Update invoice
- \POST /api/finance/invoices/[id]/send\ - Send invoice to customer
- \POST /api/finance/payments\ - Record payment
- \GET /api/finance/aging\ - Aging report

#### AP Endpoints
- \POST /api/finance/bills\ - Create vendor bill
- \POST /api/finance/bills/[id]/approve\ - Approve bill (DoA)
- \POST /api/finance/purchase-orders\ - Create PO
- \POST /api/finance/expenses\ - Record expense

#### GL Endpoints
- \GET /api/finance/reports/pl\ - Profit & Loss
- \GET /api/finance/reports/balance-sheet\ - Balance Sheet
- \GET /api/finance/reports/cashflow\ - Cash Flow Statement
- \POST /api/finance/budgets\ - Create budget
- \GET /api/finance/owner-statements/[ownerId]\ - Owner statement

### 4. UI Components

#### AR Components
- \components/finance/ar/InvoiceForm.tsx\ - Invoice creation form
- \components/finance/ar/InvoiceList.tsx\ - Invoice table with filters
- \components/finance/ar/PaymentForm.tsx\ - Payment recording
- \components/finance/ar/AgingChart.tsx\ - Visual aging report

#### AP Components
- \components/finance/ap/BillForm.tsx\ - Vendor bill entry
- \components/finance/ap/ApprovalQueue.tsx\ - Bills pending approval
- \components/finance/ap/PurchaseOrderForm.tsx\ - PO creation

#### GL Components
- \components/finance/gl/BudgetManager.tsx\ - Budget planning
- \components/finance/gl/ReportViewer.tsx\ - Financial report viewer
- \components/finance/gl/OwnerStatement.tsx\ - Owner statement display

### 5. Pages

- \pp/finance/invoices/page.tsx\ - Invoice list page
- \pp/finance/invoices/new/page.tsx\ - Create invoice
- \pp/finance/invoices/[id]/page.tsx\ - Invoice details
- \pp/finance/payments/page.tsx\ - Payments list
- \pp/finance/bills/page.tsx\ - Vendor bills
- \pp/finance/expenses/page.tsx\ - Expense tracking
- \pp/finance/reports/page.tsx\ - Financial reports dashboard
- \pp/finance/budgets/page.tsx\ - Budget management

---

## Security & RBAC

### Roles & Permissions

\\	ypescript
enum FinancePermission {
  // AR
  INVOICE_CREATE = '''finance:invoice:create''',
  INVOICE_VIEW = '''finance:invoice:view''',
  INVOICE_EDIT = '''finance:invoice:edit''',
  PAYMENT_CREATE = '''finance:payment:create''',
  
  // AP
  BILL_CREATE = '''finance:bill:create''',
  BILL_APPROVE = '''finance:bill:approve''',
  PO_CREATE = '''finance:po:create''',
  
  // GL
  REPORT_VIEW = '''finance:report:view''',
  BUDGET_MANAGE = '''finance:budget:manage''',
}
\
### DoA (Delegation of Authority)

\\	ypescript
interface ApprovalRule {
  amount: number;
  requiredRole: Role;
  requiresMultipleApprovers?: boolean;
}

// Example: Bills >  require Manager approval
const DOA_RULES = {
  vendorBill: [
    { amount: 1000, requiredRole: Role.SUPERVISOR },
    { amount: 5000, requiredRole: Role.MANAGER },
    { amount: 25000, requiredRole: Role.ADMIN, requiresMultipleApprovers: true }
  ]
};
\
---

## Data Flow

### Invoice Creation Flow
1. User creates invoice via \InvoiceForm2. POST to \/api/finance/invoices3. \invoice.service.ts\ validates data
4. Create \Invoice\ model in MongoDB
5. Create \LedgerEntry\ (DR: Accounts Receivable, CR: Revenue)
6. Optional: Send email/PDF to customer
7. Return invoice with ID

### Payment Recording Flow
1. User records payment via \PaymentForm2. POST to \/api/finance/payments3. \payment.service.ts\ processes payment
4. Allocate to invoice(s)
5. Create \LedgerEntry\ (DR: Bank, CR: Accounts Receivable)
6. Update invoice status if fully paid

### Bill Approval Flow
1. User creates vendor bill
2. \pproval.service.ts\ checks DoA rules
3. If amount > threshold, route to approver queue
4. Approver sees bill in \ApprovalQueue5. Approver approves/rejects
6. If approved, create \LedgerEntry\ (DR: Expense, CR: Accounts Payable)

---

## Implementation Phases

### Phase 1: Models & Services (Current)
- Create all Mongoose models
- Implement service layer
- Unit tests for services

### Phase 2: API Routes
- Implement all endpoints
- Add RBAC middleware
- Integration tests

### Phase 3: UI Components
- Build reusable components
- Connect to API
- Component tests

### Phase 4: Pages & Navigation
- Create all pages
- Add to sidebar navigation
- E2E tests

### Phase 5: Reports & Analytics
- Implement report generation
- PDF export
- Charts and visualizations

---

**Next Steps**: Start Phase 1 - Create Mongoose models
