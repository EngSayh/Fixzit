# Subscription System Documentation

## Overview

The Fixzit subscription system provides comprehensive multi-tenant subscription management with billing automation, seat allocation, usage tracking, and PayTabs payment integration.

## Architecture

### Data Models

#### Subscription Model (`server/models/Subscription.ts`)
Main subscription entity with PayTabs integration and billing history.

**Key Fields:**
- `tenant_id` (ObjectId): For CORPORATE subscriptions
- `owner_user_id` (ObjectId): For OWNER subscriptions  
- `subscriber_type` (enum): `CORPORATE` | `OWNER`
- `modules` (string[]): Activated modules from MODULE_KEYS enum
- `seats` (number): Total seats available (min: 1)
- `billing_cycle` (enum): `MONTHLY` | `ANNUAL`
- `currency` (enum): `USD` | `SAR`
- `price_book_id` (ObjectId): References PriceBook
- `amount` (number): Current subscription amount
- `status` (enum): `INCOMPLETE` | `ACTIVE` | `PAST_DUE` | `CANCELED`
- `next_billing_date` (Date): When next charge occurs
- `paytabs` (object): PayTabs recurring payment data
  - `profile_id`: PayTabs profile
  - `token`: Recurring token
  - `customer_email`: Customer email
  - `agreement_id`: Billing agreement
  - `cart_id`: Cart reference
- `billing_history` (array): Payment attempt records
  - `date`: Transaction date
  - `amount`: Amount charged
  - `currency`: Currency code
  - `tran_ref`: PayTabs transaction reference
  - `status`: `SUCCESS` | `FAILED` | `PENDING`
  - `error`: Error message if failed
- `metadata` (object): Extensible data
  - `seat_allocations`: Array of seat assignments
  - `usage_snapshot`: Current usage metrics
  - `cancel_at_period_end`: Cancellation flag

**Validation:**
- XOR constraint: Must have `tenant_id` OR `owner_user_id`, never both
- Enforced via pre-validate hook
- Audit trail via `auditPlugin` (createdBy, updatedBy)

**Indexes:**
- `{ tenant_id: 1, status: 1 }`: Tenant subscription lookup
- `{ owner_user_id: 1, status: 1 }`: Owner subscription lookup
- `{ billing_cycle: 1, status: 1, next_billing_date: 1 }`: Billing job queries

#### SubscriptionInvoice Model (`server/models/SubscriptionInvoice.ts`)
Invoice tracking for billing cycles.

**Key Fields:**
- `subscriptionId` (ObjectId): Parent subscription
- `amount` (number): Invoice amount
- `currency` (string): Currency code
- `status` (enum): `pending` | `paid` | `failed` | `cancelled`
- `dueDate` (Date): Payment due date
- `paidAt` (Date): Payment timestamp
- `paymentMethod` (string): Payment method used
- `orgId` (string): Auto-added by tenantIsolationPlugin

**Indexes:**
- `{ orgId: 1, status: 1, dueDate: 1 }`: Overdue invoice queries
- `{ orgId: 1, subscriptionId: 1 }`: Subscription invoice lookup

### Services

#### Subscription Billing Service (`server/services/subscriptionBillingService.ts`)
Handles billing cycles, invoice generation, and payment processing.

**Core Functions:**

##### `createSubscriptionFromCheckout(input: CreateSubscriptionInput)`
Creates new subscription from checkout flow.
- Validates price book
- Creates subscription with `INCOMPLETE` status
- Returns subscription for payment processing

##### `markSubscriptionPaid(subscriptionId: string, charge: PayTabsChargeResult)`
Marks subscription as paid after successful charge.
- Adds entry to billing_history
- Updates status to `ACTIVE` on success
- Calculates next billing date
- Stores PayTabs transaction reference

##### `runRecurringBillingJob(payTabsClient: PayTabsClient)`
Daily job to process due subscriptions.
- Finds all `ACTIVE` subscriptions with `next_billing_date <= now`
- Charges via PayTabs recurring API
- Updates billing status
- Returns summary: `{ processed, succeeded, failed }`

