# Property Owner Portal - Implementation Guide

## Overview

Complete Property Owner Portal implementation for Fixzit FM module using **MongoDB Atlas + Mongoose**. This implementation provides property owners with comprehensive portfolio management, financial analytics, and operational oversight.

## Architecture

### Database: MongoDB Atlas + Mongoose 8.19.2

✅ **Correct Architecture Confirmed:**

- MongoDB Atlas (cloud-hosted)
- Mongoose 8.19.2 ODM
- Multi-tenancy via `tenantIsolationPlugin`
- Audit trails via `auditPlugin`
- Atomic operations with MongoDB `$inc` operator
- Transaction support for ACID compliance

## Features Implemented

### 1. **Data Models** (`server/models/owner/`)

All models use:

- ✅ `tenantIsolationPlugin` for automatic `orgId` scoping
- ✅ `auditPlugin` for change tracking
- ✅ Compound indexes for tenant-scoped uniqueness
- ✅ Virtual fields and pre-save hooks

**Models Created:**

#### AgentContract

- Real estate agent assignments per property
- Commission structures (percentage/fixed/hybrid)
- Responsibilities tracking
- Contract lifecycle management
- Performance metrics

#### UtilityMeter

- Water, electricity, gas, district cooling meters
- IoT integration support
- OCR bill scanning configuration
- Meter readings history
- Maintenance tracking

#### UtilityBill

- Bill processing and payment tracking
- Owner/tenant responsibility split
- OCR extraction with confidence scores
- Anomaly detection
- Finance module integration

#### MoveInOutInspection

- Digital inspection forms with:
  - Room-by-room assessment
  - Electrical inventory (sockets, lights, switches)
  - Plumbing fixtures (toilets, sinks, showers)
  - Furniture and appliances inventory
  - BEFORE/AFTER photos with timestamps
  - Digital signatures (owner, tenant, inspector)
- Damage comparison and cost calculation
- Security deposit deduction tracking

#### Warranty

- Equipment and service warranties
- Claim management with work order integration
- Service provider tracking
- Expiry notifications
- Maintenance requirement tracking

#### Advertisement

- Government advertisement permits
- Multi-channel publication tracking
- Performance metrics (views, inquiries, leads)
- Cost tracking and expiry management
- Compliance documentation

#### Delegation

- Approval workflow delegation
- Financial limit enforcement
- Time-bound access control
- Activity audit trail
- Security features (2FA, IP restrictions)

#### MailboxThread

- Owner communication hub
- Auto-generated request numbers
- Multi-party conversations
- SLA tracking
- Work order integration
- Support ticket linkage

### 2. **Property & Owner Model Extensions**

**Property.ts:**

```typescript
ownerPortal: {
  ownerId: ObjectId,
  ownerNickname: String,
  agentId: ObjectId,
  agentContractId: ObjectId,
  currentAdvertisementId: ObjectId,
  advertisementNumber: String,
  subscriptionTier: "BASIC" | "PRO" | "ENTERPRISE",
  enabledFeatures: [String],
  preferences: {...}
}
```

**Owner.ts:**

```typescript
subscription: {
  plan: "BASIC" | "PRO" | "ENTERPRISE",
  activeUntil: Date, // ⚡ CORRECT expiry check field
  features: {
    maxProperties: Number,
    utilitiesTracking: Boolean,
    roiAnalytics: Boolean,
    customReports: Boolean,
    apiAccess: Boolean,
    dedicatedSupport: Boolean,
    multiUserAccess: Boolean,
    advancedDelegation: Boolean
  }
},
nickname: String
```

### 3. **Finance Integration** (`server/services/owner/financeIntegration.ts`)

✅ **Addresses Code Review Findings:**

#### Idempotent Finance Posting

```typescript
async function postFinanceOnClose(input, session);
```

**Implemented Safeguards:**

1. ✅ **Status Check**: Prevents duplicate posting via `workOrder.financePosted` flag
2. ✅ **AFTER Photo Validation**: Enforces photo documentation for inspections
3. ✅ **MongoDB Transactions**: Atomic commit/rollback with `session.startTransaction()`
4. ✅ **Integration**: Works with existing `postingService.ts`

**Key Functions:**

- `postFinanceOnClose()` - Work order expense posting
- `postUtilityBillPayment()` - Utility expense posting
- `calculateNOI()` - Net Operating Income
- `calculateROI()` - Return on Investment
- `calculateCashOnCash()` - Cash flow return

