# Fixzit Module Structure Report

**Generated:** November 9, 2025  
**Purpose:** Complete module hierarchy with file references for code review

---

## 🏗️ Architecture Overview

### Core Architecture Files

- [`/workspaces/Fixzit/app/layout.tsx`](/workspaces/Fixzit/app/layout.tsx) - Root layout with providers
- [`/workspaces/Fixzit/components/ClientLayout.tsx`](/workspaces/Fixzit/components/ClientLayout.tsx) - Client-side layout logic
- [`/workspaces/Fixzit/middleware.ts`](/workspaces/Fixzit/middleware.ts) - Route protection & auth
- [`/workspaces/Fixzit/auth.config.ts`](/workspaces/Fixzit/auth.config.ts) - NextAuth configuration
- [`/workspaces/Fixzit/next.config.js`](/workspaces/Fixzit/next.config.js) - Next.js configuration

### Provider System

- [`/workspaces/Fixzit/providers/ConditionalProviders.tsx`](/workspaces/Fixzit/providers/ConditionalProviders.tsx) - Route-based provider selection
- [`/workspaces/Fixzit/providers/PublicProviders.tsx`](/workspaces/Fixzit/providers/PublicProviders.tsx) - Public page providers
- [`/workspaces/Fixzit/providers/AuthenticatedProviders.tsx`](/workspaces/Fixzit/providers/AuthenticatedProviders.tsx) - Protected page providers

---

## 📦 Main Modules

## 1. 🏠 **Landing & Public Pages**

### Public Routes

- [`/workspaces/Fixzit/app/page.tsx`](/workspaces/Fixzit/app/page.tsx) - Homepage
- [`/workspaces/Fixzit/app/about/page.tsx`](/workspaces/Fixzit/app/about/page.tsx) - About page
- [`/workspaces/Fixzit/app/privacy/page.tsx`](/workspaces/Fixzit/app/privacy/page.tsx) - Privacy policy
- [`/workspaces/Fixzit/app/terms/page.tsx`](/workspaces/Fixzit/app/terms/page.tsx) - Terms of service
- [`/workspaces/Fixzit/app/careers/page.tsx`](/workspaces/Fixzit/app/careers/page.tsx) - Careers listing
- [`/workspaces/Fixzit/app/careers/[slug]/page.tsx`](/workspaces/Fixzit/app/careers/[slug]/page.tsx) - Job details

### CMS Pages

- [`/workspaces/Fixzit/app/cms/[slug]/page.tsx`](/workspaces/Fixzit/app/cms/[slug]/page.tsx) - Dynamic CMS pages
- [`/workspaces/Fixzit/app/api/cms/pages/[slug]/route.ts`](/workspaces/Fixzit/app/api/cms/pages/[slug]/route.ts) - CMS API

---

## 2. 🔐 **Authentication Module**

### Auth Pages

- [`/workspaces/Fixzit/app/login/page.tsx`](/workspaces/Fixzit/app/login/page.tsx) - Login page
- [`/workspaces/Fixzit/app/signup/page.tsx`](/workspaces/Fixzit/app/signup/page.tsx) - Registration page
- [`/workspaces/Fixzit/app/logout/page.tsx`](/workspaces/Fixzit/app/logout/page.tsx) - Logout handler
- [`/workspaces/Fixzit/app/forgot-password/page.tsx`](/workspaces/Fixzit/app/forgot-password/page.tsx) - Password reset

### Auth API

- [`/workspaces/Fixzit/app/api/auth/[...nextauth]/route.ts`](/workspaces/Fixzit/app/api/auth/[...nextauth]/route.ts) - NextAuth handler
- [`/workspaces/Fixzit/app/api/auth/signup/route.ts`](/workspaces/Fixzit/app/api/auth/signup/route.ts) - User registration

### Auth Components

- [`/workspaces/Fixzit/components/auth/`](/workspaces/Fixzit/components/auth/) - Auth UI components

---

## 3. 🏢 **Facilities Management (FM) Module**

### FM Dashboard

- [`/workspaces/Fixzit/app/fm/page.tsx`](/workspaces/Fixzit/app/fm/page.tsx) - FM landing/selector
- [`/workspaces/Fixzit/app/fm/dashboard/page.tsx`](/workspaces/Fixzit/app/fm/dashboard/page.tsx) - FM dashboard

### 3.1 **Properties Management**

- [`/workspaces/Fixzit/app/fm/properties/page.tsx`](/workspaces/Fixzit/app/fm/properties/page.tsx) - Properties list
- [`/workspaces/Fixzit/app/fm/properties/[id]/page.tsx`](/workspaces/Fixzit/app/fm/properties/[id]/page.tsx) - Property details
- [`/workspaces/Fixzit/app/api/properties/route.ts`](/workspaces/Fixzit/app/api/properties/route.ts) - Properties API
- [`/workspaces/Fixzit/app/api/properties/[id]/route.ts`](/workspaces/Fixzit/app/api/properties/[id]/route.ts) - Property CRUD

**Models:**

- [`/workspaces/Fixzit/server/models/Property.ts`](/workspaces/Fixzit/server/models/Property.ts)
- [`/workspaces/Fixzit/server/models/Unit.ts`](/workspaces/Fixzit/server/models/Unit.ts)

### 3.2 **Work Orders**

- [`/workspaces/Fixzit/app/fm/work-orders/page.tsx`](/workspaces/Fixzit/app/fm/work-orders/page.tsx) - Work orders list
- [`/workspaces/Fixzit/app/work-orders/new/page.tsx`](/workspaces/Fixzit/app/work-orders/new/page.tsx) - Create work order
- [`/workspaces/Fixzit/app/work-orders/board/page.tsx`](/workspaces/Fixzit/app/work-orders/board/page.tsx) - Kanban board
- [`/workspaces/Fixzit/app/work-orders/pm/page.tsx`](/workspaces/Fixzit/app/work-orders/pm/page.tsx) - Preventive maintenance
- [`/workspaces/Fixzit/app/work-orders/sla-watchlist/page.tsx`](/workspaces/Fixzit/app/work-orders/sla-watchlist/page.tsx) - SLA monitoring

**APIs:**

