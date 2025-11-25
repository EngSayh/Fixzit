# Page Consolidation Strategy

## Executive Summary

The Fixzit codebase has **14 high-priority duplicate page structures** that need consolidation. This document provides a detailed migration strategy for merging duplicate pages while preserving functionality and improving maintainability.

---

## Problem Statement

### Current Issues

1. **FM Duplication**: 11 feature areas duplicated between `/app/*` and `/app/fm/*`
2. **Marketplace Split**: Two separate e-commerce implementations (`/app/marketplace` vs `/app/souq`)
3. **Vendor Fragmentation**: Three different vendor management interfaces
4. **Dashboard Confusion**: Multiple dashboard implementations

### Impact

- ❌ **Code Duplication**: ~50% code redundancy across FM pages
- ❌ **Maintenance Burden**: Bug fixes need to be applied twice
- ❌ **Inconsistent UX**: Different behavior for same features
- ❌ **Confusion**: Users don't know which interface to use

---

## Consolidation Priority Matrix

### Priority 1: FM vs Main Pages (Week 2-3)

**Impact**: High | **Effort**: Medium | **Risk**: Medium

| Current Structure                                                        | Consolidated Target              | Pages Affected |
| ------------------------------------------------------------------------ | -------------------------------- | -------------- |
| `/app/properties/*` + `/app/fm/properties/*`                             | `/app/(dashboard)/properties/*`  | 13 pages       |
| `/app/finance/*` + `/app/fm/finance/*`                                   | `/app/(dashboard)/finance/*`     | 9 pages        |
| `/app/work-orders/*` + `/app/fm/maintenance/*` + `/app/fm/work-orders/*` | `/app/(dashboard)/maintenance/*` | 15 pages       |
| `/app/dashboard/*` + `/app/fm/dashboard/*`                               | `/app/(dashboard)/page.tsx`      | 2 pages        |
| `/app/reports/*` + `/app/fm/reports/*`                                   | `/app/(dashboard)/reports/*`     | 2 pages        |
| `/app/system/*` + `/app/fm/system/*`                                     | `/app/admin/system/*`            | 2 pages        |
| `/app/compliance/*` + `/app/fm/compliance/*`                             | `/app/(dashboard)/compliance/*`  | 2 pages        |
| `/app/support/*` + `/app/fm/support/*`                                   | `/app/(dashboard)/support/*`     | 4 pages        |
| `/app/vendors/*` + `/app/fm/vendors/*`                                   | `/app/(dashboard)/vendors/*`     | 2 pages        |
| `/app/crm/*` + `/app/fm/crm/*`                                           | `/app/(dashboard)/crm/*`         | 2 pages        |
| `/app/hr/*` + `/app/fm/hr/*`                                             | `/app/(dashboard)/hr/*`          | 3 pages        |

**Total**: 56 pages → 28 consolidated pages

### Priority 2: Marketplace Consolidation (Week 3)

**Impact**: High | **Effort**: Low | **Risk**: Low

| Current Structure                    | Consolidated Target              | Pages Affected |
| ------------------------------------ | -------------------------------- | -------------- |
| `/app/marketplace/*` + `/app/souq/*` | `/app/(dashboard)/marketplace/*` | 23 pages       |

### Priority 3: Vendor Interface Unification (Week 4)

**Impact**: Medium | **Effort**: Low | **Risk**: Low

| Current Structure                                                          | Consolidated Target | Pages Affected |
| -------------------------------------------------------------------------- | ------------------- | -------------- |
| `/app/vendors/*` + `/app/marketplace/vendor/*` + `/app/vendor/dashboard/*` | `/app/vendor/*`     | 6 pages        |

---

## Consolidation Strategy: FM vs Main Pages

### Approach: Role-Based View Switching

Instead of duplicating pages, use a **context-based approach** to render different views based on user role.

### Implementation Pattern

#### Step 1: Create Unified Context

