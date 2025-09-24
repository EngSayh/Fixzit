# Fixzit Bible - RBAC Sidebars Implementation
**Version:** 1.0  
**Date:** September 22, 2025  
**Document Type:** Master Implementation Guide

---

## Executive Summary

This document details the implementation of role-based access control (RBAC) sidebars across the Fixzit Enterprise platform, including specialized sidebars for Facility Management (FM), Aqar Real Estate, and Material Marketplace modules. The implementation strictly adheres to governance requirements, ensures no duplication, and maintains theme consistency.

---

## 1. Architecture Overview

### 1.1 Sidebar System Components

```
src/
├── components/
│   ├── navigation/
│   │   └── RoleSidebar.tsx         # Main RBAC sidebar component
│   ├── aqar/
│   │   └── AqarFiltersSidebar.tsx  # Real estate filters
│   └── market/
│       └── MarketFiltersSidebar.tsx # Marketplace filters
├── lib/
│   └── rbac.ts                     # Role permissions & logic
└── config/
    └── menus.ts                    # Menu configurations
```

### 1.2 Core Principles

1. **Single Source of Truth**: One sidebar implementation (`RoleSidebar.tsx`)
2. **Role-Based Visibility**: Modules shown based on user role
3. **Context Awareness**: Different menus for FM, Aqar, and Market
4. **No Public Page Display**: Hidden on landing, about, privacy, terms
5. **Theme Enforcement**: Fixzit brand colors maintained

---

## 2. RBAC Implementation

### 2.1 Role Hierarchy

```typescript
SUPER_ADMIN         → All modules
CORP_ADMIN          → Tenant-scoped full access
MANAGEMENT          → Operations focus
FINANCE             → Financial modules only
HR                  → HR modules only
CORPORATE_EMPLOYEE  → Basic access
PROPERTY_OWNER      → Property-focused
TECHNICIAN          → Work order focused
TENANT              → Limited access
VENDOR              → Marketplace access
BROKER_AGENT        → Real estate focused
FINANCE_CONTROLLER  → Financial oversight
COMPLIANCE_AUDITOR  → Audit focus
GUEST               → Marketplace browsing only
```

### 2.2 Module Permissions Matrix

| Module | Super Admin | Corp Admin | Management | Finance | HR | Employee | Owner | Technician | Tenant | Vendor | Guest |
|--------|-------------|------------|------------|---------|-------|----------|-------|------------|---------|---------|-------|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Work Orders | ✓ | ✓ | ✓ | - | - | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| Properties | ✓ | ✓ | ✓ | - | - | - | ✓ | - | ✓ | - | - |
| Finance | ✓ | ✓ | - | ✓ | - | - | - | - | - | - | - |
| HR | ✓ | ✓ | - | - | ✓ | - | - | - | - | - | - |
| Marketplace | ✓ | ✓ | - | - | - | - | - | - | ✓ | ✓ | ✓ |
| System | ✓ | - | - | - | - | - | - | - | - | - | - |

### 2.3 Corporate Admin Overrides

Corporate Admins can dynamically enable/disable modules for roles within their tenant scope:

```typescript
type OrgOverrides = {
  work_orders?: boolean;
  properties?: boolean;
  finance?: boolean;
  // ... other modules
}
```

---

## 3. Context-Aware Sidebars

### 3.1 Facility Management (FM)

**Path Pattern**: `/fm/*` or default

**Menu Structure**:
```
Dashboard
Work Orders
  ├── Create
  ├── Assign & Track
  ├── Preventive
  └── Service History
Properties
  ├── Units & Tenants
  ├── Lease Management
  ├── Inspections
  └── Documents
Finance
  ├── Invoices
  ├── Payments
  ├── Expenses
  ├── Budgets
  └── Reports
Human Resources
Administration
CRM
Marketplace
Support
Compliance & Legal
Reports & Analytics
System Management (Super Admin only)
```

### 3.2 Aqar Real Estate

**Path Pattern**: `/aqar/*`

**Menu Structure**:
```
Explore Listings
Map View
Saved Searches
Leads & Inquiries
My Listings
Post Property
Neighborhood Insights
```

**Filter Sidebar Features**:
- Purpose (Rent/Sale/Daily)
- City & District selection
- Property types (11 types)
- Price range
- Bedrooms/Bathrooms
- Area (m²)
- Furnishing status
- Amenities (9 options)
- Posting date filter
- Verified only toggle

### 3.3 Material Marketplace

**Path Pattern**: `/souq/*` or `/marketplace/*`

**Menu Structure**:
```
Marketplace Home
Catalog
  ├── Categories
  ├── Brands
  └── Deals
Vendors
RFQs & Bids
Orders & POs
  ├── My Orders
  ├── Create Order
  └── Order History
Shipping & Logistics
Reviews & Ratings
Advanced Search
Vendor Portal
```

**Filter Sidebar Features**:
- Department selection (10 departments)
- Price range
- Customer rating (4★ and up)
- Brand multi-select (15 major brands)
- Delivery options
- Condition (New/Used/Refurbished)
- In stock only
- Deals & discounts
- Seller type

---

## 4. Implementation Details

### 4.1 Route Detection

```typescript
function inferContext(path: string): Context {
  if (path.startsWith('/aqar')) return 'AQAR';
  if (path.startsWith('/souq') || path.startsWith('/marketplace')) return 'MARKET';
  return 'FM';
}
```

### 4.2 Hide on Public Pages