- [`/workspaces/Fixzit/app/api/work-orders/route.ts`](/workspaces/Fixzit/app/api/work-orders/route.ts) - Work order CRUD
- [`/workspaces/Fixzit/app/api/work-orders/[id]/route.ts`](/workspaces/Fixzit/app/api/work-orders/[id]/route.ts) - Single work order
- [`/workspaces/Fixzit/app/api/work-orders/[id]/assign/route.ts`](/workspaces/Fixzit/app/api/work-orders/[id]/assign/route.ts) - Assignment
- [`/workspaces/Fixzit/app/api/work-orders/[id]/status/route.ts`](/workspaces/Fixzit/app/api/work-orders/[id]/status/route.ts) - Status updates
- [`/workspaces/Fixzit/app/api/work-orders/[id]/comments/route.ts`](/workspaces/Fixzit/app/api/work-orders/[id]/comments/route.ts) - Comments
- [`/workspaces/Fixzit/app/api/work-orders/[id]/materials/route.ts`](/workspaces/Fixzit/app/api/work-orders/[id]/materials/route.ts) - Materials
- [`/workspaces/Fixzit/app/api/work-orders/[id]/checklists/route.ts`](/workspaces/Fixzit/app/api/work-orders/[id]/checklists/route.ts) - Checklists
- [`/workspaces/Fixzit/app/api/work-orders/sla-check/route.ts`](/workspaces/Fixzit/app/api/work-orders/sla-check/route.ts) - SLA monitoring
- [`/workspaces/Fixzit/app/api/work-orders/export/route.ts`](/workspaces/Fixzit/app/api/work-orders/export/route.ts) - Export data

**Models:**

- [`/workspaces/Fixzit/server/models/WorkOrder.ts`](/workspaces/Fixzit/server/models/WorkOrder.ts)
- [`/workspaces/Fixzit/server/models/WorkOrderComment.ts`](/workspaces/Fixzit/server/models/WorkOrderComment.ts)

### 3.3 **Asset Management**

- [`/workspaces/Fixzit/app/fm/assets/page.tsx`](/workspaces/Fixzit/app/fm/assets/page.tsx) - Asset tracking
- [`/workspaces/Fixzit/app/api/assets/route.ts`](/workspaces/Fixzit/app/api/assets/route.ts) - Asset CRUD
- [`/workspaces/Fixzit/app/api/assets/[id]/route.ts`](/workspaces/Fixzit/app/api/assets/[id]/route.ts) - Single asset

**Models:**

- [`/workspaces/Fixzit/server/models/Asset.ts`](/workspaces/Fixzit/server/models/Asset.ts)

### 3.4 **Preventive Maintenance**

- [`/workspaces/Fixzit/app/api/pm/plans/route.ts`](/workspaces/Fixzit/app/api/pm/plans/route.ts) - PM plans
- [`/workspaces/Fixzit/app/api/pm/plans/[id]/route.ts`](/workspaces/Fixzit/app/api/pm/plans/[id]/route.ts) - Single PM plan
- [`/workspaces/Fixzit/app/api/pm/generate-wos/route.ts`](/workspaces/Fixzit/app/api/pm/generate-wos/route.ts) - Auto-generate WOs

### 3.5 **Tenants Management**

- [`/workspaces/Fixzit/app/fm/tenants/page.tsx`](/workspaces/Fixzit/app/fm/tenants/page.tsx) - Tenants list
- [`/workspaces/Fixzit/app/api/tenants/route.ts`](/workspaces/Fixzit/app/api/tenants/route.ts) - Tenant CRUD
- [`/workspaces/Fixzit/app/api/tenants/[id]/route.ts`](/workspaces/Fixzit/app/api/tenants/[id]/route.ts) - Single tenant

**Models:**

- [`/workspaces/Fixzit/server/models/Tenant.ts`](/workspaces/Fixzit/server/models/Tenant.ts)

### 3.6 **Vendors Management**

- [`/workspaces/Fixzit/app/fm/vendors/page.tsx`](/workspaces/Fixzit/app/fm/vendors/page.tsx) - Vendors list
- [`/workspaces/Fixzit/app/fm/vendors/[id]/page.tsx`](/workspaces/Fixzit/app/fm/vendors/[id]/page.tsx) - Vendor details
- [`/workspaces/Fixzit/app/fm/vendors/[id]/edit/page.tsx`](/workspaces/Fixzit/app/fm/vendors/[id]/edit/page.tsx) - Edit vendor
- [`/workspaces/Fixzit/app/api/vendors/route.ts`](/workspaces/Fixzit/app/api/vendors/route.ts) - Vendor CRUD
- [`/workspaces/Fixzit/app/api/vendors/[id]/route.ts`](/workspaces/Fixzit/app/api/vendors/[id]/route.ts) - Single vendor

**Models:**

- [`/workspaces/Fixzit/server/models/Vendor.ts`](/workspaces/Fixzit/server/models/Vendor.ts)

### 3.7 **RFQ (Request for Quotation)**

- [`/workspaces/Fixzit/app/fm/rfqs/page.tsx`](/workspaces/Fixzit/app/fm/rfqs/page.tsx) - RFQ management
- [`/workspaces/Fixzit/app/api/rfqs/route.ts`](/workspaces/Fixzit/app/api/rfqs/route.ts) - RFQ CRUD
- [`/workspaces/Fixzit/app/api/rfqs/[id]/bids/route.ts`](/workspaces/Fixzit/app/api/rfqs/[id]/bids/route.ts) - Bid management
- [`/workspaces/Fixzit/app/api/rfqs/[id]/publish/route.ts`](/workspaces/Fixzit/app/api/rfqs/[id]/publish/route.ts) - Publish RFQ

**Models:**

- [`/workspaces/Fixzit/server/models/RFQ.ts`](/workspaces/Fixzit/server/models/RFQ.ts)
- [`/workspaces/Fixzit/server/models/Bid.ts`](/workspaces/Fixzit/server/models/Bid.ts)

### 3.8 **Projects**

- [`/workspaces/Fixzit/app/fm/projects/page.tsx`](/workspaces/Fixzit/app/fm/projects/page.tsx) - Projects list
- [`/workspaces/Fixzit/app/api/projects/route.ts`](/workspaces/Fixzit/app/api/projects/route.ts) - Project CRUD
- [`/workspaces/Fixzit/app/api/projects/[id]/route.ts`](/workspaces/Fixzit/app/api/projects/[id]/route.ts) - Single project

