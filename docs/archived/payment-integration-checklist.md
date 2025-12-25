# Payment Integration Testing Checklist

**Status:** Draft - Requires Backend Access & Monitoring Setup

## Quick Status Snapshot

| Area                            | Status                          | Owner               | Notes                                                                                      |
| ------------------------------- | ------------------------------- | ------------------- | ------------------------------------------------------------------------------------------ |
| Form/API Payload Validation     | ⚠️ Blocked (needs backend spec) | Payments Pod        | Waiting on final API contracts + example payloads before promoting checklist to \"Ready\". |
| Timeout & Retry Patterns        | 🚧 In Discovery                 | Platform Enablement | Fetch call inventory not yet documented; need idempotency policy & SLA inputs.             |
| Notification Logging Durability | ✅ Base Layer Ready             | Notifications Team  | Mongo TTL collections + DLQ wired; only monitoring hooks outstanding.                      |
| Monitoring & Alerting           | 🔴 Not Defined                  | SRE / Observability | Dashboards + alert rules undefined; must coordinate with infra before rollout.             |
| Test Harness                    | 🟡 Partially Ready              | QA Automation       | Signing script exists, but chaos + retry simulations still TBD.                            |

_Tracked in `CODE_QUALITY_IMPROVEMENTS_REPORT.md` under “Outstanding Backlog & Action Plan” row #1._

## Context

This checklist documents what needs verification before implementing payment flow improvements. These items require runtime visibility and backend access that isn't currently available.

---

## 1. Form/API Payload Validation

### Current State

- PayTabs callback handlers live in:
  - `app/api/paytabs/callback/route.ts` → subscription activation
  - `app/api/payments/paytabs/callback/route.ts` → marketplace/ZATCA compliance
  - `app/api/billing/callback/paytabs/route.ts` → invoice settlement
- All handlers are required to use `lib/payments/paytabs-callback.contract.ts` which provides:
  - `PaytabsCallbackPayloadSchema` (zod) for canonical validation
  - `normalizePaytabsCallbackPayload()` for consistent field mapping + metadata parsing (`metadata`, `user_defined`, `udf1`)
  - `extractPaytabsSignature()` for header/body fallback
  - `PAYTABS_CALLBACK_MAX_BYTES` (default 32 KB) enforced via `enforcePaytabsPayloadSize()`
  - `buildPaytabsIdempotencyKey()` to combine `tranRef`, `cartId`, and `respStatus`
- Signature validation still requires the `signature` header and now falls back to `x-paytabs-signature`, `paytabs-signature`, `signature`, `sign`, or `payment_signature` fields before rejecting the request.
- Canonical normalized fields:
  | Field | Source |
  | --- | --- |
  | `tranRef` | `tran_ref`, `tranRef`, `transaction_reference` |
  | `cartId` | `cart_id`, `cartId`, `invoice_id`, `order_id` |
  | `respStatus` | `payment_result.response_status`, `resp_status`, `respStatus` |
  | `respMessage` | `payment_result.response_message`, `resp_message` |
  | `token` | `token` |
  | `customerEmail` | `customer_details.email`, `customer_email`, `payment_info.customer_email` |
  | `amount` | `cart_amount`, `cartAmount`, `tran_total`, `amount` |
  | `currency` | `cart_currency`, `tran_currency`, `currency` |
  | `metadata` | `metadata`, `user_defined`, `udf1` (JSON string or object) |
  | `maskedCard` | `payment_info.payment_description`, `payment_info.masked_card` |
- Rate limits:
  - Shared defaults: `PAYTABS_CALLBACK_RATE_LIMIT` (requests/minute, default 60) and `PAYTABS_CALLBACK_RATE_WINDOW_MS` (default 60s).
  - Payloads exceeding `PAYTABS_CALLBACK_MAX_BYTES` receive HTTP 413.
