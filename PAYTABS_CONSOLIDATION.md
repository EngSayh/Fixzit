# PayTabs File Consolidation

## Problem
Had two files with identical names but different purposes:
- `lib/paytabs.ts` 
- `services/paytabs.ts`

This created confusion about which file handled what functionality.

## Solution: Intelligent Renaming (Not Deletion)
Both files serve **different purposes** and are **both needed**. Renamed them to have clear, descriptive names:

### ✅ `lib/paytabs-gateway.ts` (formerly `lib/paytabs.ts`)
**Purpose**: PayTabs API integration - handles HTTP communication with PayTabs payment gateway

**Responsibilities**:
- `paytabsBase()` - region-based endpoint selection
- `createHppRequest()` - create hosted payment page requests
- `createPaymentPage()` - initialize payment pages with customer details
- `verifyPayment()` - query transaction status
- `validateCallback()` - validate callback signatures
- Payment method constants (MADA, Visa, MasterCard, Apple Pay, STC Pay, Tamara, Tabby)
- Currency constants (SAR, USD, EUR, AED)

**Used By**:
- `/app/api/payments/create/route.ts`
- `/app/api/payments/callback/route.ts`
- `/app/api/payments/paytabs/callback/route.ts`
- `/app/api/billing/subscribe/route.ts`

### ✅ `services/paytabs-subscription.ts` (formerly `services/paytabs.ts`)
**Purpose**: Subscription business logic - handles database operations for subscription lifecycle

**Responsibilities**:
- `normalizePayTabsPayload()` - normalize callback data from various PayTabs formats
- `finalizePayTabsTransaction()` - handle post-payment subscription activation
- Update `Subscription` model status (ACTIVE, PAST_DUE)
- Create/update `PaymentMethod` records (tokenization)
- Create/update `OwnerGroup` records (for owner subscriptions)
- Call `provisionSubscriber()` to provision tenant resources

**Used By**:
- `/app/api/paytabs/callback/route.ts`
- `/app/api/checkout/complete/route.ts`

## Import Changes
All imports automatically updated:
```typescript
// OLD
import { createPaymentPage } from '@/lib/paytabs';
import { finalizePayTabsTransaction } from '@/services/paytabs';

// NEW
import { createPaymentPage } from '@/lib/paytabs-gateway';
import { finalizePayTabsTransaction } from '@/services/paytabs-subscription';
```

## Verification
✅ TypeScript compilation: 0 errors  
✅ All imports updated  
✅ Both files retained with clear purposes  
✅ No functionality lost  

## Principle Applied
**"If files serve different purposes, rename them clearly; don't keep same filenames"**

This follows the user's guidance: files with different purposes should have descriptive names that reflect their actual functionality, not identical names that create confusion.
