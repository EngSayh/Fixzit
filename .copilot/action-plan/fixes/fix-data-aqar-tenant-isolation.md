# fix-data-aqar-tenant-isolation.md

## Issue: DATA-001 - Aqar Models Missing tenantIsolationPlugin

### Priority: P0 CRITICAL
### Category: Data/Schema/DB
### Labels: `copilot:ready`, `owner:backend`, `flag:multi_tenancy_gap`

---

## Problem Statement

Aqar marketplace models (Lead, Booking, Listing, Project, SavedSearch, Favorite, etc.) have `orgId` field but DON'T use `tenantIsolationPlugin`, allowing potential cross-tenant data access.

## Affected Files

1. `/Fixzit/models/aqar/Lead.ts`
2. `/Fixzit/models/aqar/Booking.ts`
3. `/Fixzit/models/aqar/Listing.ts`
4. `/Fixzit/models/aqar/Project.ts`
5. `/Fixzit/models/aqar/SavedSearch.ts`
6. `/Fixzit/models/aqar/Favorite.ts`
7. `/Fixzit/models/aqar/MarketingRequest.ts`
8. `/Fixzit/models/aqar/Package.ts`
9. `/Fixzit/models/aqar/Boost.ts`
10. `/Fixzit/models/aqar/Payment.ts`

## Root Cause

The Aqar models were created with `orgId` fields for multi-tenancy but the `tenantIsolationPlugin` was not applied. This plugin automatically:
- Scopes all queries to the current tenant's `orgId`
- Adds `orgId` to documents on creation
- Prevents cross-tenant data access

## Fix Implementation

### Step 1: Update Lead.ts

```typescript
// Add import at top of file
import { tenantIsolationPlugin } from '@/server/plugins/tenantIsolation';

// Add before model export (before `const Lead = getModel...`)
LeadSchema.plugin(tenantIsolationPlugin, { 
  strict: true, 
  collectionName: 'aqar_leads' 
});
```

### Step 2: Update Booking.ts

```typescript
// Add import at top of file
import { tenantIsolationPlugin } from '@/server/plugins/tenantIsolation';

// Add before model export
BookingSchema.plugin(tenantIsolationPlugin, { 
  strict: true, 
  collectionName: 'aqar_bookings' 
});
```

### Step 3: Update Listing.ts

```typescript
// Add import at top of file
import { tenantIsolationPlugin } from '@/server/plugins/tenantIsolation';

// Add before model export
ListingSchema.plugin(tenantIsolationPlugin, { 
  strict: true, 
  collectionName: 'aqar_listings' 
});
```

### Step 4: Update Project.ts

```typescript
// Add import at top of file
import { tenantIsolationPlugin } from '@/server/plugins/tenantIsolation';

// Add before model export
ProjectSchema.plugin(tenantIsolationPlugin, { 
  strict: true, 
  collectionName: 'aqar_projects' 
});
```

### Step 5: Update SavedSearch.ts

```typescript
// Add import at top of file
import { tenantIsolationPlugin } from '@/server/plugins/tenantIsolation';

// Add before model export
SavedSearchSchema.plugin(tenantIsolationPlugin, { 
  strict: true, 
  collectionName: 'aqar_saved_searches' 
});
```

### Step 6: Update Favorite.ts

```typescript
// Add import at top of file
import { tenantIsolationPlugin } from '@/server/plugins/tenantIsolation';

// Add before model export
FavoriteSchema.plugin(tenantIsolationPlugin, { 
  strict: true, 
  collectionName: 'aqar_favorites' 
});
```

### Step 7: Update MarketingRequest.ts

```typescript
// Add import at top of file
import { tenantIsolationPlugin } from '@/server/plugins/tenantIsolation';

// Add before model export
MarketingRequestSchema.plugin(tenantIsolationPlugin, { 
  strict: true, 
  collectionName: 'aqar_marketing_requests' 
});
```

### Step 8: Update Package.ts

```typescript
// Add import at top of file
import { tenantIsolationPlugin } from '@/server/plugins/tenantIsolation';

// Add before model export (if model has orgId - check schema)
// NOTE: If Package is global platform config, do NOT add this plugin
// Check if orgId exists in schema first
PackageSchema.plugin(tenantIsolationPlugin, { 
  strict: true, 
  collectionName: 'aqar_packages' 
});
```