##### `cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean)`
Cancels subscription.
- If `cancelAtPeriodEnd=true`: Sets metadata flag, cancels at billing date
- If `cancelAtPeriodEnd=false`: Immediate cancellation, clears next_billing_date
- Updates status to `CANCELED`

**Helper Functions:**
- `addBillingPeriod(from: Date, cycle: string)`: Calculates next billing date
  - MONTHLY: +1 month
  - ANNUAL: +12 months

#### Subscription Seat Service (`server/services/subscriptionSeatService.ts`)
Manages seat allocation and usage tracking.

**Core Functions:**

##### `getSubscriptionForTenant(tenantId: string)`
Retrieves active subscription for tenant.
- Returns subscription with status `ACTIVE` or `PAST_DUE`

##### `getSubscriptionForOwner(ownerUserId: string)`
Retrieves active subscription for owner.
- Returns subscription with status `ACTIVE` or `PAST_DUE`

##### `allocateSeat(subscriptionId, userId, moduleKey, allocatedBy?)`
Allocates seat to user for specific module.
- Validates subscription is active
- Checks module is included in subscription
- Verifies available seats
- Prevents duplicate allocations
- Stores allocation in `metadata.seat_allocations`
- Returns updated subscription

##### `deallocateSeat(subscriptionId, userId, moduleKey?)`
Removes seat allocation from user.
- If `moduleKey` specified: Removes specific module
- If `moduleKey` omitted: Removes all modules for user
- Returns updated subscription

##### `getAvailableSeats(subscriptionId)`
Returns number of available seats.
- Calculates: `total_seats - allocated_seats`

##### `getSeatUsageReport(subscriptionId)`
Comprehensive seat usage metrics.
- Returns:
  - `totalSeats`: Subscription seat limit
  - `allocatedSeats`: Currently allocated
  - `availableSeats`: Available for allocation
  - `utilization`: Percentage used
  - `allocations`: Array of seat assignments
  - `usageSnapshot`: Current usage metrics

##### `validateModuleAccess(userId, moduleKey, tenantId?, ownerUserId?)`
Checks if user can access module.
- Finds subscription for tenant/owner
- Verifies module in subscription
- Checks user has seat for module
- Returns boolean

##### `updateUsageSnapshot(subscriptionId, snapshot)`
Records current system usage.
- Stores metrics in `metadata.usage_snapshot`:
  - `users`: Active user count
  - `properties`: Property count
  - `units`: Unit count
  - `work_orders`: Work order count
  - `active_users_by_module`: Per-module usage
- Sets `last_usage_sync` timestamp

##### `bulkAllocateSeats(subscriptionId, allocations[], allocatedBy?)`
Batch seat allocation.
- Processes array of `{ userId, moduleKey }` pairs
- Returns `{ success, failed, errors[] }`

### Cron Jobs

#### Billing Cron (`server/cron/billingCron.ts`)
Automated recurring billing.

**Schedule:** Daily at 2:00 AM
**Function:** `startBillingCron()`
**Process:**
1. Calls `runRecurringBillingJob(payTabsClient)`
2. Charges all subscriptions where `next_billing_date <= now`
3. Logs results: `{ processed, succeeded, failed }`

#### Usage Sync Cron (`server/cron/usageSyncCron.ts`)
Syncs usage metrics for all subscriptions.

**Schedule:** Daily at 3:00 AM
**Function:** `startUsageSyncCron()`
**Process:**
1. Finds all `ACTIVE` and `PAST_DUE` subscriptions
2. For each subscription:
   - Fetches usage counts from database
   - Calls `updateUsageSnapshot()`
3. Stores snapshot in subscription metadata

### API Routes

#### GET `/api/subscriptions/tenant`
Get current tenant's subscription.

**Authentication:** Required (session with tenantId)
**Response:**
```json
{
  "id": "subscription_id",
  "status": "ACTIVE",
  "modules": ["FM", "SOUQ"],
  "seats": 10,
  "billing_cycle": "MONTHLY",
  "amount": 299.99,
  "currency": "USD",
  "next_billing_date": "2024-02-01T00:00:00Z",
  "metadata": {}
}
```

#### POST `/api/subscribe/owner`
Create owner subscription checkout.

