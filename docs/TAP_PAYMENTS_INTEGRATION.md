# Tap Payments Integration for FixZit

Complete payment processing integration for Saudi market using [Tap Payments](https://tap.company).

## 📋 Overview

Tap Payments provides a unified API for accepting payments in the Saudi market through:

- **Mada** (Saudi debit cards)
- **Credit Cards** (Visa, Mastercard)
- **Apple Pay**
- **STC Pay**
- **Google Pay** (coming soon)

## 🚀 Features

✅ **Checkout Flow** - Create payment sessions with customer redirect  
✅ **Webhook Handling** - Real-time payment status updates  
✅ **Refunds** - Full and partial refunds  
✅ **Arabic Localization** - Full RTL support with Arabic strings  
✅ **Security** - Webhook signature verification  
✅ **Type Safety** - Complete TypeScript types for Tap API  
✅ **Error Handling** - User-friendly error messages in Arabic/English

## 📁 File Structure

```
lib/finance/
  └── tap-payments.ts                    # Core Tap client library

app/api/payments/tap/
  ├── checkout/
  │   └── route.ts                       # Create payment session
  └── webhook/
      └── route.ts                       # Handle payment webhooks

i18n/dictionaries/
  └── ar.ts                              # Arabic payment translations
```

## 🔧 Setup

### 1. Get Tap API Keys

1. Sign up at [Tap Dashboard](https://dashboard.tap.company)
2. Navigate to **Developers** → **API Keys**
3. Copy your:
   - **Secret Key** (sk_test_xxx or sk_live_xxx)
   - **Publishable Key** (pk_test_xxx or pk_live_xxx)
   - **Webhook Secret** (whsec_xxx)

### 2. Environment Variables

Add to your `.env.local`:

```bash
# Tap Payments - Environment-aware configuration
# TAP_ENVIRONMENT controls which keys are used: "test" (default) or "live"
TAP_ENVIRONMENT=test

# Server-side keys (NEVER expose to client)
TAP_TEST_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TAP_LIVE_SECRET_KEY=sk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Client-side keys (safe for browser)
NEXT_PUBLIC_TAP_TEST_PUBLIC_KEY=pk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_TAP_LIVE_PUBLIC_KEY=pk_live_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Webhook verification
TAP_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Additional Tap credentials
TAP_MERCHANT_ID=your_merchant_id
TAP_ACCOUNT_ID=your_account_id
TAP_API_KEY=your_api_key
TAP_GOSELL_USERNAME=gosell_username
TAP_GOSELL_PASSWORD=gosell_password

# Base URL for webhooks
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

> **Note**: The system automatically selects test vs live keys based on `TAP_ENVIRONMENT` (or `NODE_ENV` in production).
> See `lib/tapConfig.ts` for the central configuration helper.

### 3. Configure Webhooks

1. Go to [Tap Dashboard](https://dashboard.tap.company) → **Developers** → **Webhooks**
2. Add webhook URL: `https://yourdomain.com/api/payments/tap/webhook`
3. Select events:
   - ✅ `charge.created`
   - ✅ `charge.captured`
   - ✅ `charge.authorized`
   - ✅ `charge.declined`
   - ✅ `charge.failed`
   - ✅ `refund.created`
   - ✅ `refund.succeeded`
   - ✅ `refund.failed`

## 💻 Usage Examples

### Basic Payment Flow

```typescript
import {
  tapPayments,
  buildTapCustomer,
  buildRedirectUrls,
} from "@/lib/finance/tap-payments";

// 1. Create a payment session
async function createPayment(orderId: string, amount: number) {
  const response = await fetch("/api/payments/tap/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: 50.0, // Amount in SAR
      description: `Payment for Order #${orderId}`,
      orderId: orderId,
      metadata: {
        productName: "Premium Subscription",
        duration: "1 month",
      },
    }),
  });

  const data = await response.json();

  // 2. Redirect user to Tap payment page
  window.location.href = data.transactionUrl;
}

// 3. User completes payment on Tap's page
// 4. Tap sends webhook to /api/payments/tap/webhook
// 5. User is redirected to /payments/success or /payments/error
```

### Check Payment Status

```typescript
async function checkPaymentStatus(chargeId: string) {
  const response = await fetch(`/api/payments/tap/checkout/${chargeId}`);
  const data = await response.json();

  console.log("Payment status:", data.charge.status);
  // Possible statuses:
  // - INITIATED: Payment pending
  // - CAPTURED: Payment successful
  // - DECLINED: Payment declined
  // - FAILED: Payment failed
}
```

### Create a Refund

```typescript
import { tapPayments } from "@/lib/finance/tap-payments";

async function refundPayment(chargeId: string, amount: number) {
  const refund = await tapPayments.createRefund({
    charge_id: chargeId,
    amount: tapPayments.sarToHalalas(amount), // Convert SAR to halalas
    currency: "SAR",
    reason: "Customer requested refund",
    metadata: {
      refundRequestedBy: "admin@fixzit.sa",
      refundDate: new Date().toISOString(),
    },
  });

  console.log("Refund created:", refund.id);
  // Tap will send webhook when refund completes
}
```

### Amount Conversion

```typescript
import { tapPayments } from "@/lib/finance/tap-payments";

// Convert SAR to halalas (smallest currency unit)
const amountInHalalas = tapPayments.sarToHalalas(50.25); // 5025

// Convert halalas back to SAR
const amountInSAR = tapPayments.halalasToSAR(5025); // 50.25

