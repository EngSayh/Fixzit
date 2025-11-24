# Comprehensive Implementation Plan - PayTabs Integration & Pending Items

**Date**: November 16, 2025  
**Status**: Ready for Implementation  
**Estimated Time**: 2-3 days

---

## 🎯 Overview

Complete implementation plan to resolve all pending items identified in the past 5 days, with focus on PayTabs payment gateway integration for the Saudi market.

---

## 📋 Pending Items Summary

### 🔴 CRITICAL (Must Complete)

1. ✅ **PayTabs Refund Integration** - Replace Tap Payments stub
2. ✅ **Session Context for Auth** - Remove hardcoded IDs
3. ✅ **Notification System** - Email/SMS for sellers

### 🟡 MEDIUM (Should Complete)

4. ✅ **Analytics Enhancements** - Rating/review fields
5. ✅ **Price History Tracking** - Audit trail
6. ✅ **BuyBox Type Safety** - Model methods

### 🟢 LOW (Nice to Have)

7. ✅ **IBAN Validation** - MOD-97 checksum
8. ✅ **Blueprint PDFs** - Knowledge base population

---

## 🏗️ Phase 1: PayTabs Integration (Day 1)

### Existing PayTabs Infrastructure ✅

```typescript
✅ lib/paytabs.ts - Base payment functions
✅ lib/paytabs.config.ts - Configuration
✅ Environment variables configured in GitHub
✅ Payment page creation working
✅ Signature validation implemented
```

### Task 1.1: Add PayTabs Refund Support

**File**: `lib/paytabs.ts`  
**Changes Needed**:

```typescript
// Add refund function
export async function createRefund(
  request: RefundRequest,
): Promise<RefundResponse> {
  validatePayTabsConfig();

  const payload = {
    profile_id: PAYTABS_CONFIG.profileId,
    tran_ref: request.originalTransactionId, // Original payment reference
    tran_type: "refund",
    tran_class: "ecom",
    cart_id: request.refundId,
    cart_currency: request.currency || "SAR",
    cart_amount: request.amount.toFixed(2),
    cart_description: request.reason || "Refund for order",
  };

  const MAX_ATTEMPTS = 3;
  const timeoutMs = PAYTABS_CONFIG.timeoutMs ?? 5000;
  const shouldRetryStatus = (status?: number) =>
    !status || status >= 500 || status === 429;

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `${PAYTABS_CONFIG.baseUrl}/payment/request`,
        {
          method: "POST",
          headers: {
            Authorization: PAYTABS_CONFIG.serverKey!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);
      const data = await response.json();

      if (
        !response.ok &&
        shouldRetryStatus(response.status) &&
        attempt < MAX_ATTEMPTS
      ) {
        const delay = Math.min(2000, 2 ** attempt * 200) + Math.random() * 100;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      if (data.tran_ref) {
        return {
          success: true,
          refundId: data.tran_ref,
          status: data.payment_result?.response_status || "A",
          message: data.payment_result?.response_message,
        };
      }

      return {
        success: false,
        error: data.result || "Refund failed",
      };
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      const retryableError =
        attempt < MAX_ATTEMPTS &&
        (error instanceof DOMException || shouldRetryStatus(undefined));

      if (retryableError) {
        const delay = Math.min(2000, 2 ** attempt * 200) + Math.random() * 100;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  return {
    success: false,
    error: lastError instanceof Error ? lastError.message : "Refund failed",
  };
}

// Add query function for refund status
export async function queryRefundStatus(
  tranRef: string,
): Promise<RefundStatusResponse> {
  validatePayTabsConfig();

  const response = await fetch(`${PAYTABS_CONFIG.baseUrl}/payment/query`, {
    method: "POST",
    headers: {
      Authorization: PAYTABS_CONFIG.serverKey!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      profile_id: PAYTABS_CONFIG.profileId,
      tran_ref: tranRef,
    }),
  });

  return await response.json();
}

// Types
export interface RefundRequest {
  originalTransactionId: string;
  refundId: string;
  amount: number;
  currency?: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface RefundResponse {
  success: boolean;
  refundId?: string;
  status?: string;
  message?: string;
  error?: string;
}

export interface RefundStatusResponse {
  tran_ref: string;
  payment_result: {
    response_status: string; // A = Approved, D = Declined, P = Pending
    response_code: string;
    response_message: string;
  };
  cart_id: string;
  cart_amount: string;
  cart_currency: string;
}
```