```typescript
// contexts/ModuleContext.tsx
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

type ModuleMode = 'standard' | 'fm' | 'admin';

interface ModuleContextValue {
  mode: ModuleMode;
  isFM: boolean;
  isAdmin: boolean;
  switchMode: (mode: ModuleMode) => void;
}

const ModuleContext = createContext<ModuleContextValue | undefined>(undefined);

export function ModuleProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();

  // Determine mode from user role
  const mode: ModuleMode = session?.user?.role === 'FM_MANAGER'
    ? 'fm'
    : session?.user?.role === 'ADMIN'
      ? 'admin'
      : 'standard';

  const value = {
    mode,
    isFM: mode === 'fm',
    isAdmin: mode === 'admin',
    switchMode: (newMode: ModuleMode) => {
      // Store preference in user settings
      // This allows manual switching if user has multiple roles
    }
  };

  return (
    <ModuleContext.Provider value={value}>
      {children}
    </ModuleContext.Provider>
  );
}

export function useModule() {
  const context = useContext(ModuleContext);
  if (!context) throw new Error('useModule must be used within ModuleProvider');
  return context;
}
```

#### Step 2: Consolidate Properties Pages

**Before** (Duplicate):

```
/app/properties/page.tsx (Standard)
/app/fm/properties/page.tsx (FM)
```

**After** (Consolidated):

```typescript
// app/(dashboard)/properties/page.tsx

import { PropertiesStandardView } from '@/components/properties/StandardView';
import { PropertiesFMView } from '@/components/properties/FMView';
import { useModule } from '@/contexts/ModuleContext';

export default function PropertiesPage() {
  const { mode } = useModule();

  if (mode === 'fm') {
    return <PropertiesFMView />;
  }

  return <PropertiesStandardView />;
}
```

#### Step 3: Component Refactoring

Extract shared logic into hooks:

```typescript
// hooks/useProperties.ts

export function useProperties() {
  const { mode } = useModule();

  const fetchProperties = async () => {
    const endpoint = mode === "fm" ? "/api/fm/properties" : "/api/properties";

    return fetch(endpoint).then((r) => r.json());
  };

  // Shared logic here

  return {
    properties: data?.properties || [],
    loading,
    error,
    refetch,
  };
}
```

Use in both views:

```typescript
// components/properties/StandardView.tsx
export function PropertiesStandardView() {
  const { properties, loading } = useProperties();

  return (
    <div>
      {/* Standard UI */}
    </div>
  );
}

// components/properties/FMView.tsx
export function PropertiesFMView() {
  const { properties, loading } = useProperties();

  return (
    <div>
      {/* FM-specific UI with asset focus */}
    </div>
  );
}
```

---

## Consolidation Strategy: Marketplace vs Souq

### Approach: Public vs Authenticated Views

**Souq** appears to be the public-facing store, while **Marketplace** is the internal procurement system.

### Solution: Unified Structure with Access Control

```
/app/(dashboard)/marketplace/*  - Authenticated procurement
/app/store/*                    - Public e-commerce (renamed from souq)
```

### Implementation Pattern

#### Step 1: Rename Public Store

```bash
# Migration commands
mv app/souq app/store
```

#### Step 2: Update Routes

```typescript
// app/store/page.tsx (Public Store)
export default async function PublicStorePage() {
  // No authentication required
  const products = await getPublicProducts();

  return <PublicStoreLayout products={products} />;
}

// app/(dashboard)/marketplace/page.tsx (Internal Procurement)
import { requireAuth } from '@/lib/auth-utils';

export default async function MarketplacePage() {
  await requireAuth(); // Require authentication

  const products = await getInternalCatalog();

  return <InternalMarketplaceLayout products={products} />;
}
```

#### Step 3: Share Product Components

```typescript
// components/marketplace/ProductCard.tsx
interface ProductCardProps {
  product: Product;
  variant: 'public' | 'internal';
}

export function ProductCard({ product, variant }: ProductCardProps) {
  const showInternalPricing = variant === 'internal';
  const showPublicReviews = variant === 'public';

  return (
    <div className="product-card">
      {/* Shared UI with conditional features */}
    </div>
  );
}
```

---

## Consolidation Strategy: Vendor Management

### Current Problem

Three separate vendor interfaces:

1. `/app/vendors/*` - Vendor list/management
2. `/app/marketplace/vendor/*` - Vendor portal/products
3. `/app/vendor/dashboard/*` - Individual vendor dashboard

### Solution: Unified Vendor System

```
/app/vendor/*                    - Vendor Portal (for vendors to manage their account)
/app/(dashboard)/vendors/*       - Admin Vendor Management (for admins)
```

### Implementation Pattern