**Models:**

- [`/workspaces/Fixzit/server/models/Project.ts`](/workspaces/Fixzit/server/models/Project.ts)

---

## 4. 💰 **Finance Module**

### Finance Pages

- [`/workspaces/Fixzit/app/finance/page.tsx`](/workspaces/Fixzit/app/finance/page.tsx) - Finance dashboard
- [`/workspaces/Fixzit/app/fm/finance/page.tsx`](/workspaces/Fixzit/app/fm/finance/page.tsx) - FM Finance view

### 4.1 **Accounts**

- [`/workspaces/Fixzit/app/api/finance/accounts/route.ts`](/workspaces/Fixzit/app/api/finance/accounts/route.ts) - Chart of accounts
- [`/workspaces/Fixzit/app/api/finance/accounts/[id]/route.ts`](/workspaces/Fixzit/app/api/finance/accounts/[id]/route.ts) - Single account

### 4.2 **Invoices**

- [`/workspaces/Fixzit/app/finance/invoices/new/page.tsx`](/workspaces/Fixzit/app/finance/invoices/new/page.tsx) - Create invoice
- [`/workspaces/Fixzit/app/fm/invoices/page.tsx`](/workspaces/Fixzit/app/fm/invoices/page.tsx) - Invoice list
- [`/workspaces/Fixzit/app/api/finance/invoices/route.ts`](/workspaces/Fixzit/app/api/finance/invoices/route.ts) - Invoice CRUD
- [`/workspaces/Fixzit/app/api/finance/invoices/[id]/route.ts`](/workspaces/Fixzit/app/api/finance/invoices/[id]/route.ts) - Single invoice

**Models:**

- [`/workspaces/Fixzit/server/models/Invoice.ts`](/workspaces/Fixzit/server/models/Invoice.ts)

### 4.3 **Payments**

- [`/workspaces/Fixzit/app/finance/payments/new/page.tsx`](/workspaces/Fixzit/app/finance/payments/new/page.tsx) - Create payment
- [`/workspaces/Fixzit/app/api/finance/payments/route.ts`](/workspaces/Fixzit/app/api/finance/payments/route.ts) - Payment CRUD
- [`/workspaces/Fixzit/app/api/finance/payments/[id]/[action]/route.ts`](/workspaces/Fixzit/app/api/finance/payments/[id]/[action]/route.ts) - Payment actions

**Models:**

- [`/workspaces/Fixzit/server/models/Payment.ts`](/workspaces/Fixzit/server/models/Payment.ts)

### 4.4 **Expenses**

- [`/workspaces/Fixzit/app/finance/expenses/new/page.tsx`](/workspaces/Fixzit/app/finance/expenses/new/page.tsx) - Create expense
- [`/workspaces/Fixzit/app/api/finance/expenses/route.ts`](/workspaces/Fixzit/app/api/finance/expenses/route.ts) - Expense CRUD
- [`/workspaces/Fixzit/app/api/finance/expenses/[id]/route.ts`](/workspaces/Fixzit/app/api/finance/expenses/[id]/route.ts) - Single expense
- [`/workspaces/Fixzit/app/api/finance/expenses/[id]/[action]/route.ts`](/workspaces/Fixzit/app/api/finance/expenses/[id]/[action]/route.ts) - Expense actions

### 4.5 **Journals & Ledger**

- [`/workspaces/Fixzit/app/api/finance/journals/route.ts`](/workspaces/Fixzit/app/api/finance/journals/route.ts) - Journal entries
- [`/workspaces/Fixzit/app/api/finance/journals/[id]/post/route.ts`](/workspaces/Fixzit/app/api/finance/journals/[id]/post/route.ts) - Post journal
- [`/workspaces/Fixzit/app/api/finance/journals/[id]/void/route.ts`](/workspaces/Fixzit/app/api/finance/journals/[id]/void/route.ts) - Void journal
- [`/workspaces/Fixzit/app/api/finance/ledger/route.ts`](/workspaces/Fixzit/app/api/finance/ledger/route.ts) - General ledger
- [`/workspaces/Fixzit/app/api/finance/ledger/trial-balance/route.ts`](/workspaces/Fixzit/app/api/finance/ledger/trial-balance/route.ts) - Trial balance
- [`/workspaces/Fixzit/app/api/finance/ledger/account-activity/[accountId]/route.ts`](/workspaces/Fixzit/app/api/finance/ledger/account-activity/[accountId]/route.ts) - Account activity

### 4.6 **Budgets**

- [`/workspaces/Fixzit/app/finance/budgets/new/page.tsx`](/workspaces/Fixzit/app/finance/budgets/new/page.tsx) - Create budget

**Models:**

- [`/workspaces/Fixzit/server/models/finance/`](/workspaces/Fixzit/server/models/finance/) - Finance models directory

---

## 5. 👥 **HR Module**

### HR Pages

- [`/workspaces/Fixzit/app/hr/page.tsx`](/workspaces/Fixzit/app/hr/page.tsx) - HR dashboard
- [`/workspaces/Fixzit/app/hr/layout.tsx`](/workspaces/Fixzit/app/hr/layout.tsx) - HR layout

### 5.1 **Employees**

- [`/workspaces/Fixzit/app/hr/employees/page.tsx`](/workspaces/Fixzit/app/hr/employees/page.tsx) - Employee list
- [`/workspaces/Fixzit/app/api/hr/employees/route.ts`](/workspaces/Fixzit/app/api/hr/employees/route.ts) - Employee CRUD

**Models:**

- [`/workspaces/Fixzit/server/models/Employee.ts`](/workspaces/Fixzit/server/models/Employee.ts)

### 5.2 **Payroll**