// Format for display
const formatted = tapPayments.formatAmount(5025, "ar-SA");
// Output: "٥٠٫٢٥ ر.س"
```

## 🔒 Security

### Webhook Verification

All webhooks are automatically verified using HMAC SHA256 signatures:

```typescript
// This happens automatically in webhook route
const event = tapPayments.parseWebhookEvent(rawBody, signature);
// Throws error if signature is invalid
```

### Best Practices

1. **Never expose secret keys** - Keep `TAP_SECRET_KEY` server-side only
2. **Use HTTPS** - Tap requires HTTPS for production webhooks
3. **Verify amounts** - Always verify payment amount matches your records
4. **Log everything** - All webhook events are logged for audit trail
5. **Idempotency** - Check event IDs to prevent duplicate processing

## 📊 Webhook Event Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Tap
    participant Webhook

    User->>Frontend: Click "Pay Now"
    Frontend->>API: POST /api/payments/tap/checkout
    API->>Tap: Create Charge
    Tap-->>API: Charge ID + Transaction URL
    API-->>Frontend: Return Transaction URL
    Frontend->>Tap: Redirect to Tap payment page
    User->>Tap: Enter card details
    Tap->>Webhook: POST /api/payments/tap/webhook (charge.captured)
    Webhook->>Webhook: Update payment status in DB
    Webhook-->>Tap: 200 OK
    Tap-->>User: Redirect to success page
```

## 🌍 Arabic Localization

Full Arabic support with RTL layout:

```typescript
import { useTranslation } from '@/i18n/client';

export default function PaymentPage() {
  const { t } = useTranslation('ar');

  return (
    <div>
      <h1>{t('payments.tap.payWithTap')}</h1>
      {/* Output: الدفع عبر تاب */}

      <button>{t('payments.tap.payNow')}</button>
      {/* Output: ادفع الآن */}

      <p>{t('payments.tap.securePayment')}</p>
      {/* Output: دفع آمن ومشفر */}
    </div>
  );
}
```

## 🧪 Testing

### Test Cards

Use these test cards in **test mode** (`sk_test_xxx`):

| Card Number      | Type       | Result             |
| ---------------- | ---------- | ------------------ |
| 4242424242424242 | Visa       | Success            |
| 5200000000000007 | Mastercard | Success            |
| 4000000000000002 | Visa       | Declined           |
| 5111111111111118 | Mastercard | Insufficient Funds |

### Test Mode

- Test keys start with `sk_test_` and `pk_test_`
- No real money is charged
- Use test cards from Tap's [documentation](https://developers.tap.company/reference/testing)

### Production

- Switch to live keys: `sk_live_` and `pk_live_`
- Update `TAP_SECRET_KEY` in production environment
- Verify webhook URL is HTTPS

## 📝 Database Schema (TODO)

Add these fields to your payment/order models:

```typescript
interface Payment {
  id: string;
  tapChargeId: string; // Tap charge ID (chg_xxx)
  tapRefundId?: string; // Tap refund ID if refunded (ref_xxx)
  amount: number; // Amount in halalas
  currency: string; // "SAR"
  status:
    | "PENDING"
    | "CAPTURED"
    | "AUTHORIZED"
    | "DECLINED"
    | "FAILED"
    | "REFUNDED";
  userId: string;
  organizationId: string;
  orderId?: string;
  description: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  capturedAt?: Date;
  refundedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
}
```

## 🐛 Debugging

### Enable Debug Logs

All Tap API calls are logged automatically. Check your server logs for:

```typescript
[INFO] Creating Tap payment charge { amount: 5000, currency: "SAR" }
[INFO] Tap charge created successfully { chargeId: "chg_xxx", status: "INITIATED" }
[INFO] [Webhook] Charge captured - payment successful { chargeId: "chg_xxx" }
```

### Common Issues

**"Invalid webhook signature"**

- Check `TAP_WEBHOOK_SECRET` is correct
- Ensure you're using raw body (not parsed JSON)

**"Charge not found"**

- Verify you're using correct API keys (test vs live)
- Check charge ID format (should be `chg_xxx`)

**"Amount validation failed"**

- Amount must be in halalas (multiply SAR by 100)
- Amount must be positive integer

**Webhook not receiving**

- Check webhook URL is publicly accessible (use ngrok for local testing)
- Verify HTTPS in production
- Check Tap Dashboard webhook logs

## 📚 Resources

- [Tap API Documentation](https://developers.tap.company/reference)
- [Tap Dashboard](https://dashboard.tap.company)
- [Webhook Events Reference](https://developers.tap.company/reference/webhooks)
- [Testing Guide](https://developers.tap.company/reference/testing)

## 🤝 Support

For Tap-specific issues:

- Email: support@tap.company
- Phone: +965 2227 8888
- Dashboard: [dashboard.tap.company](https://dashboard.tap.company)

For FixZit integration issues:

- Email: support@fixzit.sa
- Phone: ٩٢٠٠٠٣٣٣١

## ✅ Checklist

Before going live:

- [ ] Switch to live API keys (`sk_live_`, `pk_live_`)
- [ ] Configure production webhook URL (HTTPS required)
- [ ] Test full payment flow end-to-end
- [ ] Verify webhook signature validation
- [ ] Add database persistence for payments
- [ ] Implement order fulfillment logic
- [ ] Set up monitoring/alerts for failed payments
- [ ] Add customer receipt emails
- [ ] Test refund flow
- [ ] Review security best practices

## 📄 License

This integration code is part of FixZit Enterprise and follows the project's license terms.

---

**Status**: ✅ Complete - Ready for testing  
**Last Updated**: November 15, 2025  
**Version**: 1.0.0