- Idempotency:
  - `buildPaytabsIdempotencyKey()` + `withIdempotency()` wrap subscription, marketplace, and billing callbacks.
  - TTL controlled via `PAYTABS_CALLBACK_IDEMPOTENCY_TTL_MS` (default 5 minutes).

### Tap Webhook Guard Status

- Tap Payments webhook (`app/api/payments/tap/webhook/route.ts`) now mirrors the same perimeter controls:
  - Rate limit: `TAP_WEBHOOK_RATE_LIMIT` per `TAP_WEBHOOK_RATE_WINDOW_MS` (defaults 60 requests / 60s).
  - Payload cap: `TAP_WEBHOOK_MAX_BYTES` (default 64 KB) enforced before signature validation.
  - Signature verification still uses `x-tap-signature` and `tapPayments.parseWebhookEvent`.
  - Idempotency: each Tap event is wrapped in `withIdempotency('tap:webhook:${event.id}')` with TTL controlled by `TAP_WEBHOOK_IDEMPOTENCY_TTL_MS` (default 5 minutes).

### Status Summary (Updated: 2025-11-18)

| Requirement                         | Owner            | Status                                                                                        | Notes |
| ----------------------------------- | ---------------- | --------------------------------------------------------------------------------------------- | ----- |
| Backend API documentation / OpenAPI | Payments Pod     | ✅ Available (`openapi.yaml` section `payments-paytabs` & `payments-tap`)                     |
| Sample successful payloads          | DocOps           | ✅ Added in _Sample Payload Library_ below                                                    |
| Sample error responses / taxonomy   | DocOps + Backend | ✅ Added in _Error Response Matrix_ below                                                     |
| Field validation rules              | Backend          | ✅ Documented below (required/optional per gateway)                                           |
| Payload size limits                 | Platform         | ✅ Enforced via `PAYTABS_CALLBACK_MAX_BYTES` (32KB) / `TAP_CALLBACK_MAX_BYTES` (32KB)         |
| Content-Type requirements           | Platform         | ✅ Both callbacks expect `application/json`; rejects others with `415 Unsupported Media Type` |

### Required Before Changes

- [x] Backend API documentation or OpenAPI spec for payment endpoints
- [x] Sample successful request/response payloads
- [x] Sample error responses with status codes
- [x] Field validation rules (required/optional fields)
- [x] Payload size limits
- [x] Content-Type requirements

### Sample Payload Library

#### PayTabs — Success (Subscription Invoice Paid)

```json
{
  "tran_ref": "TST0001234567",
  "cart_id": "order-12345",
  "customer_details": {
    "name": "Sara Al-Qahtani",
    "email": "finance@example.com"
  },
  "resp_status": "A",
  "resp_message": "Approved",
  "amount": 150.0,
  "currency": "SAR",
  "payment_result": {
    "status": "CAPTURED",
    "code": "000",
    "message": "Captured"
  },
  "metadata": {
    "invoiceId": "INV-2025-00045",
    "tenantId": "tenant_souq_01"
  }
}
```

#### PayTabs — Failure (Signature / Fraud)

```json
{
  "tran_ref": "TST0009999999",
  "cart_id": "order-fraud-01",
  "resp_status": "D",
  "resp_message": "Declined",
  "amount": 75.0,
  "currency": "SAR",
  "payment_result": {
    "status": "DECLINED",
    "code": "401",
    "message": "Signature mismatch"
  },
  "metadata": {
    "invoiceId": "INV-2025-00092",
    "tenantId": "tenant_retail_02"
  }
}
```

#### Tap — Success (Charge Captured)

```json
{
  "id": "chg_TS01234567890",
  "object": "charge",
  "status": "CAPTURED",
  "amount": 250.0,
  "currency": "SAR",
  "description": "Marketplace fulfillment",
  "metadata": {
    "order_id": "market-94812",
    "tenantId": "tenant_fm_03"
  }
}
```