- [`/workspaces/Fixzit/app/hr/payroll/page.tsx`](/workspaces/Fixzit/app/hr/payroll/page.tsx) - Payroll management
- [`/workspaces/Fixzit/app/api/hr/payroll/runs/route.ts`](/workspaces/Fixzit/app/api/hr/payroll/runs/route.ts) - Payroll runs
- [`/workspaces/Fixzit/app/api/hr/payroll/runs/[id]/calculate/route.ts`](/workspaces/Fixzit/app/api/hr/payroll/runs/[id]/calculate/route.ts) - Calculate payroll
- [`/workspaces/Fixzit/app/api/hr/payroll/runs/[id]/export/wps/route.ts`](/workspaces/Fixzit/app/api/hr/payroll/runs/[id]/export/wps/route.ts) - WPS export

### 5.3 **ATS (Applicant Tracking)**

- [`/workspaces/Fixzit/app/hr/ats/jobs/new/page.tsx`](/workspaces/Fixzit/app/hr/ats/jobs/new/page.tsx) - Post job
- [`/workspaces/Fixzit/app/api/ats/jobs/route.ts`](/workspaces/Fixzit/app/api/ats/jobs/route.ts) - Job postings
- [`/workspaces/Fixzit/app/api/ats/jobs/[id]/apply/route.ts`](/workspaces/Fixzit/app/api/ats/jobs/[id]/apply/route.ts) - Job application
- [`/workspaces/Fixzit/app/api/ats/jobs/[id]/publish/route.ts`](/workspaces/Fixzit/app/api/ats/jobs/[id]/publish/route.ts) - Publish job
- [`/workspaces/Fixzit/app/api/ats/applications/[id]/route.ts`](/workspaces/Fixzit/app/api/ats/applications/[id]/route.ts) - Application details
- [`/workspaces/Fixzit/app/api/ats/convert-to-employee/route.ts`](/workspaces/Fixzit/app/api/ats/convert-to-employee/route.ts) - Hire candidate
- [`/workspaces/Fixzit/app/api/ats/moderation/route.ts`](/workspaces/Fixzit/app/api/ats/moderation/route.ts) - Application moderation

**Models:**

- [`/workspaces/Fixzit/server/models/hr/`](/workspaces/Fixzit/server/models/hr/) - HR models directory

---

## 6. 🏘️ **Aqar (Real Estate) Module**

### Aqar Pages

- [`/workspaces/Fixzit/app/aqar/page.tsx`](/workspaces/Fixzit/app/aqar/page.tsx) - Property listings
- [`/workspaces/Fixzit/app/aqar/layout.tsx`](/workspaces/Fixzit/app/aqar/layout.tsx) - Aqar layout
- [`/workspaces/Fixzit/app/aqar/map/page.tsx`](/workspaces/Fixzit/app/aqar/map/page.tsx) - Map view
- [`/workspaces/Fixzit/app/aqar/filters/page.tsx`](/workspaces/Fixzit/app/aqar/filters/page.tsx) - Advanced filters
- [`/workspaces/Fixzit/app/aqar/properties/page.tsx`](/workspaces/Fixzit/app/aqar/properties/page.tsx) - Property grid

### Aqar APIs

- [`/workspaces/Fixzit/app/api/aqar/listings/route.ts`](/workspaces/Fixzit/app/api/aqar/listings/route.ts) - Listing CRUD
- [`/workspaces/Fixzit/app/api/aqar/listings/[id]/route.ts`](/workspaces/Fixzit/app/api/aqar/listings/[id]/route.ts) - Single listing
- [`/workspaces/Fixzit/app/api/aqar/listings/search/route.ts`](/workspaces/Fixzit/app/api/aqar/listings/search/route.ts) - Search listings
- [`/workspaces/Fixzit/app/api/aqar/map/route.ts`](/workspaces/Fixzit/app/api/aqar/map/route.ts) - Map data
- [`/workspaces/Fixzit/app/api/aqar/favorites/route.ts`](/workspaces/Fixzit/app/api/aqar/favorites/route.ts) - Favorites
- [`/workspaces/Fixzit/app/api/aqar/favorites/[id]/route.ts`](/workspaces/Fixzit/app/api/aqar/favorites/[id]/route.ts) - Toggle favorite
- [`/workspaces/Fixzit/app/api/aqar/leads/route.ts`](/workspaces/Fixzit/app/api/aqar/leads/route.ts) - Lead management
- [`/workspaces/Fixzit/app/api/aqar/packages/route.ts`](/workspaces/Fixzit/app/api/aqar/packages/route.ts) - Subscription packages

**Models:**

- [`/workspaces/Fixzit/server/models/aqar/`](/workspaces/Fixzit/server/models/aqar/) - Aqar models directory
- [`/workspaces/Fixzit/server/models/aqar/PropertyListing.ts`](/workspaces/Fixzit/server/models/aqar/PropertyListing.ts)
- [`/workspaces/Fixzit/server/models/aqar/RealEstateAgent.ts`](/workspaces/Fixzit/server/models/aqar/RealEstateAgent.ts)

---

## 7. 🛒 **Marketplace (Souq) Module**

### Marketplace Pages

- [`/workspaces/Fixzit/app/marketplace/page.tsx`](/workspaces/Fixzit/app/marketplace/page.tsx) - Marketplace home
- [`/workspaces/Fixzit/app/marketplace/layout.tsx`](/workspaces/Fixzit/app/marketplace/layout.tsx) - Marketplace layout
- [`/workspaces/Fixzit/app/marketplace/search/page.tsx`](/workspaces/Fixzit/app/marketplace/search/page.tsx) - Search products
- [`/workspaces/Fixzit/app/marketplace/product/[slug]/page.tsx`](/workspaces/Fixzit/app/marketplace/product/[slug]/page.tsx) - Product details
- [`/workspaces/Fixzit/app/marketplace/cart/page.tsx`](/workspaces/Fixzit/app/marketplace/cart/page.tsx) - Shopping cart
- [`/workspaces/Fixzit/app/marketplace/checkout/page.tsx`](/workspaces/Fixzit/app/marketplace/checkout/page.tsx) - Checkout
- [`/workspaces/Fixzit/app/marketplace/orders/page.tsx`](/workspaces/Fixzit/app/marketplace/orders/page.tsx) - Order history
- [`/workspaces/Fixzit/app/marketplace/rfq/page.tsx`](/workspaces/Fixzit/app/marketplace/rfq/page.tsx) - RFQ submission

### Souq (Arabic) Pages