**Authentication:** Required
**Request Body:**
```json
{
  "ownerUserId": "user_id",
  "priceBookId": "pricebook_id",
  "modules": ["FM"],
  "seats": 1,
  "billingCycle": "MONTHLY",
  "currency": "USD"
}
```
**Response:** Checkout session with payment URL

#### POST `/api/billing/callback/paytabs`
PayTabs webhook for payment notifications.

**Headers:**
- `x-paytabs-signature`: Webhook signature
**Body:** PayTabs callback payload
**Process:**
1. Verifies signature
2. Finds subscription by reference
3. Updates payment status
4. Marks invoice as paid
5. Activates subscription

#### POST `/api/billing/charge-recurring`
Manual recurring charge trigger (admin only).

**Authentication:** Required (admin)
**Request Body:**
```json
{
  "subscriptionId": "subscription_id"
}
```
**Response:** Charge result

### Dashboard UI

#### Subscription Page (`app/(app)/subscription/page.tsx`)
Tenant subscription management interface.

**Features:**
- **Status Badge**: Color-coded subscription status
- **Plan Details Card**:
  - Billing cycle (MONTHLY/ANNUAL)
  - Seat count
  - Amount and currency
  - Next billing date
- **Active Modules Card**: Badges for enabled modules
- **Actions Card**:
  - Upgrade Plan button
  - Add Seats button
  - Cancel Subscription button

**Data Flow:**
1. Fetches from `/api/subscriptions/tenant`
2. Displays loading state
3. Shows "No Subscription" if none found
4. Renders subscription details

## Payment Integration

### PayTabs Recurring Billing

**Setup Flow:**
1. User completes checkout with PayTabs
2. PayTabs creates profile_id and recurring token
3. Subscription stores in `paytabs` field
4. Agreement created for recurring charges

**Recurring Charge Flow:**
1. Billing cron finds due subscriptions
2. Calls `payTabsClient.chargeRecurring()` with:
   - `profile_id`: Customer profile
   - `token`: Recurring token
   - `amount`: Subscription amount
   - `currency`: Subscription currency
3. PayTabs processes charge
4. Webhook callback updates subscription status
5. Invoice marked as paid

**Failure Handling:**
- On failure: Status → `PAST_DUE`
- Billing history records error
- Admin notified
- Retry logic in cron job

## Seat Management

### Allocation Strategy

**Corporate Subscriptions:**
- Tenant-wide seat pool
- Admins allocate seats to users
- Per-module seat allocation
- Track allocation timestamp and allocator

**Owner Subscriptions:**
- Owner gets all seats
- Typically 1 seat for individual owners
- Multi-property owners can purchase more seats

### Allocation Workflow

1. **Check Available Seats:**
   ```typescript
   const available = await getAvailableSeats(subscriptionId);
   if (available <= 0) throw new Error('No seats available');
   ```

2. **Allocate Seat:**
   ```typescript
   await allocateSeat(subscriptionId, userId, 'FM', adminId);
   ```

3. **Validate Access:**
   ```typescript
   const hasAccess = await validateModuleAccess(
     userId, 
     'FM', 
     tenantId
   );
   ```

4. **Deallocate on User Deactivation:**
   ```typescript
   await deallocateSeat(subscriptionId, userId);
   ```

### Usage Tracking

**Metrics Collected:**
- Active users per module
- Total property count
- Total unit count
- Total work order count
- Seat utilization percentage

**Snapshot Frequency:**
- Automated: Daily via cron (3:00 AM)
- On-demand: API call to update usage

## Status Lifecycle

### Subscription States

```
INCOMPLETE → ACTIVE → PAST_DUE → CANCELED
     ↓          ↑
     └──────────┘
   (payment success)
```

**INCOMPLETE:**
- Initial state after checkout creation
- Awaiting first payment
- Not billed

**ACTIVE:**
- Payment successful
- Services enabled
- Recurring billing active
- Users can be allocated seats

**PAST_DUE:**
- Payment failed
- Grace period active
- Services may be limited
- Retries scheduled
- Can return to ACTIVE on payment

**CANCELED:**
- Subscription terminated
- No further billing
- Services disabled
- Seat allocations removed

### State Transitions

**INCOMPLETE → ACTIVE:**
- Trigger: `markSubscriptionPaid()` with SUCCESS
- Actions:
  - Set `next_billing_date`
  - Add billing history entry
  - Enable services