### Task 1.2: Update Refund Processor

**File**: `services/souq/claims/refund-processor.ts`  
**Lines to Replace**: 118-186

**Changes**:

```typescript
// Replace TODO section with actual PayTabs integration
private static async callPaymentGateway(refund: Refund): Promise<{
  transactionId: string;
  status: string;
}> {
  if (!refund.originalTransactionId) {
    throw new Error('Missing original transaction reference for refund');
  }

  // Use PayTabs for refunds
  const paytabsRefund = await paytabs.createRefund({
    originalTransactionId: refund.originalTransactionId,
    refundId: refund.refundId,
    amount: refund.amount,
    currency: 'SAR',
    reason: refund.reason,
    metadata: {
      claimId: refund.claimId,
      orderId: refund.orderId,
      buyerId: refund.buyerId,
      sellerId: refund.sellerId,
    },
  });

  if (!paytabsRefund.success) {
    throw new Error(paytabsRefund.error || 'Refund failed');
  }

  // Check status
  const status = paytabsRefund.status === 'A' ? 'SUCCEEDED' :
                 paytabsRefund.status === 'P' ? 'PENDING' : 'FAILED';

  if (status === 'FAILED') {
    throw new Error(`PayTabs refund failed: ${paytabsRefund.message}`);
  }

  return {
    transactionId: paytabsRefund.refundId!,
    status: status,
  };
}
```

### Task 1.3: Add Withdrawal Support (Settlements)

**File**: `services/souq/settlements/withdrawal-service.ts` (CREATE NEW)

```typescript
import { paytabs } from "@/lib/paytabs";
import { logger } from "@/lib/logger";

export interface WithdrawalRequest {
  sellerId: string;
  statementId: string;
  amount: number;
  bankAccount: {
    iban: string;
    accountHolderName: string;
    accountNumber: string;
    bankName: string;
  };
}

export async function processWithdrawal(request: WithdrawalRequest): Promise<{
  success: boolean;
  withdrawalId?: string;
  error?: string;
}> {
  try {
    // Validate IBAN
    if (!isValidIBAN(request.bankAccount.iban)) {
      return { success: false, error: "Invalid IBAN format" };
    }

    // Create payout via PayTabs
    const payout = await paytabs.createPayout({
      amount: request.amount,
      currency: "SAR",
      beneficiary: {
        name: request.bankAccount.accountHolderName,
        iban: request.bankAccount.iban,
        bank: request.bankAccount.bankName,
      },
      reference: `WITHDRAWAL-${request.statementId}`,
      description: `Seller withdrawal for statement ${request.statementId}`,
    });

    if (payout.success) {
      // Record withdrawal in database
      await recordWithdrawal({
        ...request,
        withdrawalId: payout.payoutId!,
        status: "processing",
        createdAt: new Date(),
      });

      return {
        success: true,
        withdrawalId: payout.payoutId,
      };
    } else {
      return {
        success: false,
        error: payout.error || "Payout failed",
      };
    }
  } catch (error) {
    logger.error("[Withdrawal] Error:", { error, request });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

> **Note:** Import `isValidIBAN` from the shared `lib/validators/iban.ts` module (see Phase 7) instead of declaring helper functions inline.

---

## 🔐 Phase 2: Session Context & Auth (Day 1-2)

### Task 2.1: Create Auth Context Hook

**File**: `hooks/useAuthSession.ts` (CREATE NEW)

```typescript
import { useSession } from "next-auth/react";

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  sellerId?: string; // For marketplace sellers
  isAuthenticated: boolean;
}

export function useAuthSession(): AuthSession | null {
  const { data: session } = useSession();
  const user = session?.user;

  if (!user || typeof user.id !== "string" || typeof user.email !== "string") {
    return null;
  }

  return {
    userId: user.id,
    email: user.email,
    name: typeof user.name === "string" ? user.name : "",
    role: typeof user.role === "string" && user.role ? user.role : "GUEST",
    tenantId: typeof user.tenantId === "string" ? user.tenantId : "",
    sellerId: typeof user.sellerId === "string" ? user.sellerId : undefined,
    isAuthenticated: true,
  };
}
```

### Task 2.2: Update Settlements Page

**File**: `app/marketplace/seller-central/settlements/page.tsx`

Replace line 79:

```typescript
// OLD:
sellerId="current-seller-id" // TODO: Get from session

