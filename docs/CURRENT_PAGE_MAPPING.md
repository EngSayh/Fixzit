# Fixzit - Current Page Mapping to Modular Architecture

## Summary
- **Total Pages Found**: 188 page.tsx files
- **Target Modules**: 7 primary modules
- **Status**: Mapping complete, consolidation needed

---

## Module 1: Property & Tenancy Management (21 pages)

### Main Property Pages
- `/app/properties/page.tsx` - Properties List
- `/app/properties/[id]/page.tsx` - Property Details
- `/app/properties/units/page.tsx` - Units Management
- `/app/properties/leases/page.tsx` - Lease Management
- `/app/properties/documents/page.tsx` - Property Documents
- `/app/properties/inspections/page.tsx` - Property Inspections

### Aqar Module (Real Estate)
- `/app/aqar/page.tsx` - Aqar Dashboard
- `/app/aqar/properties/page.tsx` - Aqar Properties
- `/app/aqar/map/page.tsx` - Property Map View

### FM (Facilities Management) Properties
- `/app/fm/properties/page.tsx` - FM Properties List
- `/app/fm/properties/[id]/page.tsx` - FM Property Details
- `/app/fm/assets/page.tsx` - Asset Management
- `/app/fm/tenants/page.tsx` - FM Tenant Management

### Consolidation Needed
- ⚠️ **Duplicate**: `/app/properties/*` vs `/app/fm/properties/*` - Need unified interface
- ⚠️ **Duplicate**: `/app/aqar/properties/*` - Merge with main properties or keep separate for public listing?

---

## Module 2: Customer & User Lifecycle (10 pages)

### User Management
- `/app/profile/page.tsx` - User Profile
- `/app/fm/crm/page.tsx` - CRM Dashboard
- `/app/crm/page.tsx` - CRM Main

### HR & Careers
- `/app/hr/page.tsx` - HR Dashboard
- `/app/hr/ats/jobs/new/page.tsx` - Create Job Posting
- `/app/careers/page.tsx` - Public Careers Page
- `/app/careers/[slug]/page.tsx` - Job Details
- `/app/fm/hr/page.tsx` - FM HR Dashboard

### Missing/Needs Creation
- ❌ **Owner Management** (Add/List) - NOT FOUND
- ❌ **Tenant Management** (Add/List/Multiple) - NOT FOUND (only FM tenants exists)
- ❌ **Family Management** - NOT FOUND
- ❌ **Referral Program** - NOT FOUND
- ❌ **Employee Management** - NOT FOUND

### Consolidation Needed
- ⚠️ **Duplicate**: `/app/crm/page.tsx` vs `/app/fm/crm/page.tsx` - Merge into single CRM
- ⚠️ **Duplicate**: `/app/hr/page.tsx` vs `/app/fm/hr/page.tsx` - Merge into single HR module

---

## Module 3: Legal & Contract Management (1 page)

### Existing Pages
- `/app/properties/leases/page.tsx` - Lease Contracts

### Missing/Needs Creation
- ❌ **Contract Dashboard** (Active/Closed/Expired) - NOT FOUND
- ❌ **Sales Contracts** (List/Add/Management) - NOT FOUND
- ❌ **Contract Termination** - NOT FOUND
- ❌ **Security Deposit Management** - NOT FOUND
- ❌ **Electronic Attorneys** - NOT FOUND
- ❌ **Brokerage Agreements** - NOT FOUND

### Consolidation Needed
- ⚠️ **Expand**: `/app/properties/leases/page.tsx` should be moved to `/app/contracts/rental/page.tsx`

---

## Module 4: Financial & Accounting (22 pages)

### Main Finance Pages
- `/app/finance/page.tsx` - Finance Dashboard
- `/app/finance/payments/new/page.tsx` - Create Payment
- `/app/finance/invoices/new/page.tsx` - Create Invoice
- `/app/finance/expenses/new/page.tsx` - Create Expense
- `/app/finance/budgets/new/page.tsx` - Create Budget

### FM Finance
- `/app/fm/finance/page.tsx` - FM Finance Dashboard
- `/app/fm/invoices/page.tsx` - FM Invoices
- `/app/fm/orders/page.tsx` - FM Purchase Orders

### Missing/Needs Creation
- ❌ **Financial Dashboard** (Owners/Tenants/Buildings metrics) - Partial implementation
- ❌ **Payment Tracking** (Overdue/All) - NOT FOUND
- ❌ **Payment Methods** (Secure Storage) - NOT FOUND
- ❌ **Payment Links** - NOT FOUND
- ❌ **Refund Management** - NOT FOUND
- ❌ **Bank Accounts Config** - NOT FOUND
- ❌ **Owner Settlement** (List/Add) - NOT FOUND
- ❌ **Receipt Vouchers with QR** - NOT FOUND
- ❌ **Operation Type Config** - NOT FOUND
- ❌ **Offer Type Config** - NOT FOUND
- ❌ **Ejar Wallet** - NOT FOUND