**ACTIVE → PAST_DUE:**
- Trigger: Recurring payment failure
- Actions:
  - Add failed billing history entry
  - Send payment failure notification
  - Schedule retry

**PAST_DUE → ACTIVE:**
- Trigger: Successful retry or manual payment
- Actions:
  - Update `next_billing_date`
  - Add successful billing history entry
  - Re-enable services

**ACTIVE → CANCELED:**
- Trigger: `cancelSubscription()` with immediate=true
- Actions:
  - Clear `next_billing_date`
  - Deallocate all seats
  - Archive subscription data

**ACTIVE → CANCELED (scheduled):**
- Trigger: `cancelSubscription()` with cancelAtPeriodEnd=true
- Actions:
  - Set `metadata.cancel_at_period_end = true`
  - Continue billing until end date
  - Cancel on next billing date

## Security Considerations

### Access Control

**Tenant Isolation:**
- SubscriptionInvoice uses `tenantIsolationPlugin`
- Automatically filters by `orgId`
- Prevents cross-tenant data access

**XOR Validation:**
- Subscription must have `tenant_id` OR `owner_user_id`, never both
- Enforced via Mongoose pre-validate hook
- Prevents ambiguous ownership

**API Authorization:**
- Session-based authentication required
- Tenant/owner ID from session
- Cannot access other tenants' subscriptions

### Payment Security

**PayTabs Integration:**
- Webhook signature verification
- HTTPS-only communication
- PCI DSS compliant
- Tokenized payments (no card storage)

**Sensitive Data:**
- PayTabs tokens stored encrypted
- Billing history includes only transaction references
- No card details stored locally

## Testing Strategy

### Unit Tests

**Billing Service:**
- Create subscription from checkout
- Mark subscription as paid
- Calculate next billing date
- Cancel subscription (immediate and scheduled)
- Recurring billing job

**Seat Service:**
- Allocate seat (success and failure cases)
- Deallocate seat
- Get available seats
- Validate module access
- Bulk allocation

### Integration Tests

**Payment Flow:**
1. Create subscription checkout
2. Simulate PayTabs callback
3. Verify subscription activated
4. Verify invoice marked paid

**Billing Cycle:**
1. Create active subscription with due date in past
2. Run billing cron job
3. Verify charge attempted
4. Verify billing history updated

**Seat Management:**
1. Create subscription with 5 seats
2. Allocate 5 seats
3. Attempt 6th allocation (should fail)
4. Deallocate 1 seat
5. Allocate 1 seat (should succeed)

### E2E Tests

**Complete Subscription Flow:**
1. User creates checkout session
2. Completes payment via PayTabs
3. Subscription activated
4. Admin allocates seats to users
5. Users access modules
6. Billing cycle processes
7. User upgrades plan
8. User cancels subscription

## Monitoring & Observability

### Key Metrics

**Business Metrics:**
- Active subscriptions count
- MRR (Monthly Recurring Revenue)
- ARR (Annual Recurring Revenue)
- Churn rate
- Seat utilization average
- Payment success rate

**Technical Metrics:**
- Billing job duration
- Billing job success rate
- API response times
- PayTabs integration errors
- Database query performance

### Logging

**Log Levels:**
- `info`: Successful operations (subscription created, paid, canceled)
- `warn`: Recoverable issues (duplicate allocation, no seats available)
- `error`: Critical failures (payment failure, database error)

**Log Context:**
- Subscription ID
- User ID
- Tenant ID
- Transaction reference
- Error stack traces

### Alerts

**Critical Alerts:**
- Billing cron job failure
- Payment gateway unavailable
- High payment failure rate (>10%)
- Database connection errors

**Warning Alerts:**
- Individual payment failure
- Seat allocation conflicts
- Usage snapshot sync failure

## Troubleshooting Guide

### Common Issues

**Issue: Subscription stuck in INCOMPLETE**
- **Cause:** PayTabs callback not received
- **Solution:** 
  1. Check PayTabs webhook configuration
  2. Verify callback URL is accessible
  3. Manually trigger `markSubscriptionPaid()` if payment confirmed