#### Step 1: Consolidate Admin Vendor Management

```typescript
// app/(dashboard)/vendors/page.tsx
import { VendorList } from '@/components/vendors/VendorList';
import { requireRole } from '@/lib/auth-utils';

export default async function VendorsManagementPage() {
  await requireRole(['ADMIN', 'PROCUREMENT_MANAGER']);

  return (
    <div>
      <h1>Vendor Management</h1>
      <VendorList showAdminActions />
    </div>
  );
}
```

#### Step 2: Unified Vendor Portal

```typescript
// app/vendor/page.tsx (Dashboard for logged-in vendors)
import { requireRole } from '@/lib/auth-utils';

export default async function VendorDashboardPage() {
  await requireRole(['VENDOR']);
  const vendor = await getCurrentVendor();

  return (
    <VendorLayout>
      <VendorDashboard vendor={vendor} />
      {/* Tabs: Overview | Products | Orders | Performance | Settings */}
    </VendorLayout>
  );
}
```

---

## Migration Checklist

### Pre-Migration (Week 1)

- [ ] Create `ModuleContext` provider
- [ ] Update `app/layout.tsx` with `<ModuleProvider>`
- [ ] Create shared hooks (`useProperties`, `useFinance`, etc.)
- [ ] Set up parallel API routes (`/api/properties` vs `/api/fm/properties`)

### Phase 1: Properties Module (Week 2)

- [ ] Create `/app/(dashboard)/properties/page.tsx`
- [ ] Extract `PropertiesStandardView` component
- [ ] Extract `PropertiesFMView` component
- [ ] Migrate `/app/properties/*` → `/app/(dashboard)/properties/*`
- [ ] Delete old `/app/fm/properties/*` pages
- [ ] Update all navigation links
- [ ] Test role-based switching

### Phase 2: Finance Module (Week 2)

- [ ] Create `/app/(dashboard)/finance/page.tsx`
- [ ] Consolidate payment pages
- [ ] Consolidate invoice pages
- [ ] Merge FM finance features
- [ ] Delete duplicates
- [ ] Update navigation

### Phase 3: Maintenance Module (Week 3)

- [ ] Create `/app/(dashboard)/maintenance/page.tsx`
- [ ] Merge work orders + FM maintenance
- [ ] Consolidate support tickets
- [ ] Unified Kanban board
- [ ] Delete duplicates

### Phase 4: Marketplace (Week 3)

- [ ] Rename `/app/souq` → `/app/store`
- [ ] Keep `/app/(dashboard)/marketplace` separate
- [ ] Update all product links
- [ ] Share ProductCard component
- [ ] Update navigation

### Phase 5: Vendors (Week 4)

- [ ] Create `/app/vendor/page.tsx` (unified portal)
- [ ] Create `/app/(dashboard)/vendors/page.tsx` (admin)
- [ ] Merge vendor product management
- [ ] Delete old vendor pages
- [ ] Update vendor onboarding flow

### Phase 6: Remaining Modules (Week 4)

- [ ] Consolidate dashboards
- [ ] Merge reports pages
- [ ] Merge system settings
- [ ] Merge compliance pages
- [ ] Merge CRM pages
- [ ] Merge HR pages

---

## Code Migration Scripts

### Script 1: Update Import Paths

```typescript
// scripts/update-imports.ts

import { promises as fs } from "fs";
import { glob } from "glob";

const oldPaths = [
  { from: "@/app/fm/properties", to: "@/app/(dashboard)/properties" },
  { from: "@/app/fm/finance", to: "@/app/(dashboard)/finance" },
  // ... add all mappings
];

async function updateImports() {
  const files = await glob("**/*.{ts,tsx}", { ignore: "node_modules/**" });

  for (const file of files) {
    let content = await fs.readFile(file, "utf-8");

    for (const { from, to } of oldPaths) {
      content = content.replace(new RegExp(from, "g"), to);
    }

    await fs.writeFile(file, content);
  }

  console.log(`✅ Updated ${files.length} files`);
}

updateImports();
```

### Script 2: Update Navigation Links

