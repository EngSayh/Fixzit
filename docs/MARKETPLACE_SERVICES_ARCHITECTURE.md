# Fixzit Marketplace & Services Architecture

## Overview

This document clarifies the distinction between **Marketplace (Souq)** and **FM Services**, and defines the business relationship types (B2B, B2C, C2C).

## Domain Separation

### 1. Marketplace (Souq) - Product Catalog
- **Location**: `/app/souq/`, `/services/souq/`, `/app/api/souq/`
- **Purpose**: Vendors upload and sell physical products (spare parts, tools, equipment)
- **Models**:
  - Vendors sell products to businesses (B2B) or consumers (B2C)
  - Consumers can sell to other consumers (C2C) - future phase
- **Key Entities**:
  - `Vendor` - Seller/supplier account
  - `Product` - Physical goods with SKU, inventory
  - `Order` - Purchase transactions
  - `Settlement` - Payment processing to vendors

### 2. FM Services - Service Catalog
- **Location**: `/app/(fm)/`, `/services/fm/`, `/app/api/fm/`
- **Purpose**: Service providers offer maintenance, repair, installation services
- **Models**:
  - Service providers to businesses (B2B) - property management
  - Service providers to consumers (B2C) - homeowners
- **Key Entities**:
  - `ServiceProvider` - Technicians, contractors
  - `Service` - Service offerings (plumbing, electrical, HVAC)
  - `WorkOrder` - Service requests and assignments
  - `Quote` - Service pricing and estimates

## Business Relationship Types

### B2B (Business-to-Business)
- **Marketplace**: Vendors sell bulk/wholesale to property management companies
- **FM Services**: Service providers contracted by organizations

### B2C (Business-to-Consumer)
- **Marketplace**: Vendors sell retail to individual homeowners
- **FM Services**: Service providers serve individual property owners

### C2C (Consumer-to-Consumer)
- **Marketplace**: (Future) Individuals resell items to other individuals
- **FM Services**: Not applicable

### B2B2C (Business-to-Business-to-Consumer)
- **Marketplace**: Vendors sell to resellers/distributors who then sell to end consumers
- **FM Services**: Service providers can serve organizations and end consumers through reseller partnerships

## Required Changes

### 1. Product Model Enhancement
```typescript
interface Product {
  // Existing fields...
  
  // NEW: Business model type
  businessModel: 'B2B' | 'B2C' | 'B2B2C';
  
  // NEW: Pricing tiers
  pricing: {
    retail: Price;          // B2C price
    wholesale?: Price;      // B2B price (min quantity required)
    minWholesaleQty?: number;
  };
  
  // NEW: Customer type restrictions
  allowedCustomerTypes: ('BUSINESS' | 'INDIVIDUAL')[];
}
```

### 2. Vendor Model Enhancement
```typescript
interface Vendor {
  // Existing fields...
  
  // NEW: Business capabilities
  businessCapabilities: {
    sellsToBusinesses: boolean;   // B2B
    sellsToConsumers: boolean;    // B2C
    acceptsC2CListings: boolean;  // C2C marketplace
  };
  
  // NEW: Verification level
  verificationLevel: 'BASIC' | 'VERIFIED' | 'PREMIUM';
}
```

### 3. Service Model (FM)
```typescript
interface Service {
  serviceId: string;
  name: string;
  category: ServiceCategory;
  description: string;
  
  // Service type
  serviceType: 'MAINTENANCE' | 'REPAIR' | 'INSTALLATION' | 'INSPECTION';
  
  // Business model
  targetCustomers: ('PROPERTY_MANAGER' | 'LANDLORD' | 'TENANT' | 'HOMEOWNER')[];
  
  // Pricing
  pricing: {
    type: 'FIXED' | 'HOURLY' | 'QUOTE_BASED';
    basePrice?: Price;
    hourlyRate?: Price;
  };
}
```

## UI Enhancements Required

### Superadmin Catalog Page
1. Add "Business Model" filter (B2B, B2C, B2B2C)
2. Add "Customer Type" column
3. Add pricing tier display (retail vs wholesale)
4. Separate tabs: Products | Services

### Superadmin Vendors Page
1. Add "Sells To" badges (Businesses, Consumers)
2. Add verification level indicator
3. Add C2C marketplace toggle

## Implementation Priority

| Priority | Task | Module |
|----------|------|--------|
| P1 | Add businessModel field to Product schema | models/souq |
| P1 | Add businessCapabilities to Vendor schema | models/vendor |
| P2 | Update catalog UI with business model filter | superadmin/catalog |
| P2 | Update vendors UI with capability badges | superadmin/vendors |
| P3 | Create Service entity for FM | models/fm |
| P3 | Add Services tab to catalog | superadmin/catalog |
| P4 | C2C marketplace support | souq module |

## SSOT Integration Notes

Per AGENTS.md, all findings should be tracked in MongoDB Issue Tracker:
- Create issues for each P1/P2 task
- Link to this architecture document
- Track progress in `/superadmin/ssot`
