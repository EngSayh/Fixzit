# Payment Idempotency & Retry Matrix

This reference enumerates every payment-adjacent operation and documents whether
it is idempotent, safe to retry automatically, and which safeguards are in
place. Engineers should consult this table before adding new retries or queues.

## Shared primitives

* `server/security/idempotency.ts` exposes `createIdempotencyKey` and
  `withIdempotency` for deterministic deduplication.
* `lib/resilience/retry.ts` + `lib/resilience/circuit-breaker.ts` provide the
  only approved retry/backoff implementation.
* `config/service-timeouts.ts` defines timeout & retry budgets so that retry
  policies stay in sync with the external vendor SLAs.

## Operation matrix

| Operation | Resource | Idempotent? | Safe to retry? | Mechanism | Notes |
| --- | --- | --- | --- | --- | --- |
| PayTabs payment page creation (`createPaymentPage`, `/api/payments/paytabs`) | `cart_id` (order id) | ✅ (per PayTabs docs) | ✅ (3 retries, 15 s timeout) | Deterministic `cart_id` + `fetchWithRetry` | Duplicate requests reuse the same `cart_id` so PayTabs returns the existing `tran_ref`. |
| PayTabs verification (`verifyPayment`) | `tran_ref` | ✅ | ✅ (3 retries, 8 s timeout) | Queries are read-only. | Always call before marking an order as paid. |
| PayTabs refund (`createRefund`) | `refundId` + `tran_ref` | ⚠️ (application-level only) | ⚠️ Only via `withIdempotency` | `RefundProcessor` stores retry state in Mongo + uses `createRefund`. | Replaying the same refund payload may duplicate refund attempts if the upstream request succeeded but Fixzit crashed. Guard with `withIdempotency` and refund status checks. |
| PayTabs payout (`createPayout`) | `payout_reference` | ⚠️ | ❌ automatic retries disabled | `services/souq/settlements/withdrawal-service.ts` logs and falls back to manual flow when PayTabs declines. | Finance must review declines before resubmitting. |
| ZATCA clearance (`handleSuccessfulMarketplacePayment`) | `PAY-{cartId}` invoice | ✅ | ✅ (3 retries, 10 s timeout) | Clearance API wrapped in `withIdempotency` and persisted to DB. | Failing to persist evidence aborts the payment callback. |
| Twilio SMS send (`sendSMS`, `sendBulkSMS`) | Phone recipient | ❌ | ❌ unless Twilio never issued a SID | `withTwilioResilience` only retries network failures; once Twilio returns a SID, the send is considered final. | Duplicate sends create customer-facing noise and costs. |
| Twilio status lookup (`getSMSStatus`) | Message SID | ✅ | ✅ (3 retries, 5 s timeout) | Read-only Twilio API. |
| Meilisearch indexing (`SearchIndexerService`) | Product/Seller document ID | ✅ | ✅ (3 retries, 5 s timeout) | Index writes overwrite existing documents; safe under retries. |
| Meilisearch search (`/api/souq/search`) | Query | ✅ | ✅ (3 retries, 3 s timeout) | Read-only with breaker to avoid cascading failures. |

## Non-idempotent operations

These actions **must never** be retried automatically because they either charge
customers or communicate externally:

1. **Twilio outbound sends** (SMS + WhatsApp) – only retry on transport errors
   before a SID is issued. All other failures should be surfaced to engineers.
2. **PayTabs payouts** – PayTabs will requeue payouts when we submit the same
   reference multiple times, leading to duplicate withdrawals.
3. **Manual finance adjustments** (e.g., souq settlements) – rely on human
   review workflows instead of programmatic retries.

Document any new non-idempotent operations here so everyone knows which flows
are safe to auto-retry and which require manual interventions.