- [`/workspaces/Fixzit/app/souq/page.tsx`](/workspaces/Fixzit/app/souq/page.tsx) - Souq home
- [`/workspaces/Fixzit/app/souq/layout.tsx`](/workspaces/Fixzit/app/souq/layout.tsx) - Souq layout
- [`/workspaces/Fixzit/app/souq/catalog/page.tsx`](/workspaces/Fixzit/app/souq/catalog/page.tsx) - Product catalog
- [`/workspaces/Fixzit/app/souq/vendors/page.tsx`](/workspaces/Fixzit/app/souq/vendors/page.tsx) - Vendor directory

### Vendor Portal

- [`/workspaces/Fixzit/app/marketplace/vendor/page.tsx`](/workspaces/Fixzit/app/marketplace/vendor/page.tsx) - Vendor dashboard
- [`/workspaces/Fixzit/app/marketplace/vendor/portal/page.tsx`](/workspaces/Fixzit/app/marketplace/vendor/portal/page.tsx) - Vendor management
- [`/workspaces/Fixzit/app/marketplace/vendor/products/upload/page.tsx`](/workspaces/Fixzit/app/marketplace/vendor/products/upload/page.tsx) - Upload products

### Marketplace APIs

- [`/workspaces/Fixzit/app/api/marketplace/products/route.ts`](/workspaces/Fixzit/app/api/marketplace/products/route.ts) - Product CRUD
- [`/workspaces/Fixzit/app/api/marketplace/products/[slug]/route.ts`](/workspaces/Fixzit/app/api/marketplace/products/[slug]/route.ts) - Single product
- [`/workspaces/Fixzit/app/api/marketplace/categories/route.ts`](/workspaces/Fixzit/app/api/marketplace/categories/route.ts) - Categories
- [`/workspaces/Fixzit/app/api/marketplace/cart/route.ts`](/workspaces/Fixzit/app/api/marketplace/cart/route.ts) - Cart management
- [`/workspaces/Fixzit/app/api/marketplace/checkout/route.ts`](/workspaces/Fixzit/app/api/marketplace/checkout/route.ts) - Checkout process
- [`/workspaces/Fixzit/app/api/marketplace/orders/route.ts`](/workspaces/Fixzit/app/api/marketplace/orders/route.ts) - Order management
- [`/workspaces/Fixzit/app/api/marketplace/search/route.ts`](/workspaces/Fixzit/app/api/marketplace/search/route.ts) - Product search
- [`/workspaces/Fixzit/app/api/marketplace/rfq/route.ts`](/workspaces/Fixzit/app/api/marketplace/rfq/route.ts) - RFQ handling
- [`/workspaces/Fixzit/app/api/marketplace/vendor/products/route.ts`](/workspaces/Fixzit/app/api/marketplace/vendor/products/route.ts) - Vendor products

**Models:**

- [`/workspaces/Fixzit/server/models/marketplace/`](/workspaces/Fixzit/server/models/marketplace/) - Marketplace models

---

## 8. 🤝 **CRM Module**

### CRM Pages

- [`/workspaces/Fixzit/app/crm/page.tsx`](/workspaces/Fixzit/app/crm/page.tsx) - CRM dashboard
- [`/workspaces/Fixzit/app/fm/crm/page.tsx`](/workspaces/Fixzit/app/fm/crm/page.tsx) - FM CRM view

**Models:**

- [`/workspaces/Fixzit/server/models/Customer.ts`](/workspaces/Fixzit/server/models/Customer.ts)
- [`/workspaces/Fixzit/server/models/Lead.ts`](/workspaces/Fixzit/server/models/Lead.ts)

---

## 9. 🔧 **Admin Module**

### Admin Pages

- [`/workspaces/Fixzit/app/admin/page.tsx`](/workspaces/Fixzit/app/admin/page.tsx) - Admin dashboard
- [`/workspaces/Fixzit/app/admin/audit-logs/page.tsx`](/workspaces/Fixzit/app/admin/audit-logs/page.tsx) - Audit logs
- [`/workspaces/Fixzit/app/admin/cms/page.tsx`](/workspaces/Fixzit/app/admin/cms/page.tsx) - CMS management
- [`/workspaces/Fixzit/app/admin/feature-settings/page.tsx`](/workspaces/Fixzit/app/admin/feature-settings/page.tsx) - Feature flags
- [`/workspaces/Fixzit/app/marketplace/admin/page.tsx`](/workspaces/Fixzit/app/marketplace/admin/page.tsx) - Marketplace admin

### Admin APIs

- [`/workspaces/Fixzit/app/api/admin/users/route.ts`](/workspaces/Fixzit/app/api/admin/users/route.ts) - User management
- [`/workspaces/Fixzit/app/api/admin/users/[id]/route.ts`](/workspaces/Fixzit/app/api/admin/users/[id]/route.ts) - Single user
- [`/workspaces/Fixzit/app/api/admin/audit-logs/route.ts`](/workspaces/Fixzit/app/api/admin/audit-logs/route.ts) - Audit log API
- [`/workspaces/Fixzit/app/api/admin/discounts/route.ts`](/workspaces/Fixzit/app/api/admin/discounts/route.ts) - Discount management
- [`/workspaces/Fixzit/app/api/admin/price-tiers/route.ts`](/workspaces/Fixzit/app/api/admin/price-tiers/route.ts) - Pricing tiers

### Billing Admin

- [`/workspaces/Fixzit/app/api/admin/billing/pricebooks/route.ts`](/workspaces/Fixzit/app/api/admin/billing/pricebooks/route.ts) - Price books
- [`/workspaces/Fixzit/app/api/admin/billing/pricebooks/[id]/route.ts`](/workspaces/Fixzit/app/api/admin/billing/pricebooks/[id]/route.ts) - Single price book
- [`/workspaces/Fixzit/app/api/admin/billing/benchmark/route.ts`](/workspaces/Fixzit/app/api/admin/billing/benchmark/route.ts) - Benchmarks
- [`/workspaces/Fixzit/app/api/admin/billing/annual-discount/route.ts`](/workspaces/Fixzit/app/api/admin/billing/annual-discount/route.ts) - Annual discounts

---

## 10. 💳 **Billing & Payments**

### Payment Pages

