# Fixzit Business Services (`services/`)

> **Version:** 2.0.26  
> **Last Updated:** November 27, 2025

This directory contains domain-specific business logic services organized by product vertical.

---

## Directory Structure

```
services/
├── aqar/                    # Real Estate (Aqar) Services
│   ├── fm-lifecycle-service.ts      # Property lifecycle management
│   ├── offline-cache-service.ts     # Offline-first data sync
│   ├── pricing-insights-service.ts  # Market pricing analytics
│   └── recommendation-engine.ts     # Property recommendations
│
├── hr/                      # Human Resources Services
│   ├── ksaPayrollService.ts         # KSA payroll calculations
│   └── wpsService.ts                # Wage Protection System integration
│
├── notifications/           # Notification Services
│   ├── fm-notification-engine.ts    # FM notification rules
│   └── seller-notification-service.ts # Souq seller notifications
│
└── souq/                    # E-commerce (Souq) Services
    ├── account-health-service.ts    # Seller account health
    ├── auto-repricer-service.ts     # Dynamic pricing
    ├── buybox-service.ts            # Buy box competition
    ├── claims/                      # Claims management
    ├── fulfillment-service.ts       # Order fulfillment
    ├── inventory-service.ts         # Inventory management
    ├── returns-service.ts           # RMA & returns
    ├── reviews/                     # Product reviews
    ├── search-indexer-service.ts    # Search indexing
    ├── seller-kyc-service.ts        # Seller verification
    └── settlements/                 # Payment settlements
```

---

## Service Patterns

### Standard Service Structure

All services follow a consistent pattern:

```typescript
// services/example/example-service.ts

/**
 * ExampleService - Brief description of the service
 * 
 * @module services/example
 */

interface ExampleParams {
  // Input parameters
}

interface ExampleResult {
  // Return type
}

class ExampleService {
  /**
   * Primary operation description
   */
  async doSomething(params: ExampleParams): Promise<ExampleResult> {
    // Implementation
  }
}

// Export singleton instance
export const exampleService = new ExampleService();
```

---

## Souq Services

### Returns Service (`souq/returns-service.ts`)

Handles the full RMA (Return Merchandise Authorization) workflow:

```typescript
import { returnsService } from '@/services/souq/returns-service';

// Initiate a return
const rmaId = await returnsService.initiateReturn({
  orderId: 'order-123',
  buyerId: 'buyer-456',
  items: [{ listingId: 'listing-789', quantity: 1, reason: 'defective' }],
});

// Inspect returned item
await returnsService.inspectReturn({
  rmaId,
  inspectorId: 'inspector-001',
  condition: 'good',
  restockable: true,
});

// Process refund (uses atomic operations to prevent double-processing)
await returnsService.processRefund({
  rmaId,
  refundAmount: 99.99,
  refundMethod: 'original_payment',
  processorId: 'admin-001',
});
```

**Race Condition Protection:**
- Uses MongoDB `findOneAndUpdate` with status conditions
- Prevents double-processing of refunds
- Supports concurrent background jobs safely

### Inventory Service (`souq/inventory-service.ts`)

Manages product inventory with reservation support:

```typescript
import { inventoryService } from '@/services/souq/inventory-service';

// Reserve inventory for cart
const reserved = await inventoryService.reserve({
  listingId: 'listing-123',
  quantity: 2,
  reservationId: 'cart-456',
});

// Commit on order completion
await inventoryService.commit(reserved.reservationId);

// Release on cart abandonment
await inventoryService.release(reserved.reservationId);
```

### Fulfillment Service (`souq/fulfillment-service.ts`)

Handles shipping and delivery:

```typescript
import { fulfillmentService } from '@/services/souq/fulfillment-service';

// Get shipping rates
const rates = await fulfillmentService.getRates({
  origin: 'Riyadh, Riyadh Province',
  destination: 'Jeddah, Makkah Province',
  weight: 2.5,
  dimensions: { length: 30, width: 20, height: 15, unit: 'cm' },
});

// Create shipment
const shipment = await fulfillmentService.createShipment({
  orderId: 'order-123',
  carrier: 'SPL',
  serviceType: 'standard',
});
```