```typescript
const HIDE_ROUTES = [
  '/', '/about', '/privacy', '/terms', 
  '/login', '/ar', '/signup', '/logout', '/careers'
];
```

### 4.3 Theme Tokens

```typescript
const SIDEBAR_BG = '#023047';      // Dark blue background
const SIDEBAR_HOVER = 'rgba(0,97,168,0.5)';  // Semi-transparent hover
const SIDEBAR_ACTIVE = '#0061A8';  // Brand primary blue
```

---

## 5. RTL Support

### 5.1 Automatic Direction

- Sidebar inherits `dir` from `document.documentElement.dir`
- All text aligns correctly for Arabic
- Icons remain in consistent positions
- Collapse/expand chevrons flip appropriately

### 5.2 Translation Support

Both filter sidebars support full Arabic/English translation:
- Labels and placeholders
- Filter options
- Button text
- Status messages

---

## 6. Accessibility Features

1. **Keyboard Navigation**: Full support for Tab, Enter, Escape
2. **ARIA Labels**: Proper labeling for screen readers
3. **Focus States**: Clear visual indicators
4. **Title Attributes**: Tooltips when sidebar is collapsed

---

## 7. Performance Optimizations

1. **Memoized Computations**: Role filtering cached
2. **Lazy Loading**: Filter components loaded on demand
3. **Debounced Filters**: Prevent excessive re-renders
4. **Local State**: Filter states managed locally until applied

---

## 8. Integration Guide

### 8.1 Basic Setup

```tsx
import RoleSidebar from '@/src/components/navigation/RoleSidebar';

// In your layout
<RoleSidebar 
  role={userRole}
  userModules={allowedModules}
  orgOverrides={tenantOverrides}
/>
```

### 8.2 Filter Sidebars

For Aqar listings:
```tsx
import AqarFiltersSidebar from '@/src/components/aqar/AqarFiltersSidebar';

// On listing pages
<div className="flex">
  <AqarFiltersSidebar />
  <main>{/* Listing content */}</main>
</div>
```

For Marketplace:
```tsx
import MarketFiltersSidebar from '@/src/components/market/MarketFiltersSidebar';

// On catalog pages
<div className="flex">
  <MarketFiltersSidebar />
  <main>{/* Product grid */}</main>
</div>
```

---

## 9. Testing & Validation

### 9.1 RBAC Testing Matrix

| Test Case | Expected Result | Status |
|-----------|----------------|---------|
| Super Admin login | All modules visible | ✓ |
| Tenant login | Limited modules only | ✓ |
| Guest browsing | Marketplace access only | ✓ |
| Corp Admin overrides | Dynamic module visibility | ✓ |
| Public page access | No sidebar shown | ✓ |

### 9.2 Context Switching

| Route | Expected Sidebar | Status |
|-------|-----------------|---------|
| /fm/dashboard | FM sidebar | ✓ |
| /aqar/browse | Aqar sidebar | ✓ |
| /souq/catalog | Market sidebar | ✓ |
| /about | No sidebar | ✓ |

### 9.3 Filter Functionality

- ✓ URL persistence of filters
- ✓ Multi-select options
- ✓ Range inputs
- ✓ Reset functionality
- ✓ RTL support

---

## 10. Governance Compliance

### 10.1 Layout Freeze

- ✓ No structural changes to existing layouts
- ✓ Header + Sidebar + Content pattern maintained
- ✓ No duplicate implementations

### 10.2 STRICT v4 Compliance

- ✓ Single header mount
- ✓ Role-based visibility
- ✓ Theme tokens enforced
- ✓ RTL support
- ✓ Accessibility standards

### 10.3 Brand Consistency

- ✓ Primary: #0061A8
- ✓ Success: #00A859  
- ✓ Accent: #FFB400
- ✓ Consistent hover/active states

---

## 11. Maintenance Guidelines

### 11.1 Adding New Roles

1. Add role to `Role` type in `rbac.ts`
2. Define permissions in `DEFAULT_PERMISSIONS`
3. Add display name in `getRoleDisplayName`
4. Test all module access

### 11.2 Adding New Modules

1. Add to `ModuleKey` type
2. Add to `ALL_MODULES` array
3. Update role permissions
4. Add menu item in `menus.ts`
5. Test visibility for each role

### 11.3 Customizing Filters

1. Update filter options in respective sidebar
2. Add translation keys
3. Update URL parameter handling
4. Test filter persistence

---

## 12. Known Limitations & Future Enhancements

### 12.1 Current Limitations

- Filter counts not displayed (requires backend integration)
- No saved filter presets
- Limited to 2 languages (AR/EN)

### 12.2 Planned Enhancements

- [ ] Dynamic filter options from API
- [ ] Saved search functionality
- [ ] Filter analytics
- [ ] Mobile-optimized filter drawer
- [ ] Advanced RBAC with granular permissions

---

## 13. Security Considerations

1. **Client-Side Filtering**: UI filtering is for UX only; enforce on backend
2. **Role Validation**: Always verify roles server-side
3. **Tenant Isolation**: Ensure cross-tenant data is never exposed
4. **Audit Trail**: Log all permission changes

---

## 14. Approval & Sign-off

This implementation has been developed according to:
- Master System Governance V5
- STRICT v4 Requirements
- Fixzit SDD Specifications
- UI/UX Best Practices

**Reviewed by**: _____________________  
**Date**: _____________________

**Approved by**: _____________________  
**Date**: _____________________

---

© 2025 Fixzit Enterprise. This document is confidential and proprietary.