- [`/workspaces/Fixzit/app/api/billing/subscribe/route.ts`](/workspaces/Fixzit/app/api/billing/subscribe/route.ts) - Subscription
- [`/workspaces/Fixzit/app/api/billing/quote/route.ts`](/workspaces/Fixzit/app/api/billing/quote/route.ts) - Get quote
- [`/workspaces/Fixzit/app/api/billing/charge-recurring/route.ts`](/workspaces/Fixzit/app/api/billing/charge-recurring/route.ts) - Recurring charges

### Payment Gateway (PayTabs)

- [`/workspaces/Fixzit/app/api/payments/paytabs/route.ts`](/workspaces/Fixzit/app/api/payments/paytabs/route.ts) - PayTabs integration
- [`/workspaces/Fixzit/app/api/payments/paytabs/callback/route.ts`](/workspaces/Fixzit/app/api/payments/paytabs/callback/route.ts) - Payment callback
- [`/workspaces/Fixzit/app/api/paytabs/callback/route.ts`](/workspaces/Fixzit/app/api/paytabs/callback/route.ts) - PayTabs webhook
- [`/workspaces/Fixzit/app/api/paytabs/return/route.ts`](/workspaces/Fixzit/app/api/paytabs/return/route.ts) - Return URL
- [`/workspaces/Fixzit/app/api/billing/callback/paytabs/route.ts`](/workspaces/Fixzit/app/api/billing/callback/paytabs/route.ts) - Billing callback

### Checkout

- [`/workspaces/Fixzit/app/api/checkout/session/route.ts`](/workspaces/Fixzit/app/api/checkout/session/route.ts) - Checkout session
- [`/workspaces/Fixzit/app/api/checkout/quote/route.ts`](/workspaces/Fixzit/app/api/checkout/quote/route.ts) - Checkout quote
- [`/workspaces/Fixzit/app/api/checkout/complete/route.ts`](/workspaces/Fixzit/app/api/checkout/complete/route.ts) - Complete order

**Services:**

- [`/workspaces/Fixzit/services/paytabs.ts`](/workspaces/Fixzit/services/paytabs.ts) - PayTabs service

---

## 11. 🎫 **Support & Help**

### Support Pages

- [`/workspaces/Fixzit/app/support/page.tsx`](/workspaces/Fixzit/app/support/page.tsx) - Support center
- [`/workspaces/Fixzit/app/support/my-tickets/page.tsx`](/workspaces/Fixzit/app/support/my-tickets/page.tsx) - My tickets
- [`/workspaces/Fixzit/app/fm/support/page.tsx`](/workspaces/Fixzit/app/fm/support/page.tsx) - FM support
- [`/workspaces/Fixzit/app/fm/support/tickets/page.tsx`](/workspaces/Fixzit/app/fm/support/tickets/page.tsx) - Ticket management

### Help Center

- [`/workspaces/Fixzit/app/help/page.tsx`](/workspaces/Fixzit/app/help/page.tsx) - Help center home
- [`/workspaces/Fixzit/app/help/[slug]/page.tsx`](/workspaces/Fixzit/app/help/[slug]/page.tsx) - Help articles
- [`/workspaces/Fixzit/app/help/ai-chat/page.tsx`](/workspaces/Fixzit/app/help/ai-chat/page.tsx) - AI assistant
- [`/workspaces/Fixzit/app/help/support-ticket/page.tsx`](/workspaces/Fixzit/app/help/support-ticket/page.tsx) - Create ticket
- [`/workspaces/Fixzit/app/help/tutorial/getting-started/page.tsx`](/workspaces/Fixzit/app/help/tutorial/getting-started/page.tsx) - Getting started

### Support APIs

- [`/workspaces/Fixzit/app/api/support/tickets/route.ts`](/workspaces/Fixzit/app/api/support/tickets/route.ts) - Ticket CRUD
- [`/workspaces/Fixzit/app/api/support/tickets/[id]/route.ts`](/workspaces/Fixzit/app/api/support/tickets/[id]/route.ts) - Single ticket
- [`/workspaces/Fixzit/app/api/support/tickets/[id]/reply/route.ts`](/workspaces/Fixzit/app/api/support/tickets/[id]/reply/route.ts) - Reply to ticket
- [`/workspaces/Fixzit/app/api/support/tickets/my/route.ts`](/workspaces/Fixzit/app/api/support/tickets/my/route.ts) - My tickets
- [`/workspaces/Fixzit/app/api/support/incidents/route.ts`](/workspaces/Fixzit/app/api/support/incidents/route.ts) - Incident reporting
- [`/workspaces/Fixzit/app/api/help/articles/route.ts`](/workspaces/Fixzit/app/api/help/articles/route.ts) - Help articles
- [`/workspaces/Fixzit/app/api/help/articles/[id]/route.ts`](/workspaces/Fixzit/app/api/help/articles/[id]/route.ts) - Single article
- [`/workspaces/Fixzit/app/api/help/ask/route.ts`](/workspaces/Fixzit/app/api/help/ask/route.ts) - AI Q&A

---

## 12. 🤖 **AI & Copilot**

### Copilot APIs

- [`/workspaces/Fixzit/app/api/copilot/chat/route.ts`](/workspaces/Fixzit/app/api/copilot/chat/route.ts) - AI chat
- [`/workspaces/Fixzit/app/api/copilot/knowledge/route.ts`](/workspaces/Fixzit/app/api/copilot/knowledge/route.ts) - Knowledge base
- [`/workspaces/Fixzit/app/api/copilot/profile/route.ts`](/workspaces/Fixzit/app/api/copilot/profile/route.ts) - User profile

### AI Assistant

- [`/workspaces/Fixzit/app/api/assistant/query/route.ts`](/workspaces/Fixzit/app/api/assistant/query/route.ts) - AI queries

### Knowledge Base

- [`/workspaces/Fixzit/app/api/kb/search/route.ts`](/workspaces/Fixzit/app/api/kb/search/route.ts) - KB search
- [`/workspaces/Fixzit/app/api/kb/ingest/route.ts`](/workspaces/Fixzit/app/api/kb/ingest/route.ts) - KB ingestion

**Components:**