**Issue: Recurring payment failing**
- **Cause:** Expired card, insufficient funds, or invalid token
- **Solution:**
  1. Check billing history for error details
  2. Contact customer for payment method update
  3. Use PayTabs dashboard to verify token status

**Issue: Seat allocation fails despite available seats**
- **Cause:** Metadata corruption or module not in subscription
- **Solution:**
  1. Verify subscription has module: `subscription.modules.includes(moduleKey)`
  2. Check metadata structure: `subscription.metadata.seat_allocations`
  3. Manually fix via MongoDB if needed

**Issue: Cron job not running**
- **Cause:** Node process not running or cron scheduler not started
- **Solution:**
  1. Verify `startBillingCron()` and `startUsageSyncCron()` called at startup
  2. Check process logs for errors
  3. Manually trigger: `await runRecurringBillingJob(payTabsClient)`

## Future Enhancements

### Planned Features

1. **Metered Billing:**
   - Usage-based pricing for work orders
   - Overage charges for excess usage
   - Tiered pricing per module

2. **Trial Periods:**
   - Free trial support (7, 14, 30 days)
   - Auto-conversion to paid
   - Trial expiration notifications

3. **Proration:**
   - Mid-cycle upgrades/downgrades
   - Prorated credit on downgrades
   - Immediate proration invoices

4. **Multi-Currency:**
   - Automatic currency conversion
   - Regional pricing tables
   - Currency-specific payment methods

5. **Subscription Tiers:**
   - Starter, Professional, Enterprise
   - Tier-based feature gates
   - Tier migration workflows

6. **Reporting Dashboard:**
   - Revenue charts
   - Churn analysis
   - Cohort analysis
   - Seat utilization trends

7. **Self-Service Portal:**
   - Update payment method
   - Upgrade/downgrade plan
   - Add/remove seats
   - View invoices
   - Download receipts

8. **Webhooks:**
   - Subscription created/updated/canceled
   - Payment succeeded/failed
   - Invoice generated/paid
   - Seat allocated/deallocated

## API Reference

### Types

```typescript
interface ISubscription {
  _id: ObjectId;
  tenant_id?: ObjectId;
  owner_user_id?: ObjectId;
  subscriber_type: 'CORPORATE' | 'OWNER';
  modules: string[];
  seats: number;
  billing_cycle: 'MONTHLY' | 'ANNUAL';
  currency: 'USD' | 'SAR';
  price_book_id: ObjectId;
  amount: number;
  status: 'INCOMPLETE' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED';
  paytabs?: PayTabsInfo;
  next_billing_date?: Date;
  billing_history: BillingHistoryEntry[];
  metadata?: Record<string, any>;
}

interface PayTabsInfo {
  profile_id: string;
  token: string;
  customer_email: string;
  last_tran_ref?: string;
  agreement_id?: string;
  cart_id?: string;
}

interface BillingHistoryEntry {
  date: Date;
  amount: number;
  currency: string;
  tran_ref?: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  error?: string;
}

interface SeatAllocation {
  userId: ObjectId;
  moduleKey: string;
  allocatedAt: Date;
  allocatedBy?: ObjectId;
}

interface UsageSnapshot {
  timestamp: Date;
  users: number;
  properties: number;
  units: number;
  work_orders: number;
  active_users_by_module: Record<string, number>;
}
```

## Maintenance

### Database Maintenance

**Index Optimization:**
- Monitor query performance
- Rebuild indexes monthly: `db.subscriptions.reIndex()`
- Add compound indexes for common queries

**Data Cleanup:**
- Archive CANCELED subscriptions older than 1 year
- Compress billing history older than 2 years
- Remove orphaned seat allocations

**Backups:**
- Daily automated backups
- Separate backup for subscription data
- Test restore procedure quarterly

### Code Maintenance

**Dependency Updates:**
- Review Mongoose updates quarterly
- Update PayTabs SDK when available
- Security patches applied immediately

**Refactoring:**
- Extract common validation logic
- Consolidate error handling
- Optimize database queries

**Documentation:**
- Update API docs on changes
- Document new features
- Maintain changelog

---

**Last Updated:** January 2024
**Version:** 1.0
**Maintainer:** Engineering Team