### 4. **Analytics Service** (`server/services/owner/analytics.ts`)

MongoDB aggregation pipelines for:

#### Revenue Calculations

- Rental income aggregation
- Payment history analysis
- Period comparisons (3/6/9/12 months, YTD, custom)

#### Expense Tracking

- Maintenance costs (overall, per-unit, post-handover)
- Utility expenses
- Agent commissions
- Category breakdowns

#### ROI/NOI Analytics

```typescript
async function calculatePortfolioAnalytics(input: ROICalculationInput);
```

Returns:

- Portfolio summary (total properties, units, occupancy)
- Financial metrics (revenue, expenses, NOI, ROI)
- Property-level breakdowns
- Monthly trends
- Investment performance

#### Anomaly Detection

```typescript
async function detectUtilityAnomalies(...)
```

Identifies bills with consumption significantly above average (configurable threshold).

### 5. **Subscription Middleware** (`server/middleware/subscriptionCheck.ts`)

✅ **Correct Implementation:**

```typescript
async function checkSubscriptionStatus(ownerId, orgId, options);
```

**Key Features:**

1. ✅ **activeUntil Validation**: Uses correct field (NOT `createdAt`)
2. ✅ **402 Payment Required**: Returns appropriate HTTP status
3. ✅ **Feature-Level Gating**: Checks specific features
4. ✅ **Plan Hierarchy**: BASIC < PRO < ENTERPRISE
5. ✅ **Property Limits**: Enforces max properties per plan

**Subscription Plans:**

| Feature             | BASIC | PRO | ENTERPRISE |
| ------------------- | ----- | --- | ---------- |
| Max Properties      | 1     | 5   | Unlimited  |
| Utilities Tracking  | ❌    | ✅  | ✅         |
| ROI Analytics       | ❌    | ✅  | ✅         |
| Custom Reports      | ❌    | ✅  | ✅         |
| API Access          | ❌    | ❌  | ✅         |
| Dedicated Support   | ❌    | ❌  | ✅         |
| Multi-User Access   | ❌    | ✅  | ✅         |
| Advanced Delegation | ❌    | ✅  | ✅         |

### 6. **API Endpoints** (`app/api/owner/`)

#### GET /api/owner/properties

**Requirements:** BASIC subscription

Returns all properties owned by authenticated owner with:

- Property details (code, name, address, type)
- Unit summaries
- Optional financials
- Occupancy statistics

**Query Parameters:**

- `includeFinancials`: boolean
- `includeUnits`: boolean

#### GET /api/owner/units/[unitId]/history

**Requirements:** BASIC subscription

Comprehensive unit history including:

- Tenant history (current and past)
- Maintenance records (work orders)
- Move-in/move-out inspections
- Revenue history (payments)
- Utility consumption

**Query Parameters:**

- `include`: "tenants,maintenance,inspections,revenue,utilities" (or "all")
- `startDate`: ISO date
- `endDate`: ISO date

#### GET /api/owner/reports/roi

**Requirements:** PRO subscription + roiAnalytics feature

Financial analytics with ROI/NOI calculations:

- Portfolio metrics (revenue, expenses, NOI, ROI)
- Property-level breakdowns
- Unit-level details
- Monthly trends
- Investment performance

**Query Parameters:**

- `period`: "3m" | "6m" | "9m" | "12m" | "ytd" | "custom"
- `startDate`: ISO date (if custom)
- `endDate`: ISO date (if custom)
- `propertyId`: ObjectId (optional)
- `includeCapitalGains`: boolean

#### GET /api/owner/statements

**Requirements:** BASIC subscription

Comprehensive financial statements (similar to bank statements):

- All income (rental payments)
- All expenses (maintenance, utilities, commissions)
- Category breakdowns
- Period totals and net income

**Query Parameters:**

- `period`: "MTD" | "QTD" | "YTD" | "CUSTOM"
- `startDate`: ISO date (if CUSTOM)
- `endDate`: ISO date (if CUSTOM)
- `propertyId`: ObjectId (optional)
- `format`: "json" | "pdf" | "excel"

## Integration Points

### Existing Fixzit Modules

#### Finance Module

- ✅ Integrated via `postingService.ts`
- ✅ Automatic journal entry creation
- ✅ Ledger updates with double-entry bookkeeping
- ✅ Chart of accounts linkage

#### Work Orders Module

- ✅ Maintenance cost tracking
- ✅ Inspection integration
- ✅ Finance posting on completion
- ✅ Owner approval workflows