- [`/workspaces/Fixzit/components/CopilotWidget.tsx`](/workspaces/Fixzit/components/CopilotWidget.tsx) - Copilot UI

---

## 13. 📊 **Reports & Analytics**

### Reports Pages

- [`/workspaces/Fixzit/app/reports/page.tsx`](/workspaces/Fixzit/app/reports/page.tsx) - Reports dashboard
- [`/workspaces/Fixzit/app/fm/reports/page.tsx`](/workspaces/Fixzit/app/fm/reports/page.tsx) - FM reports

### Owner Reports

- [`/workspaces/Fixzit/app/api/owner/reports/roi/route.ts`](/workspaces/Fixzit/app/api/owner/reports/roi/route.ts) - ROI reports
- [`/workspaces/Fixzit/app/api/owner/statements/route.ts`](/workspaces/Fixzit/app/api/owner/statements/route.ts) - Financial statements

### Performance

- [`/workspaces/Fixzit/app/api/performance/metrics/route.ts`](/workspaces/Fixzit/app/api/performance/metrics/route.ts) - Performance metrics
- [`/workspaces/Fixzit/app/api/benchmarks/compare/route.ts`](/workspaces/Fixzit/app/api/benchmarks/compare/route.ts) - Benchmark comparison

---

## 14. 🔔 **Notifications**

### Notification System

- [`/workspaces/Fixzit/app/notifications/page.tsx`](/workspaces/Fixzit/app/notifications/page.tsx) - Notifications center
- [`/workspaces/Fixzit/app/api/notifications/route.ts`](/workspaces/Fixzit/app/api/notifications/route.ts) - Notification CRUD
- [`/workspaces/Fixzit/app/api/notifications/[id]/route.ts`](/workspaces/Fixzit/app/api/notifications/[id]/route.ts) - Single notification
- [`/workspaces/Fixzit/app/api/notifications/bulk/route.ts`](/workspaces/Fixzit/app/api/notifications/bulk/route.ts) - Bulk operations

**Models:**

- [`/workspaces/Fixzit/server/models/Notification.ts`](/workspaces/Fixzit/server/models/Notification.ts)

---

## 15. 👤 **User Profile & Settings**

### Profile Pages

- [`/workspaces/Fixzit/app/profile/page.tsx`](/workspaces/Fixzit/app/profile/page.tsx) - User profile
- [`/workspaces/Fixzit/app/settings/page.tsx`](/workspaces/Fixzit/app/settings/page.tsx) - User settings

### Profile APIs

- [`/workspaces/Fixzit/app/api/user/profile/route.ts`](/workspaces/Fixzit/app/api/user/profile/route.ts) - Profile management
- [`/workspaces/Fixzit/app/api/user/preferences/route.ts`](/workspaces/Fixzit/app/api/user/preferences/route.ts) - User preferences

### Organization Settings

- [`/workspaces/Fixzit/app/api/organization/settings/route.ts`](/workspaces/Fixzit/app/api/organization/settings/route.ts) - Org settings

---

## 16. 🔍 **Search & Referrals**

### Search

- [`/workspaces/Fixzit/app/api/search/route.ts`](/workspaces/Fixzit/app/api/search/route.ts) - Global search

### Referrals

- [`/workspaces/Fixzit/app/(dashboard)/referrals/page.tsx`](</workspaces/Fixzit/app/(dashboard)/referrals/page.tsx>) - Referral program
- [`/workspaces/Fixzit/app/api/referrals/generate/route.ts`](/workspaces/Fixzit/app/api/referrals/generate/route.ts) - Generate code
- [`/workspaces/Fixzit/app/api/referrals/my-code/route.ts`](/workspaces/Fixzit/app/api/referrals/my-code/route.ts) - My referral code

**Models:**

- [`/workspaces/Fixzit/server/models/ReferralCode.ts`](/workspaces/Fixzit/server/models/ReferralCode.ts)

---

## 17. 🧪 **Development & Testing**

### Dev Tools

- [`/workspaces/Fixzit/app/dev/login-helpers/page.tsx`](/workspaces/Fixzit/app/dev/login-helpers/page.tsx) - Dev login helpers
- [`/workspaces/Fixzit/app/api/dev/demo-accounts/route.ts`](/workspaces/Fixzit/app/api/dev/demo-accounts/route.ts) - Demo accounts
- [`/workspaces/Fixzit/app/api/dev/demo-login/route.ts`](/workspaces/Fixzit/app/api/dev/demo-login/route.ts) - Demo login

### Test Pages

- [`/workspaces/Fixzit/app/test/page.tsx`](/workspaces/Fixzit/app/test/page.tsx) - Test page
- [`/workspaces/Fixzit/app/test-rtl/page.tsx`](/workspaces/Fixzit/app/test-rtl/page.tsx) - RTL test
- [`/workspaces/Fixzit/app/test-cms/page.tsx`](/workspaces/Fixzit/app/test-cms/page.tsx) - CMS test

### QA APIs

- [`/workspaces/Fixzit/app/api/qa/health/route.ts`](/workspaces/Fixzit/app/api/qa/health/route.ts) - Health check
- [`/workspaces/Fixzit/app/api/qa/log/route.ts`](/workspaces/Fixzit/app/api/qa/log/route.ts) - QA logging
- [`/workspaces/Fixzit/app/api/qa/alert/route.ts`](/workspaces/Fixzit/app/api/qa/alert/route.ts) - QA alerts
- [`/workspaces/Fixzit/app/api/qa/reconnect/route.ts`](/workspaces/Fixzit/app/api/qa/reconnect/route.ts) - Reconnect logic

---

## 18. 🔌 **Integrations**

### External Integrations

- [`/workspaces/Fixzit/app/api/integrations/linkedin/apply/route.ts`](/workspaces/Fixzit/app/api/integrations/linkedin/apply/route.ts) - LinkedIn apply
- [`/workspaces/Fixzit/app/api/feeds/indeed/route.ts`](/workspaces/Fixzit/app/api/feeds/indeed/route.ts) - Indeed feed
- [`/workspaces/Fixzit/app/api/feeds/linkedin/route.ts`](/workspaces/Fixzit/app/api/feeds/linkedin/route.ts) - LinkedIn feed

### Webhooks

