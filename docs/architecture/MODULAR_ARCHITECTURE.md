# Fixzit Platform - Modular Architecture

## Overview

The Fixzit platform is structured into **7 primary modules**, each containing related services and features. This architecture consolidates the 70+ existing pages into logical, maintainable groups.

---

## Module 1: Property & Tenancy Management

### Purpose

Manage properties, units, owners, and rental operations with Ejar integration.

### Main Services

- Properties Dashboard (Ejar-style metrics)
- Rental Management
- Real Estate Listings

### Sub-Services & Pages

#### Existing Pages

- `/app/(dashboard)/properties/page.tsx` - Properties list
- `/app/(dashboard)/properties/[id]/page.tsx` - Property details
- `/app/(dashboard)/bulk-units/page.tsx` - Bulk Unit Management
- `/app/(dashboard)/rental-listings/page.tsx` - Rental Listings
- `/app/(dashboard)/real-estate-projects/page.tsx` - Real Estate Projects

#### Features

- Property metrics (Total Flats/Units, Empty Flats)
- Building Type Configuration
- Utility Transfer
- Property Handover
- FAAL Verification
- Tenant Screening
- Property Advertisements

#### Database Models

- `Property` (existing)
- `Unit` (existing)
- `BuildingType` (needs creation)

---

## Module 2: Customer & User Lifecycle

### Purpose

Manage all user types: owners, tenants, employees, families, and customer relationships.

### Main Services

- Owner Management
- Tenant Management
- Employee Management
- Family Management

### Sub-Services & Pages

#### Existing Pages

- `/app/(dashboard)/profile/page.tsx` - Profile Management
- Employee Management pages (need consolidation)
- Client Management pages (need consolidation)

#### Needs Implementation

- **Owner Management** (Add/List) - Not found in codebase
- **Tenant Management** (Add/List/Multiple) - Not found in codebase
- **Family Management** - Not implemented
- **Referral Program** - Not implemented
- **HR Activities** (Vacation Requests) - Not implemented
- **Job Application Process** - Not implemented

#### Database Models

- `Owner` (needs creation)
- `Tenant` (needs creation)
- `Employee` (needs creation)
- `FamilyMember` (needs creation)
- `FamilyInvitation` (needs creation)
- `ReferralCode` (needs creation)
- `ReferralReward` (needs creation)

---

## Module 3: Legal & Contract Management

### Purpose

Handle all contracts (rental and sales), legal documents, and agreements.

### Main Services

- Contract Management Dashboard
- Sales Contracts
- Legal Documents

### Sub-Services & Pages

#### Existing Pages

- Contract management pages (need to locate/consolidate)

#### Needs Implementation

- **Contract Dashboard** (Active/Closed/Expired metrics)
- **Sales Contracts** (Listing/Add/Management)
- **Contract Documentation**
- **Contract Termination**
- **Tenant Change**
- **Lessor Change**
- **Security Deposit**
- **Electronic Attorneys**
- **Brokerage Agreements**
- **Brokerage Establishments**

#### Database Models

- `Contract` (existing?)
- `SalesContract` (needs creation)
- `ContractTermination` (needs creation)
- `SecurityDeposit` (needs creation)

---

## Module 4: Financial & Accounting

### Purpose

Comprehensive financial management including payments, invoices, settlements, and accounting.

### Main Services

- Financial Dashboard (AqaryPro-style)
- Payment Management
- Invoice Management

### Sub-Services & Pages

#### Existing Pages

- Payment pages (need to locate)
- Invoice pages (need to locate)

#### Needs Implementation

- **Financial Dashboard** (Owners, Tenants, Buildings, Units counts)
- **Payments** (All/Overdue)
- **Payment Tracking**
- **Tenant Payment**
- **Payment Methods** (Secure Card Storage)
- **Payment Links**
- **Refund Management**
- **Bank Accounts** (Configuration)
- **Owner Settlement** (List/Add)
- **Invoice Management** (VAT/Receipt Vouchers with QR)
- **Financial Analytics**
- **Ejar Wallet**
- **Operation Type Config**
- **Offer Type Config**

#### Database Models

- `Payment` (existing?)
- `Invoice` (needs creation)
- `ReceiptVoucher` (needs creation)
- `OwnerSettlement` (needs creation)
- `PaymentMethod` (needs creation)
- `BankAccount` (needs creation)
- `OperationType` (needs creation)
- `OfferType` (needs creation)

---

## Module 5: Service & Maintenance Operations

### Purpose

Handle maintenance tickets, inspections, service scheduling, and warranty tracking.

### Main Services

- Ticket Management
- Inspection Management
- Maintenance Scheduling

### Sub-Services & Pages

#### Existing Pages

- `/app/(dashboard)/tickets/page.tsx` - Ticket Management (if exists)
- `/app/(dashboard)/inspections/page.tsx` - Inspections (if exists)

#### Needs Implementation

- **Tickets** (All/Assignment)
- **Requests**
- **Fixzit Services** (Company-Provided)
- **Service Management** (Provider-Provided)
- **Service Ratings**
- **Warranty Tracker**
- **Rental Incident**
- **Spare Parts Approval** (Tenant approval cycle)
- **Scheduler** (Availability-based booking)
- **Service Fees** (5% configurable)

#### Database Models

- `Ticket` (existing?)
- `MaintenanceRequest` (needs creation)
- `ServiceRating` (needs creation)
- `WarrantyItem` (needs creation)
- `SparePartsApproval` (needs creation)
- `ProviderAvailability` (needs creation)

---

## Module 6: Marketplace & Project Bidding

### Purpose

Manage vendors, service providers, products, projects, and bidding processes.

### Main Services

- Project Management
- Vendor Management
- E-commerce Store