#### Tap — Failure (Insufficient Funds / Retry)

```json
{
  "id": "chg_FAIL001",
  "object": "charge",
  "status": "FAILED",
  "response": {
    "code": "3008",
    "message": "Insufficient funds",
    "advice": "Ask customer to contact issuing bank"
  },
  "amount": 110.0,
  "currency": "SAR",
  "metadata": {
    "order_id": "market-94899"
  }
}
```

### Field Validation Rules

| Field                                      | Gateway     | Required?   | Notes                                                 |
| ------------------------------------------ | ----------- | ----------- | ----------------------------------------------------- |
| `tran_ref`                                 | PayTabs     | ✅          | Used as idempotency key (`paytabsTranRef`)            |
| `cart_id`                                  | PayTabs     | ✅          | Maps to internal invoice/order id                     |
| `resp_status`                              | PayTabs     | ✅          | `A` (approved) or `D` (declined); any other → 400     |
| `amount`                                   | PayTabs/Tap | ✅          | Number; rejects strings                               |
| `currency`                                 | PayTabs/Tap | ✅          | Must match tenant currency; SAR for Saudi deployments |
| `metadata.invoiceId` / `metadata.order_id` | Both        | 🟡 Optional | When present, used to enrich audit logs               |
| `payment_result.status`                    | PayTabs     | 🟡 Optional | If missing, fallback derived from `resp_status`       |
| `response.code/message`                    | Tap         | 🟡 Optional | Required for failed charges                           |

### Error Response Matrix

| Scenario                      | Status                       | Response Body                                                                            |
| ----------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------- |
| Invalid signature             | `401 Unauthorized`           | `{"error":"invalid_signature","message":"PayTabs callback rejected: Invalid signature"}` |
| Payload exceeds limit (>32KB) | `413 Payload Too Large`      | `{"error":"payload_too_large","limit":32768}`                                            |
| Unsupported media type        | `415 Unsupported Media Type` | `{"error":"unsupported_media_type","expected":"application/json"}`                       |
| Rate limit exceeded (>60/min) | `429 Too Many Requests`      | `{"error":"rate_limited","retryAfterMs":60000}`                                          |
| Duplicate idempotency key     | `200 OK`                     | `{"status":"duplicate","message":"Event replay ignored"}`                                |
| Server error                  | `500 Internal Server Error`  | `{"error":"internal_error","referenceId":"<sentryId>"}`                                  |

**Monitoring & SLA Notes**

- **Idempotency TTL**: 5 minutes (`PAYTABS_CALLBACK_IDEMPOTENCY_TTL_MS` / `TAP_WEBHOOK_IDEMPOTENCY_TTL_MS`)
- **Rate limit**: 60 requests / minute per gateway.
- **Payload ceiling**: 32KB enforced at Fastify middleware level.
- **Observability**: `pnpm tsx tools/log-tail.ts payments` plus Sentry project `payments-webhooks`.

### Verification Steps

```bash
# 1) Generate a valid signature for a local payload
pnpm tsx scripts/sign-paytabs-payload.ts --json '{
  "cart_id": "SUB-123",
  "tran_ref": "TRX-001",
  "resp_status": "A",
  "amount": 100
}'

# 2) Use the emitted header to call the callback route
curl -X POST http://localhost:3000/api/paytabs/callback \
  -H "Content-Type: application/json" \
  -H "signature: <output-from-script>" \
  -d '{"cart_id":"SUB-123","tran_ref":"TRX-001","resp_status":"A","amount":100}'

# 3) Check runtime logs (stdout) or deployment monitor
tail -f /tmp/route-verify.log | grep "PayTabs"
# or run ./scripts/monitor-deployment.sh while verify-deployment-readiness.sh executes
```

### Questions to Answer

1. Does backend accept enriched metadata fields?
2. Are there rate limits on payment endpoints?
3. What's the retry policy for failed webhooks?
4. How are duplicate transactions handled (idempotency)?