// NEW:
const session = useAuthSession();
if (!session?.sellerId) {
  return <div>Please log in as a seller</div>;
}

// In WithdrawalForm:
sellerId={session.sellerId}
```

### Task 2.3: Update Test Files

**File**: `tests/copilot/copilot.spec.ts`  
**Line 230**: Replace TODO with actual authentication mock

```typescript
// TODO: Authenticate as tenant
// REPLACE WITH:
await page.evaluate(() => {
  localStorage.setItem(
    "auth-session",
    JSON.stringify({
      userId: "test-tenant-id",
      role: "TENANT",
      tenantId: "org-123",
      isAuthenticated: true,
    }),
  );
});
```

---

## 📧 Phase 3: Notification System (Day 2)

### Task 3.1: Email Service Integration

**File**: `services/notifications/email-service.ts` (ENHANCE)

```typescript
// Add seller notification templates
export const SellerNotificationTemplates = {
  BUDGET_LOW: {
    subject: (locale: string) =>
      locale === "ar"
        ? "تحذير: رصيد الإعلانات منخفض"
        : "Warning: Ad Budget Running Low",
    body: (data: { budgetRemaining: number; campaignName: string }) => `
      Your ad campaign "${data.campaignName}" has only ${data.budgetRemaining} SAR remaining.
      Consider adding funds to avoid campaign interruption.
    `,
  },

  BUDGET_DEPLETED: {
    subject: (locale: string) =>
      locale === "ar"
        ? "تنبيه: نفاد رصيد الإعلانات"
        : "Alert: Ad Budget Depleted",
    body: (data: { campaignName: string }) => `
      Your ad campaign "${data.campaignName}" has been paused due to insufficient funds.
      Add budget to resume advertising.
    `,
  },

  REFUND_PROCESSED: {
    subject: (locale: string) =>
      locale === "ar" ? "تم معالجة الاسترداد" : "Refund Processed",
    body: (data: { amount: number; orderId: string; refundId: string }) => `
      A refund of ${data.amount} SAR has been processed for order ${data.orderId}.
      Refund ID: ${data.refundId}
    `,
  },

  WITHDRAWAL_COMPLETE: {
    subject: (locale: string) =>
      locale === "ar" ? "تم السحب بنجاح" : "Withdrawal Completed",
    body: (data: { amount: number; iban: string }) => `
      Your withdrawal of ${data.amount} SAR has been processed to account ${data.iban}.
    `,
  },
};

export async function sendSellerNotification(
  sellerId: string,
  template: keyof typeof SellerNotificationTemplates,
  data: Record<string, unknown>,
): Promise<void> {
  const seller = await getSeller(sellerId);
  if (!seller) {
    throw new Error(`Seller ${sellerId} not found`);
  }

  const locale = seller.preferredLocale || "ar";
  const templateConfig = SellerNotificationTemplates[template];

  const attemptDelivery = async (action: string, fn: () => Promise<void>) => {
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await fn();
        return;
      } catch (error) {
        logger.error(`[SellerNotification] ${action} failed`, {
          sellerId,
          template,
          attempt,
          error,
        });
        if (attempt === MAX_ATTEMPTS) {
          throw error;
        }
        const delay = 200 * 2 ** attempt + Math.random() * 100;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };

  await attemptDelivery("email", () =>
    sendEmail({
      to: seller.email,
      subject: templateConfig.subject(locale),
      html: templateConfig.body(data),
    }),
  );

  if (seller.phone) {
    await attemptDelivery("sms", () =>
      sendSMS({
        to: seller.phone,
        message: templateConfig.subject(locale),
      }),
    );
  }
}
```

### Task 3.2: Update Budget Manager

**File**: `services/souq/ads/budget-manager.ts`

**Lines 214, 246**: Replace TODOs with actual notification calls

```typescript
// Line 214:
// TODO: Send email/notification to seller
await sendSellerNotification(sellerId, "BUDGET_LOW", {
  budgetRemaining: campaign.budget.remaining,
  campaignName: campaign.name,
});