### Sub-Services & Pages

#### Existing Pages

- `/app/(dashboard)/marketplace/*` (if exists)
- Product/Service pages (need consolidation)

#### Needs Implementation

- **Project Management** (Create/Dashboard)
- **Bidding Interface** (Submit/Overview)
- **Contractor Registration** (with approval workflow)
- **Contractor Management**
- **Service Provider Management** (with verification)
- **Service Provider Dashboard**
- **Create Service/Product** (consolidated page with tabs)
- **Product Management**
- **Online Store**
- **Public Store**
- **Order Tracking**

#### Database Models

- `Project` (needs creation)
- `ProjectCategory` (needs creation)
- `ProjectBid` (needs creation)
- `Contractor` (needs creation)
- `ServiceProvider` (needs creation)
- `Product` (needs creation)
- `Service` (needs creation)
- `Order` (needs creation)

---

## Module 7: System & Administration

### Purpose

System configuration, access control, audit logging, backups, and admin tools.

### Main Services

- Admin Dashboard
- Access Control
- System Configuration
- Audit & Logging

### Sub-Services & Pages

#### Existing Pages

- `/app/admin/*` - Admin pages (need consolidation)
- `/app/(dashboard)/settings/page.tsx` - Settings

#### Needs Implementation

- **Admin Dashboard** (Super/Sub-Admin)
- **Admin Settings** (Feature On/Off Toggles with iOS-style switches)
- **Role Registration**
- **Authorization & Permissions Matrix**
- **Office User Management**
- **System Settings**
- **Audit Log** (Activity/Database changes)
- **Backup Option** (Daily auto + ad-hoc)
- **File Management** (Upload/Excel Templates)
- **Notification Center** (Push/SMS Setup)
- **Help & Support** (AI/Bug Reporting)
- **Market Intelligence Tracker** (CEO/Super Admin only)

#### Database Models

- `AuditLog` (needs creation)
- `FeatureFlag` (needs creation)
- `Permission` (needs creation)
- `Role` (needs creation)
- `SystemBackup` (needs creation)
- `Notification` (needs creation)
- `SupportTicket` (needs creation)

---

## Page Consolidation Strategy

### Consolidations Needed

1. **Service/Product Creation** → **Marketplace Management**
   - Merge: `CreateService` + `CreateProduct`
   - Solution: Single page with tabs (Services | Products)
   - Location: `/app/(dashboard)/marketplace/manage/page.tsx`

2. **Client Management** → **Customer Lifecycle**
   - Merge: `ClientManagement` + `ClientsManagement`
   - Solution: Single unified page
   - Location: `/app/(dashboard)/customers/page.tsx`

3. **Financial Pages** → **Financial Dashboard**
   - Consolidate: Multiple payment, invoice, settlement pages
   - Solution: Tabbed interface (Payments | Invoices | Settlements | Reports)
   - Location: `/app/(dashboard)/finance/page.tsx`

4. **Admin Pages** → **System Administration**
   - Consolidate: Admin settings, user management, permissions
   - Solution: Nested navigation with sections
   - Location: `/app/admin/page.tsx`

5. **Contractor/Service Provider** → **Vendor Management**
   - Merge: Contractor and Service Provider registration/management
   - Solution: Unified vendor registration with type selection
   - Location: `/app/(dashboard)/vendors/page.tsx`

---

## Implementation Priority

### Phase 1: Critical Infrastructure (Week 1-2)

1. Create missing database schemas (Module 2, 4, 5, 6)
2. Implement Two-Level Admin System (Module 7)
3. Create Audit Logging System (Module 7)
4. Add iOS-style Toggle Component (Module 7)

### Phase 2: Core Features (Week 3-4)

1. Family Management System (Module 2)
2. Referral Program (Module 2)
3. Payment Methods & Auto-Pay (Module 4)
4. Receipt Vouchers with QR (Module 4)

### Phase 3: Advanced Features (Week 5-6)

1. Project Bidding System (Module 6)
2. Vendor Registration & Verification (Module 6)
3. Maintenance Scheduling (Module 5)
4. Spare Parts Approval (Module 5)

### Phase 4: Enhancement (Week 7-8)

1. HR Module (Module 2)
2. Market Intelligence (Module 7)
3. Help & Support with AI (Module 7)
4. Advanced Reporting (Module 4)

---

## File Structure Reorganization

### Proposed Structure

```
/app
  /(dashboard)
    /property-management
      /properties
      /units
      /owners
      /tenants
    /contracts
      /rental
      /sales
    /finance
      /payments
      /invoices
      /settlements
    /maintenance
      /tickets
      /inspections
      /scheduling
    /marketplace
      /projects
      /vendors
      /store
    /customers
      /owners
      /tenants
      /family
      /referrals
  /admin
    /dashboard
    /users
    /permissions
    /settings
    /audit-logs
```

---

## Navigation Menu Structure

### Updated Sidebar Categories

1. 🏢 **Property & Tenancy**
2. 👥 **Customers & Users**
3. 📄 **Contracts & Legal**
4. 💰 **Finance & Accounting**
5. 🔧 **Maintenance & Service**
6. 🏗️ **Marketplace & Projects**
7. ⚙️ **System & Admin**

---

## Next Steps

1. **Audit existing pages** - Map all 70+ pages to modules
2. **Identify gaps** - List pages that need creation
3. **Create database schemas** - Build missing Mongoose models
4. **Consolidate pages** - Merge related pages into tabbed interfaces
5. **Update navigation** - Reorganize sidebar into 7 modules
6. **Implement priorities** - Follow phased implementation plan

---

**Last Updated**: 2025-10-25  
**Status**: Architecture defined, awaiting implementation