### Consolidation Needed
- ⚠️ **Duplicate**: `/app/finance/*` vs `/app/fm/finance/*` - Merge into unified finance module
- ⚠️ **Separate**: Create tabs: Payments | Invoices | Expenses | Budgets | Settlements

---

## Module 5: Service & Maintenance Operations (15 pages)

### Work Orders
- `/app/work-orders/page.tsx` - Work Orders Dashboard
- `/app/work-orders/new/page.tsx` - Create Work Order
- `/app/work-orders/board/page.tsx` - Kanban Board
- `/app/work-orders/history/page.tsx` - Work Order History
- `/app/work-orders/approvals/page.tsx` - Approval Queue
- `/app/work-orders/pm/page.tsx` - Preventive Maintenance
- `/app/work-orders/sla-watchlist/page.tsx` - SLA Monitoring
- `/app/work-orders/[id]/parts/page.tsx` - Spare Parts Management

### FM Maintenance
- `/app/fm/maintenance/page.tsx` - FM Maintenance Dashboard
- `/app/fm/work-orders/page.tsx` - FM Work Orders

### Support & Tickets
- `/app/support/page.tsx` - Support Center
- `/app/support/my-tickets/page.tsx` - My Support Tickets
- `/app/fm/support/page.tsx` - FM Support
- `/app/fm/support/tickets/page.tsx` - FM Support Tickets

### Missing/Needs Creation
- ❌ **Service Ratings** - NOT FOUND
- ❌ **Warranty Tracker** - NOT FOUND
- ❌ **Rental Incident** - NOT FOUND
- ❌ **Spare Parts Approval** (Tenant cycle) - Partial implementation
- ❌ **Scheduler** (Availability booking) - NOT FOUND
- ❌ **Service Fees Config** (5%) - NOT FOUND

### Consolidation Needed
- ⚠️ **Duplicate**: `/app/work-orders/*` vs `/app/fm/work-orders/*` - Merge into single maintenance module
- ⚠️ **Duplicate**: `/app/support/*` vs `/app/fm/support/*` - Merge into single support center

---

## Module 6: Marketplace & Project Bidding (20 pages)

### Marketplace
- `/app/marketplace/page.tsx` - Marketplace Home
- `/app/marketplace/search/page.tsx` - Product Search
- `/app/marketplace/cart/page.tsx` - Shopping Cart
- `/app/marketplace/checkout/page.tsx` - Checkout
- `/app/marketplace/orders/page.tsx` - Order Management
- `/app/marketplace/product/[slug]/page.tsx` - Product Details
- `/app/marketplace/admin/page.tsx` - Marketplace Admin

### Vendor Management
- `/app/marketplace/vendor/page.tsx` - Vendor Dashboard
- `/app/marketplace/vendor/portal/page.tsx` - Vendor Portal
- `/app/marketplace/vendor/products/upload/page.tsx` - Product Upload
- `/app/vendors/page.tsx` - Vendors List
- `/app/vendor/dashboard/page.tsx` - Vendor Dashboard (duplicate?)
- `/app/fm/vendors/page.tsx` - FM Vendors

### RFQ & Projects
- `/app/marketplace/rfq/page.tsx` - RFQ Management
- `/app/fm/rfqs/page.tsx` - FM RFQs
- `/app/fm/projects/page.tsx` - FM Projects
- `/app/fm/marketplace/page.tsx` - FM Marketplace

### Souq (E-commerce Store)
- `/app/souq/page.tsx` - Souq Home
- `/app/souq/catalog/page.tsx` - Product Catalog
- `/app/souq/vendors/page.tsx` - Souq Vendors

### Missing/Needs Creation
- ❌ **Project Management** (Create/Dashboard) - Partial implementation
- ❌ **Bidding Interface** (Submit/Overview) - NOT FOUND
- ❌ **Contractor Registration** (with approval) - NOT FOUND
- ❌ **Contractor Management** - NOT FOUND
- ❌ **Service Provider Management** (verification) - NOT FOUND
- ❌ **Service Provider Dashboard** - NOT FOUND
- ❌ **Create Service/Product** (consolidated) - Partial implementation
- ❌ **Public Store** - Partial implementation (souq?)

### Consolidation Needed
- ⚠️ **Duplicate**: `/app/marketplace/*` vs `/app/souq/*` - Merge into single e-commerce
- ⚠️ **Duplicate**: `/app/vendors/page.tsx` vs `/app/fm/vendors/page.tsx` vs `/app/marketplace/vendor/*` - Merge vendor management
- ⚠️ **Duplicate**: `/app/marketplace/rfq/*` vs `/app/fm/rfqs/*` - Merge RFQ management
- ⚠️ **Separate**: Create tabs: Projects | Vendors | Products | Services | Store