### Open Issues / Action Items

| ID    | Owner   | Description                                                        | Status                                      |
| ----- | ------- | ------------------------------------------------------------------ | ------------------------------------------- |
| PI-01 | Backend | Provide signed sample payloads for subscriptions + invoices        | ✅ Completed (see _Sample Payload Library_) |
| PI-02 | Backend | Share error taxonomy + status codes for PayTabs + SMS hooks (Taqnyat) | ✅ Completed (see _Error Response Matrix_)  |
| PI-03 | QA      | Build MSW/prism mock that exercises signature validation + retries | 🚧 Planned                                  |

---

## 2. Timeout & Retry Patterns

### Current State

- No shared retry utility exists
- Only one test mentions timeout: `tests/unit/api/api-paytabs.spec.ts`
- `AbortSignal` pattern used but not extracted

### Required Before Refactoring

- [ ] Inventory all payment-related `fetch()` calls
- [ ] Current timeout values (if any)
- [ ] Identify which APIs are:
  - Idempotent (safe to retry)
  - Non-idempotent (requires different handling)
- [ ] Third-party SLA/timeout documentation:
  - PayTabs API latency guarantees
  - Taqnyat timeout recommendations
  - Meilisearch query timeouts

### Files to Audit

```typescript
// Search for payment fetch calls
grep -r "fetch.*payment" app/api/
grep -r "fetch.*paytabs" app/api/
grep -r "fetch.*billing" app/api/

// Search for external API calls
grep -r "twilio" services/
grep -r "meilisearch" lib/
```

### Design Decisions Needed

1. **Timeout Strategy:**
   - Should all APIs use same timeout (15s)?
   - Different timeouts for sync vs async operations?
   - Should timeouts be configurable per environment?

2. **Retry Strategy:**
   - Exponential backoff parameters (initial delay, max retries)?
   - Which HTTP status codes trigger retry (5xx, 429, etc)?
   - Circuit breaker needed for degraded services?

3. **Observability:**
   - Where should timeout/retry metrics be logged?
   - How to correlate retries with original request?
   - Alert thresholds for retry failures?

---

## 3. Notification Logging Durability

### Current State

- FM notification engine exists: `services/notifications/fm-notification-engine.ts`
- NotificationLog collection (`server/models/NotificationLog.ts`) persists each notification with channel results (TTL: `NOTIFICATION_LOG_TTL_DAYS`, default 90 days)
- NotificationDeadLetter collection captures failed channel attempts for replay (TTL: `NOTIFICATION_DLQ_TTL_DAYS`, default 30 days)
- Metrics/observability for these collections still missing

### Required Infrastructure

- [ ] **Monitoring Stack:**
  - Is Prometheus/Grafana available?
  - CloudWatch/DataDog/New Relic?
  - Custom metrics endpoint?

- [x] **Persistence Layer:**
  - `NotificationLog` Mongo collection with TTL (configurable via `NOTIFICATION_LOG_TTL_DAYS`)
  - Stores recipients, payload summary, per-channel attempts/results

- [x] **Dead Letter Queue (DLQ):**
  - `NotificationDeadLetter` Mongo collection (`NOTIFICATION_DLQ_TTL_DAYS` TTL)
  - Records failed channel deliveries with attempt counts for replay jobs

### Questions to Answer

1. **Retention Policy:**
   - How long to keep notification logs? (30 days? 1 year?)
   - Compliance requirements (GDPR, SOC2)?

2. **Query Patterns:**
   - Need to query by user ID?
   - Search by notification type/status?
   - Time-range queries for debugging?

3. **Alert Strategy:**
   - When to alert on delivery failures?
   - Threshold for DLQ size before escalation?
   - Dashboard for real-time monitoring?

### Example Schema (Pending Approval)