// Line 246:
// TODO: Send notification
await sendSellerNotification(sellerId, "BUDGET_DEPLETED", {
  campaignName: campaign.name,
});
```

### Task 3.3: Update Refund Processor

**File**: `services/souq/claims/refund-processor.ts`  
**Line 271**: Add notification

```typescript
// TODO: Send email/SMS notifications
await sendSellerNotification(refund.sellerId, "REFUND_PROCESSED", {
  amount: refund.amount,
  orderId: refund.orderId,
  refundId: refund.refundId,
});
```

---

## 📊 Phase 4: Analytics Enhancements (Day 2-3)

### Task 4.1: Update Product Model

**File**: `models/Product.ts` (or equivalent)

```typescript
// Add fields to Product schema
{
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  ratingDistribution: {
    1: { type: Number, default: 0 },
    2: { type: Number, default: 0 },
    3: { type: Number, default: 0 },
    4: { type: Number, default: 0 },
    5: { type: Number, default: 0 },
  }
}
```

### Task 4.2: Update Analytics Service

**File**: `services/souq/analytics/analytics-service.ts`

**Lines 270-271**: Replace TODOs with actual queries

```typescript
// OLD:
averageRating: 0, // TODO: Add rating field to Product model
reviewCount: 0 // TODO: Add review count to Product model

// NEW:
averageRating: product.averageRating || 0,
reviewCount: product.reviewCount || 0
```

**Line 284**: Implement stock query

```typescript
// TODO: Query SouqListing model for actual stock levels
const listings = await SouqListing.find({
  productId: { $in: productIds },
  status: "active",
}).select("stock quantity");

const stockLevels = listings.map((listing) => ({
  productId: listing.productId,
  stock: listing.stock || listing.quantity || 0,
  status: listing.stock > 0 ? "in_stock" : "out_of_stock",
}));
```

---

## 📈 Phase 5: Price History Tracking (Day 3)

### Task 5.1: Create Price History Collection

**File**: `models/PriceHistory.ts` (CREATE NEW)

```typescript
import mongoose from "mongoose";

const priceHistorySchema = new mongoose.Schema(
  {
    listingId: { type: String, required: true, index: true },
    sellerId: { type: String, required: true, index: true },
    productId: { type: String, required: true, index: true },

    // Price changes
    oldPrice: { type: Number, required: true },
    newPrice: { type: Number, required: true },
    change: { type: Number }, // Calculated: newPrice - oldPrice
    changePercent: { type: Number }, // Calculated: (change / oldPrice) * 100

    // Context
    reason: {
      type: String,
      enum: [
        "manual",
        "auto_repricer",
        "competitor_match",
        "promotion",
        "cost_change",
        "demand_adjustment",
      ],
      required: true,
    },
    competitorPrice: { type: Number }, // If triggered by competitor

    // Metadata
    createdAt: { type: Date, default: Date.now, index: true },
    createdBy: { type: String }, // userId if manual

    // Auto-repricer metadata
    autoRepricerRule: { type: String }, // Rule ID that triggered change
    competitorListingId: { type: String }, // Competitor that triggered change

    // Impact tracking
    salesBefore: { type: Number }, // 7-day avg before change
    salesAfter: { type: Number }, // 7-day avg after change (filled later)
  },
  {
    timestamps: true,
  },
);

// Indexes for efficient queries
priceHistorySchema.index({ listingId: 1, createdAt: -1 });
priceHistorySchema.index({ sellerId: 1, createdAt: -1 });
priceHistorySchema.index({ productId: 1, createdAt: -1 });

export const PriceHistory = mongoose.model("PriceHistory", priceHistorySchema);
```

### Task 5.2: Update Auto Repricer Service

**File**: `services/souq/auto-repricer-service.ts`  
**Line 296**: Implement price history tracking

```typescript
// TODO: Implement price history tracking in a separate collection