#### Tenant Management

- ✅ Lease tracking in unit history
- ✅ Move-in/out inspections
- ✅ Utility responsibility assignment
- ✅ Payment history

#### Approvals Module

- ✅ Delegation system
- ✅ Financial thresholds
- ✅ Owner notification
- ✅ Audit trails

## Multi-Tenancy

All Owner Portal features enforce strict multi-tenancy:

1. **Automatic Scoping**: `tenantIsolationPlugin` adds `orgId` to all queries
2. **Context Management**: `setTenantContext({ orgId })` for query filtering
3. **Compound Indexes**: `{ orgId: 1, field: 1 }` for uniqueness per tenant
4. **Owner Isolation**: `ownerId` scoping for owner-specific data

## Security

### Authentication

- Owner user authentication required
- `x-owner-id` and `x-org-id` headers
- Session management

### Authorization

- Subscription-based feature access
- Property ownership verification
- Delegation permission checks
- Financial limit enforcement

### Data Protection

- Multi-tenant isolation
- Encrypted credentials (IoT, OCR)
- Audit logging for all changes
- RBAC integration

## Code Quality Improvements

✅ **Addressed Code Review Findings:**

1. **Idempotency**: `workOrder.financePosted` status check
2. **AFTER Photos**: Validation before work order closure
3. **Correct NOI**: Revenue - Operating Expenses (proper calculation)
4. **Subscription Check**: Uses `activeUntil`, not `createdAt`
5. **Transactions**: MongoDB sessions for atomicity
6. **Type Safety**: Proper TypeScript interfaces, no `any` types

## Development Guidelines

### Adding New Features

1. **Create Model** in `server/models/owner/`

   ```typescript
   import { tenantIsolationPlugin } from '../../plugins/tenantIsolation';
   import { auditPlugin } from '../../plugins/auditPlugin';

   const MySchema = new Schema({...});
   MySchema.plugin(tenantIsolationPlugin);
   MySchema.plugin(auditPlugin);
   ```

2. **Add Service Logic** in `server/services/owner/`

   ```typescript
   import { connectToDatabase } from "@/lib/mongodb-unified";
   import { setTenantContext } from "@/server/plugins/tenantIsolation";
   ```

3. **Create API Endpoint** in `app/api/owner/`

   ```typescript
   import { requireSubscription } from "@/server/middleware/subscriptionCheck";

   const subCheck = await requireSubscription(req, {
     requireFeature: "yourFeature",
   });
   ```

### Testing Checklist

- [ ] Multi-tenancy: Data isolated per `orgId`
- [ ] Subscription: Feature gating works correctly
- [ ] Idempotency: Duplicate operations prevented
- [ ] Transactions: Rollback on errors
- [ ] Validation: Input sanitization
- [ ] Performance: Indexes optimized
- [ ] Audit: All changes logged

## Migration Notes

### From Development to Production

1. **Indexes**: Ensure all indexes created

   ```bash
   # Check indexes per collection
   db.agentcontracts.getIndexes()
   db.utilitybills.getIndexes()
   # ... etc
   ```

2. **Chart of Accounts**: Configure standard accounts
   - 5100: Maintenance Expense
   - 5200: Utility Expense
   - 2100: Accounts Payable
   - 1100: Cash/Bank

3. **Subscription Plans**: Initialize owner subscriptions

   ```typescript
   await OwnerModel.updateMany(
     { "subscription.plan": { $exists: false } },
     { $set: { "subscription.plan": "BASIC" } },
   );
   ```

4. **Counter Service**: Initialize for auto-increment fields
   ```typescript
   await CounterModel.create({
     name: "mailboxThread",
     orgId,
     value: 1000,
   });
   ```

## API Documentation

### OpenAPI 3.0 Specification

Full OpenAPI spec available at: `docs/owner-portal-openapi.yaml`

### GraphQL SDL

Full GraphQL schema available at: `docs/owner-portal-graphql.sdl`

### Postman Collection

Import-ready collection: `docs/owner-portal-postman.json`

## Support

For issues or questions:

1. Check existing work orders: `/app/api/owner/mailbox`
2. Create support ticket via mailbox system
3. Contact property agent if assigned

## License

Proprietary - Fixzit FM Module

---

**Implementation Status:** ✅ Complete

**Last Updated:** 2024-11-09

**MongoDB Version:** 8.19.2

**Architecture:** MongoDB Atlas + Mongoose