```typescript
// scripts/update-nav.ts

import { updateNavigationLinks } from "@/lib/migration-utils";

const linkMappings = {
  "/fm/properties": "/properties",
  "/fm/finance": "/finance",
  "/fm/maintenance": "/maintenance",
  // ... add all mappings
};

async function updateNavigation() {
  // Update sidebar navigation
  await updateNavigationLinks("nav/sidebar-links.ts", linkMappings);

  // Update breadcrumbs
  await updateNavigationLinks("components/Breadcrumbs.tsx", linkMappings);

  console.log("✅ Navigation links updated");
}

updateNavigation();
```

---

## Testing Strategy

### 1. Role-Based Testing

```typescript
// tests/consolidation.test.ts

describe("Page Consolidation", () => {
  test("Standard user sees standard view", async () => {
    const user = await loginAs("standard-user");
    const page = await navigateTo("/properties");

    expect(page).toShowStandardView();
    expect(page).not.toShowFMFeatures();
  });

  test("FM Manager sees FM view", async () => {
    const user = await loginAs("fm-manager");
    const page = await navigateTo("/properties");

    expect(page).toShowFMView();
    expect(page).toShowAssetManagementFeatures();
  });

  test("Admin can switch between views", async () => {
    const user = await loginAs("admin");
    const page = await navigateTo("/properties");

    await page.switchMode("fm");
    expect(page).toShowFMView();

    await page.switchMode("standard");
    expect(page).toShowStandardView();
  });
});
```

### 2. Navigation Testing

```typescript
describe("Navigation After Consolidation", () => {
  test("Old FM URLs redirect to new paths", async () => {
    const response = await fetch("/fm/properties");

    expect(response).toRedirect("/properties");
    expect(response.headers.get("x-view-mode")).toBe("fm");
  });
});
```

### 3. Data Integrity Testing

```typescript
describe("Data Migration", () => {
  test("FM data accessible from consolidated page", async () => {
    const fmProperty = await createFMProperty();

    const page = await navigateTo("/properties", { mode: "fm" });

    expect(page).toDisplayProperty(fmProperty);
  });
});
```

---

## Rollback Plan

### If Issues Occur

#### Step 1: Feature Flag Rollback

```typescript
// lib/feature-flags.ts

export const FEATURE_FLAGS = {
  CONSOLIDATED_PROPERTIES: process.env.NEXT_PUBLIC_CONSOLIDATED_PROPERTIES === 'true',
  CONSOLIDATED_FINANCE: process.env.NEXT_PUBLIC_CONSOLIDATED_FINANCE === 'true',
  // ... other flags
};

// Usage in page
export default function PropertiesPage() {
  if (!FEATURE_FLAGS.CONSOLIDATED_PROPERTIES) {
    // Show old interface
    return <OldPropertiesPage />;
  }

  // Show new consolidated interface
  return <ConsolidatedPropertiesPage />;
}
```

#### Step 2: Git Revert Strategy

```bash
# Revert specific module consolidation
git revert <commit-hash>  # Revert properties consolidation
git push origin feat/consolidation

# Or revert entire consolidation
git revert <range-of-commits>
```

---

## Success Metrics

### Quantitative Metrics

- **Code Reduction**: Target 50% reduction in duplicate code
- **Build Time**: Expect 20-30% faster builds (fewer files)
- **Bundle Size**: Target 15-20% smaller production bundle
- **Test Coverage**: Maintain >80% coverage during migration

### Qualitative Metrics

- **Developer Experience**: Single source of truth for features
- **User Experience**: Consistent behavior across features
- **Maintainability**: Bug fixes applied once, not twice

---

## Timeline Summary

| Week       | Task                                  | Pages Affected | Status      |
| ---------- | ------------------------------------- | -------------- | ----------- |
| **Week 1** | Setup infrastructure (Context, Hooks) | 0              | Not Started |
| **Week 2** | Properties + Finance consolidation    | 22             | Not Started |
| **Week 3** | Maintenance + Marketplace             | 38             | Not Started |
| **Week 4** | Vendors + Remaining modules           | 12             | Not Started |

**Total Duration**: 4 weeks  
**Total Pages Consolidated**: 72 pages → 36 pages

---

## Next Steps

1. ✅ Review and approve consolidation strategy
2. 🔄 Create `ModuleContext` provider
3. 🔄 Start with Properties module (lowest risk)
4. 🔄 Test thoroughly before moving to next module
5. 🔄 Update documentation as you go

---

**Last Updated**: 2025-10-25  
**Status**: Strategy defined, awaiting approval