// REPLACE WITH:
try {
  await PriceHistory.create({
    listingId: listing._id,
    sellerId: listing.sellerId,
    productId: listing.productId,
    oldPrice: listing.price,
    newPrice: suggestedPrice,
    change: suggestedPrice - listing.price,
    changePercent: ((suggestedPrice - listing.price) / listing.price) * 100,
    reason: "auto_repricer",
    competitorPrice: buyBoxListing?.price,
    competitorListingId: buyBoxListing?._id,
    autoRepricerRule: rule._id,
    salesBefore: await calculate7DayAvgSales(listing._id),
  });
} catch (error) {
  logger.error("Failed to persist price history entry", {
    error,
    listingId: listing._id,
    ruleId: rule._id,
  });
  metrics?.increment("auto_reprice.price_history_failure");
}
```

---

## 🔧 Phase 6: Type Safety Improvements (Day 3)

### Task 6.1: Add BuyBox Methods to Models

**File**: `models/Seller.ts`

```typescript
// Add method to schema
sellerSchema.methods.canCompeteInBuyBox = function (): boolean {
  return (
    this.accountHealth >= 90 && // Good standing
    this.metrics.orderDefectRate < 0.01 && // < 1% defects
    this.metrics.lateShipmentRate < 0.04 && // < 4% late
    this.kyc.status === "approved" &&
    this.status === "active"
  );
};
```

**File**: `models/SouqListing.ts`

```typescript
// Add method to schema
listingSchema.methods.checkBuyBoxEligibility = function (): {
  eligible: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  if (this.stock <= 0) {
    reasons.push("out_of_stock");
  }

  if (this.price <= 0) {
    reasons.push("invalid_price");
  }

  if (this.condition !== "new" && this.condition !== "like_new") {
    reasons.push("condition_not_eligible");
  }

  if (this.fulfillmentMethod !== "FBF") {
    // Fulfilled by Fixzit
    reasons.push("not_fbf");
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
};
```

### Task 6.2: Update BuyBox Service

**File**: `services/souq/buybox-service.ts`

**Lines 137, 147, 168**: Replace TODOs with method calls

```typescript
// Line 137:
// TODO(type-safety): Add canCompeteInBuyBox method to Seller model
if (!seller.canCompeteInBuyBox()) {
  continue;
}

// Line 147:
// TODO(type-safety): Add checkBuyBoxEligibility method to Listing model
const eligibility = listing.checkBuyBoxEligibility();
if (!eligibility.eligible) {
  continue;
}

// Line 168:
// TODO(type-safety): Add checkBuyBoxEligibility method to Listing model
const eligibility = listing.checkBuyBoxEligibility();
if (!eligibility.eligible) {
  return null;
}
```

---

## 📝 Phase 7: IBAN Validation Enhancement (Day 3)

### Task 7.1: Shared IBAN Validator Module

**File**: `lib/validators/iban.ts` (NEW)

```typescript
const COUNTRY_PATTERNS: Record<string, RegExp> = {
  SA: /^SA\d{22}$/i,
};
const MODULUS = BigInt(97);

export function validateIBANChecksum(rawIban: string): boolean {
  if (!rawIban) return false;
  const iban = rawIban.replace(/\s/g, "").toUpperCase();
  const countryCode = iban.slice(0, 2);
  const pattern = COUNTRY_PATTERNS[countryCode];

  if (pattern && !pattern.test(iban)) {
    return false;
  }

  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const numeric = rearranged.replace(/[A-Z]/g, (char) =>
    String(char.charCodeAt(0) - 55),
  );

  let remainder = BigInt(0);
  for (const digit of numeric) {
    remainder = (remainder * BigInt(10) + BigInt(Number(digit))) % MODULUS;
  }

  return remainder === BigInt(1);
}

export function isValidIBAN(iban: string): boolean {
  return validateIBANChecksum(iban);
}
```

**Updates:**

- `services/souq/seller-kyc-service.ts`: `import { validateIBANChecksum } from '@/lib/validators/iban';` and throw an error if the helper returns `false`.
- `services/payments/withdrawal-service.ts`: `import { isValidIBAN } from '@/lib/validators/iban';` (already used above).
- Remove duplicated checksum helpers across the codebase.

---

## 🎯 Phase 8: Testing & Verification (Day 3)

### Task 8.1: Integration Tests

**File**: `tests/paytabs-refund.test.ts` (CREATE NEW)

```typescript
import { createRefund, queryRefundStatus } from "@/lib/paytabs";

describe("PayTabs Refund Integration", () => {
  it("should create refund successfully", async () => {
    const result = await createRefund({
      originalTransactionId: "TST2409240000123",
      refundId: "REF-TEST-001",
      amount: 100.0,
      currency: "SAR",
      reason: "Customer request",
    });

    expect(result.success).toBe(true);
    expect(result.refundId).toBeDefined();
    expect(result.status).toMatch(/A|P/); // Approved or Pending
  });

  it("should query refund status", async () => {
    const status = await queryRefundStatus("TST2409240000123");

    expect(status.tran_ref).toBeDefined();
    expect(status.payment_result).toBeDefined();
    expect(status.cart_amount).toBeDefined();
  });
});
```

### Task 8.2: End-to-End Tests

**File**: `tests/e2e/seller-withdrawal.spec.ts` (CREATE NEW)

```typescript
import { test, expect } from "@playwright/test";

test.describe("Seller Withdrawal Flow", () => {
  test("should complete withdrawal successfully", async ({ page }) => {
    // Login as seller
    await page.goto("/marketplace/seller-central/settlements");

    // Check balance
    await expect(
      page.locator('[data-testid="available-balance"]'),
    ).toBeVisible();

    // Click withdraw button
    await page.click('[data-testid="withdraw-button"]');

    // Fill withdrawal form
    await page.fill('[name="amount"]', "1000");
    await page.fill('[name="iban"]', "SA0380000000608010167519");
    await page.fill('[name="accountHolderName"]', "Test Seller");
    await page.fill('[name="bankName"]', "Al Rajhi Bank");

    // Submit
    await page.click('[data-testid="submit-withdrawal"]');

    // Verify success
    await expect(page.locator(".success-message")).toBeVisible();
  });
});
```

---

## 📊 Implementation Checklist

### Day 1 (6-8 hours)

- [ ] Add PayTabs refund functions to lib/paytabs.ts
- [ ] Update refund-processor.ts to use PayTabs
- [ ] Create withdrawal-service.ts
- [ ] Create useAuthSession hook
- [ ] Update settlements page with session context
- [ ] Update copilot tests with auth mock
- [ ] Test refund flow in staging

### Day 2 (6-8 hours)

- [ ] Create email notification templates
- [ ] Update budget-manager.ts with notifications
- [ ] Update refund-processor.ts with notifications
- [ ] Add rating/review fields to Product model
- [ ] Update analytics-service.ts queries
- [ ] Test notification delivery
- [ ] Test analytics dashboard

### Day 3 (4-6 hours)

- [ ] Create PriceHistory model
- [ ] Update auto-repricer-service.ts with tracking
- [ ] Add BuyBox methods to models
- [ ] Update buybox-service.ts with methods
- [ ] Implement MOD-97 IBAN validation
- [ ] Write integration tests
- [ ] Write E2E tests
- [ ] Final testing & deployment

---

## 🚀 Deployment Strategy

### Pre-Deployment

1. ✅ Verify PayTabs credentials in GitHub secrets
2. ✅ Run all tests (`pnpm test`)
3. ✅ TypeScript compilation (`pnpm tsc --noEmit`)
4. ✅ Build check (`pnpm build`)

### Deployment Steps

1. Deploy to staging environment
2. Test refund flow with test transaction
3. Test withdrawal flow with test seller
4. Verify notifications are sent
5. Check analytics data accuracy
6. Monitor error logs for 24 hours
7. Deploy to production with feature flag
8. Gradual rollout (10% → 50% → 100%)

### Rollback Plan

- Feature flags for each component
- Database migrations are reversible
- PayTabs transactions are idempotent
- Notifications can be disabled independently

---

## 📈 Success Metrics

### Technical Metrics

- ✅ TypeScript: 0 errors
- ✅ Test Coverage: >80%
- ✅ API Response Time: <500ms
- ✅ Refund Success Rate: >95%

### Business Metrics

- Refund Processing Time: <24 hours
- Withdrawal Processing Time: <48 hours
- Notification Delivery Rate: >99%
- Seller Satisfaction: >4.5/5

---

## 🎯 Post-Implementation

### Monitoring

- Set up PayTabs webhook monitoring
- Track refund success/failure rates
- Monitor notification delivery
- Alert on withdrawal failures

### Documentation

- Update API documentation
- Create seller guide for withdrawals
- Document refund process
- Update admin manual

### Future Enhancements

- Multi-currency support (AED, KWD)
- Partial refunds
- Refund analytics dashboard
- Automated reconciliation

---

**Total Estimated Time**: 2-3 days  
**Complexity**: Medium  
**Risk Level**: Low (well-tested infrastructure exists)  
**Dependencies**: PayTabs credentials (✅ already configured)

**Status**: Ready to implement immediately