---

## Aqar Services

### Recommendation Engine (`aqar/recommendation-engine.ts`)

AI-powered property recommendations:

```typescript
import { recommendationEngine } from '@/services/aqar/recommendation-engine';

const recommendations = await recommendationEngine.getRecommendations({
  userId: 'user-123',
  preferences: {
    city: 'Riyadh',
    budget: { min: 500000, max: 1000000 },
    bedrooms: 3,
  },
  limit: 10,
});
```

### Pricing Insights (`aqar/pricing-insights-service.ts`)

Market analysis and price suggestions:

```typescript
import { pricingInsightsService } from '@/services/aqar/pricing-insights-service';

const insights = await pricingInsightsService.analyze({
  propertyType: 'apartment',
  city: 'Riyadh',
  district: 'Al Olaya',
  areaSqm: 150,
});

console.log(insights.suggestedPrice); // Based on market data
```

---

## HR Services

### KSA Payroll (`hr/ksaPayrollService.ts`)

Saudi Arabia payroll calculations with GOSI compliance:

```typescript
import { ksaPayrollService } from '@/services/hr/ksaPayrollService';

const payslip = await ksaPayrollService.calculatePayroll({
  employeeId: 'emp-123',
  month: 11,
  year: 2025,
  basicSalary: 10000,
  allowances: { housing: 2500, transport: 500 },
});

// Includes GOSI deductions, tax calculations, etc.
```

### WPS Service (`hr/wpsService.ts`)

Wage Protection System file generation:

```typescript
import { wpsService } from '@/services/hr/wpsService';

const wpsFile = await wpsService.generateFile({
  organizationId: 'org-123',
  month: 11,
  year: 2025,
});

// Returns SIF file for bank submission
```

---

## Notification Services

### FM Notification Engine (`notifications/fm-notification-engine.ts`)

Facility Management notifications:

```typescript
import { fmNotificationEngine } from '@/services/notifications/fm-notification-engine';

await fmNotificationEngine.notify({
  type: 'work-order-assigned',
  workOrderId: 'wo-123',
  technicianId: 'tech-456',
  channels: ['push', 'email'],
});
```

---

## Best Practices

### 1. Dependency Injection

Services should accept dependencies for testability:

```typescript
class MyService {
  constructor(
    private readonly db = getDb(),
    private readonly cache = cacheService,
  ) {}
}
```

### 2. Error Handling

Use domain-specific errors:

```typescript
import { ServiceError } from '@/lib/errors';

class InventoryError extends ServiceError {
  constructor(code: string, message: string) {
    super(`INVENTORY_${code}`, message);
  }
}

throw new InventoryError('INSUFFICIENT', 'Not enough stock');
```

### 3. Atomic Operations

Use MongoDB atomic operations for race-sensitive operations:

```typescript
// ✅ Good - atomic operation
const result = await collection.findOneAndUpdate(
  { _id: id, status: 'pending' },
  { $set: { status: 'processing' } },
  { returnDocument: 'after' }
);

// ❌ Bad - race condition
const doc = await collection.findOne({ _id: id });
if (doc.status === 'pending') {
  await collection.updateOne({ _id: id }, { $set: { status: 'processing' } });
}
```

### 4. Logging

Include correlation IDs in all logs:

```typescript
import { logger } from '@/lib/logger';

async function processOrder(orderId: string) {
  logger.info('Processing order', { orderId, service: 'fulfillment' });
  // ...
}
```

---

## Testing

Service tests are in `tests/services/`:

```bash
# Run all service tests
pnpm test tests/services/

# Run specific service tests
pnpm test tests/services/returns-service.test.ts

# Run with coverage
pnpm test:coverage services/
```

---

## Related Documentation

- [Domain Logic](../domain/README.md)
- [API Routes](../app/api/README.md)
- [Queue Jobs](../lib/queues/README.md)
- [Database Models](../server/models/README.md)