```typescript
// MongoDB NotificationLog collection (DRAFT)
interface NotificationLog {
  id: string;
  userId: string;
  type: "email" | "sms" | "push";
  provider: "twilio" | "sendgrid" | "expo";
  status: "pending" | "sent" | "delivered" | "failed" | "dlq";
  payload: Record<string, any>;
  attempts: number;
  lastAttemptAt: Date;
  errorMessage?: string;
  deliveredAt?: Date;
  createdAt: Date;
}
```

---

## Testing Requirements

### Local Development

1. **Mock Backend Setup:**

   ```bash
   # Option 1: Prism mock server from OpenAPI spec
   npx @stoplight/prism-cli mock openapi.yaml

   # Option 2: MSW (Mock Service Worker)
   # See: tests/mocks/payment-handlers.ts
   ```

2. **Environment Variables:**
   ```bash
   # .env.test
   PAYTABS_WEBHOOK_SECRET="test_secret_123"
   PAYTABS_SERVER_KEY="test_key_456"
   PAYMENT_TIMEOUT_MS=15000
   RETRY_MAX_ATTEMPTS=3
   NOTIFICATION_LOG_ENABLED=true
   NOTIFICATION_LOG_TTL_DAYS=90
   NOTIFICATION_DLQ_TTL_DAYS=30
   ```

```

### Integration Testing Checklist
- [ ] Test timeout behavior with slow API responses
- [ ] Test retry logic with transient failures (503, 429)
- [ ] Test idempotency with duplicate webhook deliveries
- [ ] Test payload validation with malformed JSON
- [ ] Test signature verification with invalid signatures
- [ ] Test notification delivery with DLQ fallback

### Production Readiness
- [ ] Load testing with expected transaction volume
- [ ] Chaos testing (network failures, service outages)
- [ ] Monitoring dashboards configured
- [ ] Alerting rules defined
- [ ] Runbook for common failure scenarios
- [ ] Feature flags for gradual rollout

### Monitoring / Alerting TODOs
| Item | Owner | Notes |
|------|-------|-------|
| Dashboard wiring | SRE | Plug NotificationLog + DLQ metrics into whichever stack is approved (Grafana/CloudWatch). |
| Alert thresholds | Payments | Define DLQ growth + retry failure alerts; align with incident policy. |
| Runbook draft | DocOps | Capture failure -> mitigation steps referencing `scripts/monitor-deployment.sh`. |

---

## Next Steps

**Before implementing any changes:**

1. **Schedule Backend Review:**
   - Meet with backend team to review API contracts
   - Document payload expectations
   - Establish SLA for payment endpoints

2. **Infrastructure Planning:**
   - Choose monitoring stack
   - Design DLQ architecture
   - Define metric requirements

3. **Create Test Harness:**
   - Set up mock payment server
   - Write integration test suite
   - Implement chaos testing scenarios

4. **Incremental Rollout:**
   - Start with non-critical notification types
   - Monitor metrics for 1 week
   - Gradually enable for payment flows

### Execution Tracker
| Milestone | Target Date | Owner | Status |
|-----------|-------------|-------|--------|
| Backend contract review scheduled | Nov 20, 2025 | Payments PM | ⏳ Pending |
| Timeout inventory complete | Nov 22, 2025 | Platform Enablement | 🚧 In Progress |
| Monitoring plan approved | Nov 25, 2025 | SRE | ⏳ Pending |
| Test harness demo | Nov 26, 2025 | QA Automation | 🟡 Drafting |

---

## References

- **PayTabs Documentation:** https://site.paytabs.com/en/developer/
- **Webhook Best Practices:** https://webhooks.fyi/best-practices/
- **Idempotency Patterns:** https://stripe.com/docs/api/idempotent_requests
- **Circuit Breaker Pattern:** https://martinfowler.com/bliki/CircuitBreaker.html

---

**Last Updated:** November 18, 2025
**Owner:** Engineering Team
**Status:** Draft - Awaiting Backend Access
```