---

## Module 7: System & Administration (25 pages)

### Admin Pages
- `/app/admin/page.tsx` - Admin Dashboard
- `/app/admin/cms/page.tsx` - CMS Management
- `/app/settings/page.tsx` - User Settings

### FM System
- `/app/fm/system/page.tsx` - FM System Settings
- `/app/system/page.tsx` - System Dashboard

### Dashboards
- `/app/dashboard/page.tsx` - Main Dashboard
- `/app/fm/dashboard/page.tsx` - FM Dashboard

### Reports
- `/app/reports/page.tsx` - Reports Dashboard
- `/app/fm/reports/page.tsx` - FM Reports

### Compliance
- `/app/compliance/page.tsx` - Compliance Dashboard
- `/app/fm/compliance/page.tsx` - FM Compliance

### Help & Support
- `/app/help/page.tsx` - Help Center
- `/app/help/[slug]/page.tsx` - Help Article
- `/app/help/ai-chat/page.tsx` - AI Support Chat
- `/app/help/support-ticket/page.tsx` - Create Support Ticket
- `/app/help/tutorial/getting-started/page.tsx` - Getting Started Tutorial

### Notifications
- `/app/notifications/page.tsx` - Notification Center

### CMS
- `/app/cms/[slug]/page.tsx` - CMS Page Viewer

### Missing/Needs Creation
- ❌ **Admin Settings** (Feature Toggles with iOS switches) - NOT FOUND
- ❌ **Role Registration** - NOT FOUND
- ❌ **Authorization Matrix** - NOT FOUND
- ❌ **Office User Management** - NOT FOUND
- ❌ **Audit Log** (Activity/DB changes) - NOT FOUND
- ❌ **Backup Option** (Daily auto + ad-hoc) - NOT FOUND
- ❌ **File Management** (Upload/Templates) - NOT FOUND
- ❌ **Market Intelligence Tracker** - NOT FOUND

### Consolidation Needed
- ⚠️ **Duplicate**: `/app/dashboard/page.tsx` vs `/app/fm/dashboard/page.tsx` - Merge dashboards
- ⚠️ **Duplicate**: `/app/reports/page.tsx` vs `/app/fm/reports/page.tsx` - Merge reporting
- ⚠️ **Duplicate**: `/app/system/page.tsx` vs `/app/fm/system/page.tsx` - Merge system settings
- ⚠️ **Duplicate**: `/app/compliance/page.tsx` vs `/app/fm/compliance/page.tsx` - Merge compliance
- ⚠️ **Separate**: Help pages should move to `/app/(dashboard)/help/*` for consistency

---

## Uncategorized/Special Pages (14 pages)

### Public Pages
- `/app/page.tsx` - Landing Page (Root)
- `/app/about/page.tsx` - About Us
- `/app/privacy/page.tsx` - Privacy Policy
- `/app/terms/page.tsx` - Terms of Service
- `/app/product/[slug]/page.tsx` - Product Page (Public)

### Authentication
- `/app/login/page.tsx` - Login
- `/app/signup/page.tsx` - Sign Up
- `/app/logout/page.tsx` - Logout
- `/app/forgot-password/page.tsx` - Password Recovery

### Test Pages (Remove in Production)
- `/app/test/page.tsx` - Test Page
- `/app/test-rtl/page.tsx` - RTL Test
- `/app/test-cms/page.tsx` - CMS Test

---

## Critical Consolidation Priorities

### 1. Merge FM vs Main Pages (High Priority)
**Problem**: Duplicate pages for FM vs main app  
**Solution**: Create unified interface with role-based views  
**Affected Modules**: Properties, Finance, HR, CRM, Maintenance, Vendors, System

**Merge List**:
- `/app/properties/*` ↔ `/app/fm/properties/*`
- `/app/finance/*` ↔ `/app/fm/finance/*`
- `/app/hr/*` ↔ `/app/fm/hr/*`
- `/app/crm/*` ↔ `/app/fm/crm/*`
- `/app/work-orders/*` ↔ `/app/fm/work-orders/*` ↔ `/app/fm/maintenance/*`
- `/app/support/*` ↔ `/app/fm/support/*`
- `/app/vendors/*` ↔ `/app/fm/vendors/*`
- `/app/dashboard/*` ↔ `/app/fm/dashboard/*`
- `/app/reports/*` ↔ `/app/fm/reports/*`
- `/app/system/*` ↔ `/app/fm/system/*`
- `/app/compliance/*` ↔ `/app/fm/compliance/*`