### Step 9: Update Boost.ts

```typescript
// Add import at top of file
import { tenantIsolationPlugin } from '@/server/plugins/tenantIsolation';

// Add before model export
BoostSchema.plugin(tenantIsolationPlugin, { 
  strict: true, 
  collectionName: 'aqar_boosts' 
});
```

### Step 10: Update Payment.ts

```typescript
// Add import at top of file
import { tenantIsolationPlugin } from '@/server/plugins/tenantIsolation';

// Add before model export
PaymentSchema.plugin(tenantIsolationPlugin, { 
  strict: true, 
  collectionName: 'aqar_payments' 
});
```

## Batch Edit Script

For efficiency, run this script to apply changes:

```bash
#!/bin/bash
# apply-tenant-isolation.sh

AQAR_MODELS_DIR="/Fixzit/models/aqar"

for model in Lead Booking Listing Project SavedSearch Favorite MarketingRequest Boost Payment; do
  FILE="$AQAR_MODELS_DIR/$model.ts"
  
  # Check if import already exists
  if ! grep -q "tenantIsolationPlugin" "$FILE"; then
    # Add import after mongoose import
    sed -i '' '/^import.*mongoose/a\
import { tenantIsolationPlugin } from "@/server/plugins/tenantIsolation";
' "$FILE"
    
    echo "Added import to $FILE"
  fi
done

echo "Done. Manually add schema.plugin() calls before model exports."
```

## Verification Steps

### 1. Verify All Models Have Plugin

```bash
# Should return all 10 Aqar model files
grep -l "tenantIsolationPlugin" models/aqar/*.ts

# Should return empty (no models missing the plugin)
for f in models/aqar/*.ts; do
  if ! grep -q "tenantIsolationPlugin" "$f"; then
    echo "MISSING: $f"
  fi
done
```

### 2. Create Integration Test

Create `/Fixzit/tests/integration/security/aqar-tenant-isolation.test.ts`:

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { AqarLead, AqarBooking, AqarListing } from '@/models/aqar';
import { setTenantContext, clearTenantContext } from '@/server/plugins/tenantIsolation';
import { connectTestDB, disconnectTestDB } from '@/tests/utils/db';
import mongoose from 'mongoose';

const ORG_A = new mongoose.Types.ObjectId();
const ORG_B = new mongoose.Types.ObjectId();