- [`/workspaces/Fixzit/app/api/webhooks/sendgrid/route.ts`](/workspaces/Fixzit/app/api/webhooks/sendgrid/route.ts) - SendGrid webhooks

---

## 19. 📁 **File Management**

### File APIs

- [`/workspaces/Fixzit/app/api/files/resumes/[file]/route.ts`](/workspaces/Fixzit/app/api/files/resumes/[file]/route.ts) - Resume files
- [`/workspaces/Fixzit/app/api/files/resumes/presign/route.ts`](/workspaces/Fixzit/app/api/files/resumes/presign/route.ts) - Presigned URLs
- [`/workspaces/Fixzit/app/api/work-orders/[id]/attachments/presign/route.ts`](/workspaces/Fixzit/app/api/work-orders/[id]/attachments/presign/route.ts) - WO attachments

---

## 20. 🌐 **Internationalization (i18n)**

### i18n System

- [`/workspaces/Fixzit/app/api/i18n/route.ts`](/workspaces/Fixzit/app/api/i18n/route.ts) - Translation API
- [`/workspaces/Fixzit/contexts/TranslationContext.tsx`](/workspaces/Fixzit/contexts/TranslationContext.tsx) - Translation context
- [`/workspaces/Fixzit/i18n/I18nProvider.tsx`](/workspaces/Fixzit/i18n/I18nProvider.tsx) - i18n provider
- [`/workspaces/Fixzit/components/i18n/LanguageSelector.tsx`](/workspaces/Fixzit/components/i18n/LanguageSelector.tsx) - Language switcher
- [`/workspaces/Fixzit/components/i18n/CurrencySelector.tsx`](/workspaces/Fixzit/components/i18n/CurrencySelector.tsx) - Currency switcher

---

## 🧩 Shared Components & Utilities

### Core Components

- [`/workspaces/Fixzit/components/TopBar.tsx`](/workspaces/Fixzit/components/TopBar.tsx) - Top navigation bar
- [`/workspaces/Fixzit/components/Sidebar.tsx`](/workspaces/Fixzit/components/Sidebar.tsx) - Side navigation
- [`/workspaces/Fixzit/components/Footer.tsx`](/workspaces/Fixzit/components/Footer.tsx) - Footer
- [`/workspaces/Fixzit/components/ResponsiveLayout.tsx`](/workspaces/Fixzit/components/ResponsiveLayout.tsx) - Responsive wrapper
- [`/workspaces/Fixzit/components/ErrorBoundary.tsx`](/workspaces/Fixzit/components/ErrorBoundary.tsx) - Error handling

### TopBar Components

- [`/workspaces/Fixzit/components/topbar/AppSwitcher.tsx`](/workspaces/Fixzit/components/topbar/AppSwitcher.tsx) - App module switcher
- [`/workspaces/Fixzit/components/topbar/GlobalSearch.tsx`](/workspaces/Fixzit/components/topbar/GlobalSearch.tsx) - Global search
- [`/workspaces/Fixzit/components/topbar/QuickActions.tsx`](/workspaces/Fixzit/components/topbar/QuickActions.tsx) - Quick actions

### UI Components

- [`/workspaces/Fixzit/components/ui/`](/workspaces/Fixzit/components/ui/) - shadcn/ui components directory

### Context Providers

- [`/workspaces/Fixzit/contexts/ThemeContext.tsx`](/workspaces/Fixzit/contexts/ThemeContext.tsx) - Theme management
- [`/workspaces/Fixzit/contexts/TopBarContext.tsx`](/workspaces/Fixzit/contexts/TopBarContext.tsx) - TopBar state
- [`/workspaces/Fixzit/contexts/ResponsiveContext.tsx`](/workspaces/Fixzit/contexts/ResponsiveContext.tsx) - Responsive utilities
- [`/workspaces/Fixzit/contexts/CurrencyContext.tsx`](/workspaces/Fixzit/contexts/CurrencyContext.tsx) - Currency formatting
- [`/workspaces/Fixzit/contexts/FormStateContext.tsx`](/workspaces/Fixzit/contexts/FormStateContext.tsx) - Form state tracking

### Configuration

- [`/workspaces/Fixzit/config/constants.ts`](/workspaces/Fixzit/config/constants.ts) - App constants
- [`/workspaces/Fixzit/config/topbar-modules.ts`](/workspaces/Fixzit/config/topbar-modules.ts) - Module configuration
- [`/workspaces/Fixzit/config/modules.ts`](/workspaces/Fixzit/config/modules.ts) - Module definitions

### Server Models

- [`/workspaces/Fixzit/server/models/`](/workspaces/Fixzit/server/models/) - All Mongoose models
- [`/workspaces/Fixzit/server/plugins/`](/workspaces/Fixzit/server/plugins/) - Mongoose plugins

### Utilities

- [`/workspaces/Fixzit/lib/`](/workspaces/Fixzit/lib/) - Utility functions
- [`/workspaces/Fixzit/utils/`](/workspaces/Fixzit/utils/) - Helper utilities

---

## 📝 Summary Statistics

### Module Breakdown

- **Total Modules:** 20+
- **Total Pages:** 100+
- **Total API Routes:** 150+
- **Total Models:** 50+

### Key Metrics

- **Main Applications:** FM, HR, Finance, Marketplace, Aqar
- **Auth System:** NextAuth.js
- **Database:** MongoDB with Mongoose
- **UI Framework:** React + Next.js 15.5
- **Styling:** Tailwind CSS + shadcn/ui

---

## 🔗 Quick Navigation

**Review Priority (Critical Paths):**

1. Authentication flow → Auth Module
2. Work Order lifecycle → FM Module > Work Orders
3. Payment processing → Billing & Payments Module
4. Property management → FM Module > Properties
5. Marketplace transactions → Marketplace Module

**Provider Chain:**

1. [`PublicProviders.tsx`](/workspaces/Fixzit/providers/PublicProviders.tsx) - Base providers
2. [`AuthenticatedProviders.tsx`](/workspaces/Fixzit/providers/AuthenticatedProviders.tsx) - Auth providers
3. [`ConditionalProviders.tsx`](/workspaces/Fixzit/providers/ConditionalProviders.tsx) - Route selector

---

_Report generated for comprehensive code review and module understanding._