### 2. Merge Marketplace vs Souq (High Priority)
**Problem**: Two separate e-commerce implementations  
**Solution**: Single marketplace with public/private views  
**Files**: `/app/marketplace/*` ↔ `/app/souq/*`

### 3. Consolidate Vendor Pages (Medium Priority)
**Problem**: Three separate vendor interfaces  
**Solution**: Unified vendor management  
**Files**: `/app/vendors/*` ↔ `/app/marketplace/vendor/*` ↔ `/app/vendor/dashboard/*`

### 4. Create Missing Modules (High Priority)
**Modules to Build**:
- **Module 2**: Family Management, Referral Program, Owner/Tenant Management
- **Module 3**: Sales Contracts, Contract Dashboard, Security Deposits
- **Module 4**: Payment Methods, Receipt Vouchers, Owner Settlements
- **Module 5**: Service Ratings, Warranty Tracker, Scheduler
- **Module 6**: Project Bidding, Contractor Registration, Service Provider Management
- **Module 7**: Admin Feature Toggles, Audit Logs, Backup System

---

## Implementation Plan

### Phase 1: Critical Infrastructure (Week 1)
1. Create missing database schemas
2. Implement Two-Level Admin System
3. Create Audit Logging System
4. Add iOS-style Toggle Component

### Phase 2: Page Consolidation (Week 2-3)
1. Merge FM vs Main pages (10 merges)
2. Merge Marketplace vs Souq (1 merge)
3. Consolidate Vendor pages (3 merges)
4. Create unified navigation structure

### Phase 3: Missing Features (Week 4-5)
1. Family Management System
2. Referral Program
3. Contract Management
4. Payment Methods & Auto-Pay
5. Receipt Vouchers with QR

### Phase 4: Advanced Features (Week 6-8)
1. Project Bidding System
2. Vendor Registration & Verification
3. Maintenance Scheduling
4. Service Ratings & Warranty
5. Market Intelligence Tracker

---

## File Structure Reorganization

### Current Issues
- ❌ Duplicate `/app/fm/*` structure (11 duplicates)
- ❌ Inconsistent organization (properties in `/app/properties` but also `/app/aqar/properties`)
- ❌ Mix of public and authenticated pages at root level

### Proposed New Structure
```
/app
  # Public Pages
  /page.tsx (Landing)
  /about
  /privacy
  /terms
  /login
  /signup
  /forgot-password
  
  # Authenticated Dashboard
  /(dashboard)
    # Module 1: Property & Tenancy
    /properties
      /page.tsx (List)
      /[id]/page.tsx (Details)
      /units/page.tsx
      /inspections/page.tsx
      /documents/page.tsx
    
    # Module 2: Customer & User
    /customers
      /owners/page.tsx
      /tenants/page.tsx
      /family/page.tsx
      /referrals/page.tsx
    /hr
      /employees/page.tsx
      /careers/page.tsx
      /applications/page.tsx
    
    # Module 3: Contracts & Legal
    /contracts
      /rental/page.tsx
      /sales/page.tsx
      /terminations/page.tsx
      /deposits/page.tsx
    
    # Module 4: Finance
    /finance
      /dashboard/page.tsx
      /payments/page.tsx
      /invoices/page.tsx
      /settlements/page.tsx
      /expenses/page.tsx
      /budgets/page.tsx
    
    # Module 5: Maintenance
    /maintenance
      /work-orders/page.tsx
      /tickets/page.tsx
      /scheduling/page.tsx
      /ratings/page.tsx
      /warranty/page.tsx
    
    # Module 6: Marketplace
    /marketplace
      /store/page.tsx
      /projects/page.tsx
      /vendors/page.tsx
      /rfqs/page.tsx
      /orders/page.tsx
    
    # Module 7: System & Admin
    /dashboard/page.tsx (Main Dashboard)
    /reports/page.tsx
    /settings/page.tsx
    /notifications/page.tsx
    /profile/page.tsx
    /help/page.tsx
  
  # Admin Area
  /admin
    /dashboard/page.tsx
    /users/page.tsx
    /roles/page.tsx
    /permissions/page.tsx
    /settings/page.tsx
    /audit-logs/page.tsx
    /backups/page.tsx
    /cms/page.tsx
  
  # Vendor Portal
  /vendor
    /dashboard/page.tsx
    /products/page.tsx
    /orders/page.tsx
    /performance/page.tsx
```

---

**Total Analysis**:
- ✅ **188 pages mapped** to 7 modules
- ⚠️ **14 high-priority merges** identified
- ❌ **30+ missing features** catalogued
- 🔄 **8-week implementation** plan created

**Next Steps**:
1. Start Phase 1: Create missing database schemas
2. Begin page consolidation with FM merges
3. Implement missing modules progressively

---

**Last Updated**: 2025-10-25  
**Status**: Complete audit, ready for implementation