describe('Aqar Tenant Isolation', () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(() => {
    clearTenantContext();
  });

  describe('Lead Model', () => {
    it('prevents Org A from reading Org B leads', async () => {
      // Create lead for Org B
      setTenantContext({ orgId: ORG_B.toString() });
      const orgBLead = await AqarLead.create({
        orgId: ORG_B,
        source: 'LISTING_INQUIRY',
        inquirerName: 'Test User',
        inquirerPhone: '+966500000000',
        recipientId: new mongoose.Types.ObjectId(),
        intent: 'BUY',
      });

      // Try to access from Org A context
      setTenantContext({ orgId: ORG_A.toString() });
      const leads = await AqarLead.find({});
      
      // Should not see Org B's lead
      expect(leads.find(l => l._id.equals(orgBLead._id))).toBeUndefined();

      // Cleanup
      setTenantContext({ orgId: ORG_B.toString() });
      await AqarLead.deleteOne({ _id: orgBLead._id });
    });

    it('automatically adds orgId on create', async () => {
      setTenantContext({ orgId: ORG_A.toString() });
      
      const lead = await AqarLead.create({
        source: 'PHONE_CALL',
        inquirerName: 'Auto Org Test',
        inquirerPhone: '+966500000001',
        recipientId: new mongoose.Types.ObjectId(),
        intent: 'RENT',
      });

      expect(lead.orgId.toString()).toBe(ORG_A.toString());

      await AqarLead.deleteOne({ _id: lead._id });
    });
  });

  describe('Booking Model', () => {
    it('scopes queries to current tenant', async () => {
      setTenantContext({ orgId: ORG_A.toString() });
      const bookingA = await AqarBooking.create({
        orgId: ORG_A,
        listingId: new mongoose.Types.ObjectId(),
        guestId: new mongoose.Types.ObjectId(),
        hostId: new mongoose.Types.ObjectId(),
        checkInDate: new Date(),
        checkOutDate: new Date(Date.now() + 86400000),
        nights: 1,
        pricePerNight: 500,
        totalPrice: 500,
        platformFee: 75,
        hostPayout: 425,
        adults: 2,
      });

      setTenantContext({ orgId: ORG_B.toString() });
      const bookingB = await AqarBooking.create({
        orgId: ORG_B,
        listingId: new mongoose.Types.ObjectId(),
        guestId: new mongoose.Types.ObjectId(),
        hostId: new mongoose.Types.ObjectId(),
        checkInDate: new Date(),
        checkOutDate: new Date(Date.now() + 86400000),
        nights: 1,
        pricePerNight: 500,
        totalPrice: 500,
        platformFee: 75,
        hostPayout: 425,
        adults: 2,
      });

      // Org A should only see their booking
      setTenantContext({ orgId: ORG_A.toString() });
      const orgABookings = await AqarBooking.find({});
      expect(orgABookings.length).toBe(1);
      expect(orgABookings[0]._id.equals(bookingA._id)).toBe(true);

      // Cleanup
      setTenantContext({ orgId: ORG_A.toString() });
      await AqarBooking.deleteOne({ _id: bookingA._id });
      setTenantContext({ orgId: ORG_B.toString() });
      await AqarBooking.deleteOne({ _id: bookingB._id });
    });
  });

  describe('Super Admin Access', () => {
    it('allows Super Admin cross-tenant access with audit', async () => {
      // Create data in both orgs
      setTenantContext({ orgId: ORG_A.toString() });
      await AqarLead.create({
        source: 'EMAIL',
        inquirerName: 'Org A Lead',
        inquirerPhone: '+966500000002',
        recipientId: new mongoose.Types.ObjectId(),
        intent: 'BUY',
      });

      setTenantContext({ orgId: ORG_B.toString() });
      await AqarLead.create({
        source: 'EMAIL',
        inquirerName: 'Org B Lead',
        inquirerPhone: '+966500000003',
        recipientId: new mongoose.Types.ObjectId(),
        intent: 'BUY',
      });

      // Super Admin with skipTenantFilter
      setTenantContext({ 
        isSuperAdmin: true, 
        userId: 'super-admin-123',
        skipTenantFilter: true 
      });
      
      const allLeads = await AqarLead.find({});
      expect(allLeads.length).toBeGreaterThanOrEqual(2);

      // Cleanup
      await AqarLead.deleteMany({});
    });
  });
});
```

### 3. Run Tests

```bash
# Run tenant isolation tests
pnpm test tests/integration/security/aqar-tenant-isolation.test.ts

# Run full test suite
pnpm test
```

### 4. Check for Cross-Tenant Queries in Existing Code

```bash
# Find any raw MongoDB queries that might bypass tenant isolation
grep -r "\.collection\." app/api/aqar/ services/aqar/

# Find any aggregate() calls (may need tenant filtering)
grep -r "\.aggregate\(" app/api/aqar/ services/aqar/
```

## Migration Notes

### Existing Data

If existing data in production has missing `orgId` fields:

```javascript
// MongoDB migration script
db.aqar_leads.updateMany(
  { orgId: { $exists: false } },
  { $set: { orgId: ObjectId("DEFAULT_ORG_ID_HERE") } }
);

// Similar for other collections
db.aqar_bookings.updateMany(
  { orgId: { $exists: false } },
  { $set: { orgId: ObjectId("DEFAULT_ORG_ID_HERE") } }
);
```

### API Route Updates

Ensure all Aqar API routes set tenant context before queries:

```typescript
// Example: /app/api/aqar/leads/route.ts
import { setTenantContext } from '@/server/plugins/tenantIsolation';

export async function GET(req: Request) {
  const session = await getServerSession();
  
  // Set tenant context BEFORE any queries
  setTenantContext({ 
    orgId: session?.user?.orgId,
    userId: session?.user?.id,
    isSuperAdmin: session?.user?.role === 'SUPER_ADMIN',
  });
  
  // Now queries are automatically scoped
  const leads = await AqarLead.find({});
  // ...
}
```

## Related Issues

- SEC-003: Tenant Context Leakage (fix global state issue first)
- SEC-006: IDOR in crud-factory (similar pattern)

## Compliance

- ✅ Multi-tenant data isolation
- ✅ GDPR Article 5: Purpose limitation (data segregation)
- ✅ SOC 2 CC6.1: Logical access controls
