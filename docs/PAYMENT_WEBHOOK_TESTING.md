# Payment Webhook Resilience Testing Guide

**Date:** November 18, 2025  
**Status:** Ready for Staging Execution  
**Priority:** HIGH - Deployment Blocker

---

## Overview

This guide details testing procedures for PayTabs and Tap payment callback webhooks to ensure:
1. **Idempotent execution** prevents duplicate processing
2. **Rate limiting** blocks malicious flood attacks
3. **Payload size limits** prevent memory exhaustion
4. **Signature validation** ensures authenticity

---

## Prerequisites

- [ ] `.env.staging` (or the environment you are targeting) contains the **exact** values listed below for PayTabs and Tap.
- [ ] `scripts/sign-paytabs-payload.ts` is available (added in November 2025) so you can generate valid PayTabs signatures without leaving secrets in shell history (see [Generating PayTabs Signatures](#generating-paytabs-signatures)).
- [ ] Tap HMAC helper ready (`pnpm tsx scripts/sign-tap-payload.ts` or the Python snippet in [Generating Tap Signatures](#generating-tap-signatures)) so you can hash the raw payload with `TAP_SECRET_KEY`.
- [ ] Access to MongoDB (read-only is fine) for verifying payment/idempotency collections.
- [ ] Tail access to the application logs (`pnpm tsx tools/log-tail.ts payments` or CloudWatch/Sentry dashboards).
- [ ] Redis CLI access (or any `redis-cli --scan` alternative) to confirm rate-limit counters increment and expire as expected.
- [ ] Sample payloads (success + failure) are ready; use the library published in [`payment-integration-checklist.md`](payment-integration-checklist.md) so the JSON schemas are consistent across teams.

### Generating PayTabs Signatures

```bash
# Example: create a signed payload quickly without exposing raw secrets
pnpm tsx scripts/sign-paytabs-payload.ts --json '{
  "tran_ref": "TST0001234567",
  "cart_id": "order-12345",
  "resp_status": "A",
  "amount": 150.00
}'
# The script prints the `signature` header value and the curl command to run.
```

### Generating Tap Signatures

Tap webhooks use an HMAC SHA-256 of the **raw** request body with `TAP_SECRET_KEY`. Use the helper script to avoid manual hashing mistakes:

```bash
pnpm tsx scripts/sign-tap-payload.ts --json '{
  "id": "chg_TS01234567890",
  "object": "charge",
  "status": "CAPTURED",
  "amount": 250.00,
  "currency": "SAR"
}'
```

The script validates the JSON, prints the hex digest for `X-Tap-Signature`, and echoes a curl command that preserves the original payload bytes.

> ⚠️ **Important:** the signature must match the byte-for-byte payload you send. If you edit or pretty-print the JSON, re-run the script.

Prefer the script, but if you need an inline approach, you can still use the Python snippet below (remember to set `RAW_BODY` to the exact string used in `curl`):

```bash
RAW_BODY='{"id":"chg_TS01234567890","object":"charge","status":"CAPTURED","amount":250,"currency":"SAR"}'
TAP_SECRET_KEY="your-tap-secret-key"
python - <<'PY'
import hashlib, hmac, os
secret = os.environ["TAP_SECRET_KEY"].encode()
payload = os.environ["RAW_BODY"].encode()
print(hmac.new(secret, payload, hashlib.sha256).hexdigest())
PY
```

---

## PayTabs Callback Testing

### Environment Configuration

```bash
# Production values - set in staging environment
export PAYTABS_CALLBACK_MAX_BYTES=32768  # 32KB payload limit
export PAYTABS_CALLBACK_RATE_LIMIT=60    # 60 requests
export PAYTABS_CALLBACK_RATE_WINDOW_MS=60000  # per minute
export PAYTABS_CALLBACK_IDEMPOTENCY_TTL_MS=300000  # 5 minutes
export PAYTABS_SERVER_KEY="your-paytabs-server-key"
```

### Test Cases

#### TC1: Normal Payment Flow
```bash
# Expected: 200 OK, payment processed
# Signature: use scripts/sign-paytabs-payload.ts so payload+signature always match
curl -X POST https://staging.fixzit.app/api/payments/paytabs/callback \
  -H "Content-Type: application/json" \
  -H "X-Paytabs-Signature: <valid-signature>" \
  -d '{
    "tran_ref": "TST0001234567",
    "cart_id": "order-12345",
    "resp_status": "A",
    "resp_message": "Approved",
    "amount": 150.00,
    "currency": "SAR"
  }'
```

#### TC2: Idempotency Check (Replay Attack)
```bash
# Send same payload twice within 5 minutes
# Expected: First request: 200 OK, Second request: 200 OK (but no duplicate processing)
# Verify via Mongo: db.subscriptioninvoices.find({"paytabsTranRef":"TST0001234567"}).count() === 1

# First call
curl -X POST https://staging.fixzit.app/api/payments/paytabs/callback \
  -H "Content-Type: application/json" \
  -H "X-Paytabs-Signature: <valid-signature>" \
  -d '{"tran_ref": "TST0001234567", "cart_id": "order-replay", "resp_status": "A", "amount": 100.00}'

# Second call (immediate replay)
curl -X POST https://staging.fixzit.app/api/payments/paytabs/callback \
  -H "Content-Type: application/json" \
  -H "X-Paytabs-Signature: <valid-signature>" \
  -d '{"tran_ref": "TST0001234567", "cart_id": "order-replay", "resp_status": "A", "amount": 100.00}'

# Verify database: Only ONE payment record created
```

#### TC3: Rate Limit Exhaustion
```bash
# Send 61 requests within 60 seconds
# Expected: First 60 succeed, 61st returns 429 Too Many Requests
# Monitor Redis: keys matching ratelimit:paytabs should increment

for i in {1..61}; do
  curl -X POST https://staging.fixzit.app/api/payments/paytabs/callback \
    -H "Content-Type: application/json" \
    -H "X-Paytabs-Signature: <valid-signature>" \
    -d "{\"tran_ref\": \"TST-RATE-$i\", \"cart_id\": \"order-$i\", \"resp_status\": \"A\", \"amount\": 10.00}" &
done
wait

# Check last response: should be 429
```

#### TC4: Payload Size Limit
```bash
# Send 33KB payload (exceeds 32KB limit)
# Expected: 413 Payload Too Large (log line: "PayTabs payload rejected: exceeds limit")

# Create oversized payload
LARGE_PAYLOAD=$(python3 -c "import json; print(json.dumps({'tran_ref': 'TST999', 'cart_id': 'x'*33000, 'resp_status': 'A', 'amount': 100}))")

curl -X POST https://staging.fixzit.app/api/payments/paytabs/callback \
  -H "Content-Type: application/json" \
  -H "X-Paytabs-Signature: <valid-signature>" \
  -d "$LARGE_PAYLOAD"
```

#### TC5: Invalid Signature
```bash
# Send valid payload with wrong signature
# Expected: 401 Unauthorized (log line: "PayTabs callback rejected: Invalid signature")

curl -X POST https://staging.fixzit.app/api/payments/paytabs/callback \
  -H "Content-Type: application/json" \
  -H "X-Paytabs-Signature: invalid-signature-12345" \
  -d '{"tran_ref": "TST111", "cart_id": "order-sig-test", "resp_status": "A", "amount": 50.00}'
```

---

## Shared Verification Steps (PayTabs & Tap)

After **every** test case:

1. **Logs** – tail server output and look for structured webhook entries (success + explicit error reason).
   ```bash
   pnpm tsx tools/log-tail.ts payments | grep "payments.webhook"
   ```
   For failures you should see the rejection reason (payload limit, invalid signature, rate limit, etc.). Copy the log snippet into the test sheet.
2. **MongoDB** – verify inserts/updates:
   ```bash
   # PayTabs (subscription invoices)
   mongosh --eval 'db.subscriptioninvoices.find({"paytabsTranRef":"TST0001234567"}, {cartId:1,status:1}).pretty()'
   # Tap (charge log)
   mongosh --eval 'db.tapTransactions.find({"tapChargeId":"chg_TS01234567890"}, {status:1}).pretty()'
   ```
   PayTabs should only create/update documents when `resp_status === "A"` and never more than once per `tran_ref`. Tap must keep a single document per `id`.
3. **Redis rate limits** – confirm counters increment and expire:
   ```bash
   redis-cli --scan --pattern "ratelimit:paytabs:*"
   redis-cli --ttl "ratelimit:paytabs:https://staging.fixzit.app/api/payments/paytabs/callback"
   redis-cli --scan --pattern "ratelimit:tap:*"
   ```
   TTL values should be close to `PAYTABS_CALLBACK_RATE_WINDOW_MS / 1000` (or Tap equivalent) immediately after TC3.
4. **Idempotency cache** – recommended to ensure replays are short-circuited:
   ```bash
   redis-cli --scan --pattern "paytabs:idempotency:*"
   redis-cli --pttl "paytabs:idempotency:TST0001234567"
   redis-cli --scan --pattern "tap:idempotency:*"
   ```
   TTLs should align with `*_CALLBACK_IDEMPOTENCY_TTL_MS`. Lack of keys indicates withIdempotency isn’t running.

Document every discrepancy in the test sheet before moving to the next scenario.

### Evidence to Attach Per Scenario
- ✅ `curl` command + response (HTTP status + body)
- ✅ Log snippet showing `payments.webhook` outcome (success or explicit failure reason)
- ✅ Mongo query output proving insert/update counts
- ✅ Redis `--ttl/--pttl` output for the relevant rate-limit or idempotency key
- ✅ Screenshot or JSON excerpt saved under `_artifacts/payments/<date>/<suite>/`

## Reporting & Audit Trail

1. **Execution Log** – append each scenario’s outcome to [`SMOKE_TEST_EXECUTION_LOG.md`](../SMOKE_TEST_EXECUTION_LOG.md) (same numbering as this guide) and include the artifact folder link.
2. **Artifacts Folder Structure**
   ```
   _artifacts/payments/<YYYY-MM-DD>/<suite>/ 
     ├── curl.log
     ├── mongo.json
     ├── redis.txt
     ├── logs.txt
     └── screenshots/
   ```
3. **Checklist Cross-References** – in every log entry, mention which row in [`payment-integration-checklist.md`](payment-integration-checklist.md) the evidence satisfies (e.g., PI-Idempotency, PI-RateLimit).

---

## Tap Payments Callback Testing

### Environment Configuration

```bash
# Production values
export TAP_WEBHOOK_MAX_BYTES=32768
export TAP_WEBHOOK_RATE_LIMIT=60
export TAP_WEBHOOK_RATE_WINDOW_MS=60000
export TAP_WEBHOOK_IDEMPOTENCY_TTL_MS=300000  # 5 minutes
export TAP_SECRET_KEY="your-tap-secret-key"
export TAP_WEBHOOK_SECRET="your-tap-webhook-hmac-secret"
```

### Test Cases

#### TC1: Normal Charge Success
```bash
curl -X POST https://staging.fixzit.app/api/payments/tap/webhook \
  -H "Content-Type: application/json" \
  -H "X-Tap-Signature: <valid-hmac-signature>" \
  -d '{
    "id": "chg_TS01234567890",
    "object": "charge",
    "status": "CAPTURED",
    "amount": 250.00,
    "currency": "SAR",
    "metadata": {
      "order_id": "order-tap-001"
    }
  }'
```

#### TC2: Idempotency Check
```bash
# Replay same charge ID twice
# Expected: Second call should be skipped (logged but not processed)
# Verify with Mongo `db.tapTransactions.find({tapChargeId: "chg_REPLAY001"}).count() === 1`

# First call
curl -X POST https://staging.fixzit.app/api/payments/tap/webhook \
  -H "Content-Type: application/json" \
  -H "X-Tap-Signature: <valid-signature>" \
  -d '{"id": "chg_REPLAY001", "object": "charge", "status": "CAPTURED", "amount": 100, "currency": "SAR"}'

# Immediate replay
curl -X POST https://staging.fixzit.app/api/payments/tap/webhook \
  -H "Content-Type: application/json" \
  -H "X-Tap-Signature: <valid-signature>" \
  -d '{"id": "chg_REPLAY001", "object": "charge", "status": "CAPTURED", "amount": 100, "currency": "SAR"}'
```

#### TC3: Rate Limit Test
```bash
# Same as PayTabs - flood with 61 requests
for i in {1..61}; do
  curl -X POST https://staging.fixzit.app/api/payments/tap/webhook \
    -H "Content-Type: application/json" \
    -H "X-Tap-Signature: <valid-signature>" \
    -d "{\"id\": \"chg_RATE_$i\", \"object\": \"charge\", \"status\": \"CAPTURED\", \"amount\": 10, \"currency\": \"SAR\"}" &
done
wait

# Expected: 61st response is 429 Too Many Requests, Redis ratelimit key increments.
```

#### TC4: Payload Size Limit
```bash
# Reuse PayTabs oversized payload strategy
LARGE_TAP_PAYLOAD=$(python3 -c "import json; print(json.dumps({'id': 'chg_BIG', 'object': 'charge', 'status': 'CAPTURED', 'amount': 100, 'currency': 'SAR', 'metadata': {'blob': 'x'*33000}}))")

curl -X POST https://staging.fixzit.app/api/payments/tap/webhook \
  -H "Content-Type: application/json" \
  -H "X-Tap-Signature: <valid-signature>" \
  -d "$LARGE_TAP_PAYLOAD"

# Expected: 413 Payload Too Large with log entry "Tap payload rejected: exceeds limit"
```

#### TC5: Invalid Signature
```bash
curl -X POST https://staging.fixzit.app/api/payments/tap/webhook \
  -H "Content-Type: application/json" \
  -H "X-Tap-Signature: invalid-signature-xyz" \
  -d '{"id": "chg_SIG_FAIL", "object": "charge", "status": "CAPTURED", "amount": 10, "currency": "SAR"}'

# Expected: 401 Unauthorized, log entry "Tap callback rejected: Invalid signature"
```

---

## Reporting Checklist

Before marking the suite complete:

1. ✅ All test cases above executed in both **staging** and **pre-prod** (if applicable).
2. ✅ Screenshots or log excerpts attached for any non-200/expected responses.
3. ✅ Mongo/Redis verification notes recorded for TC2/TC3 counterparts.
4. ✅ Issues filed (with log snippets + payload) for any deviations from expected behavior.
5. ✅ `.env` overrides reverted or documented for rollback.
## Reference Payload Library & Monitoring SLA

- Use the **Sample Payload Library** + **Error Response Matrix** in [`payment-integration-checklist.md`](payment-integration-checklist.md) for signed PayTabs/Tap examples. Each payload now includes required metadata fields plus failure variants for signature and fraud cases.
- SLA recap:
  - **Idempotency window:** 5 minutes (`PAYTABS_CALLBACK_IDEMPOTENCY_TTL_MS`, `TAP_WEBHOOK_IDEMPOTENCY_TTL_MS`)
  - **Rate limit:** 60 req/min per gateway (`*_CALLBACK_RATE_LIMIT`)
  - **Payload ceiling:** 32KB (`*_CALLBACK_MAX_BYTES`)
  - **Monitoring:** Triage via `pnpm tsx tools/log-tail.ts payments`, Sentry project `payments-webhooks`, and `redis-cli --scan --pattern "ratelimit:paytabs:*"`.

## QA Data Seeding & Evidence Capture

1. **Seed identities**
   ```bash
   pnpm tsx scripts/seed-demo-users.ts --support --finance --operations
   node scripts/create-test-data.js --scenarios support-orgs --tenants 3 --finance-fixtures
   ```
2. **Verify impersonation + SupportOrg switcher**  
   `pnpm tsx scripts/create-test-data.js --verify-support-impersonation`
3. **Capture evidence**
   - Rerun suites in [`SMOKE_TEST_EXECUTION_LOG.md`](../SMOKE_TEST_EXECUTION_LOG.md) and attach:
     - EN + AR screenshots for each prompt
     - Mongo queries proving `organizationId` swap
     - Curl output snippets for webhook runs
4. **Log results**  
   - Update the log table per suite.
   - Drop artifacts (screens + `curl` transcripts) into `_artifacts/payments/<date>/`.

## Org Guard Automation Hook

- `pnpm run verify:org-context` now chains `tsx scripts/verify-org-context.ts` and the smoke tests in `tests/smoke/org-context-flow.test.tsx`.
- The **Route Quality** GitHub workflow already runs this job (see `.github/workflows/route-quality.yml`), so regressions fail CI automatically.
- Local verification shortcut:
  ```bash
  pnpm run verify:org-context
  ```
  Review warnings for baseline clean-up and rerun after applying fixes.

## Next Steps & Cross-Team Dependencies

| # | Owner | Action | Source | Status |
|---|-------|--------|--------|--------|
| 1 | Backend / Payments | Deliver PayTabs sample payloads (success/error) plus timeout + monitoring SLAs so checklist items PI-01/PI-02 unblock. | [`payment-integration-checklist.md`](payment-integration-checklist.md) (PI table around line 87) | ✅ Completed – payload/error library published Nov 18 |
| 2 | QA | Seed support users + multi-org data using `pnpm tsx scripts/seed-demo-users.ts` and `node scripts/create-test-data.js`, then rerun SupportOrg smoke suites and capture EN/AR evidence for doc sign-off. | [`SMOKE_TEST_EXECUTION_LOG.md`](../SMOKE_TEST_EXECUTION_LOG.md) lines 372 & 391 | 🟡 Ready for execution – follow _QA Data Seeding & Evidence Capture_ |
| 3 | Platform | Finish org-guard verification script + CI wiring, updating both the tracker and this action plan as phases complete. | `docs/ORG_GUARD_STATUS.md` line 335 and `docs/operations/DOCUMENTATION_ORG_ACTION_PLAN.md` line 28 | ✅ Automated – `pnpm verify:org-context` wired into Route Quality CI |

Document the outcome of each action above before running full staging webhooks to ensure all upstream blockers are resolved.

## Validation Checklist

### Pre-Test Setup
- [ ] Staging environment variables configured (see Environment Configuration tables)
- [ ] Test payment gateway accounts active
- [ ] Database access for verification queries
- [ ] Monitoring dashboards ready (Sentry, logs)

### During Testing
- [ ] Monitor server CPU/memory usage
- [ ] Check Redis for idempotency keys
- [ ] Verify rate limit counters
- [ ] Watch application logs for errors

### Post-Test Verification
- [ ] Query database: `db.payments.find({cartId: /order-/}).count()`
- [ ] Verify no duplicate payment records
- [ ] Check DLQ for failed webhooks
- [ ] Review Sentry for unexpected errors
- [ ] Confirm ZATCA invoice generation (Saudi payments only)

---

## Expected Results

| Test Case | Expected Status | Verification Command |
|-----------|-----------------|----------------------|
| PayTabs TC1 | `200 OK`, invoice status becomes `PAID` | `db.subscriptioninvoices.findOne({cartId:"order-12345"},{status:1,paytabsTranRef:1})` |
| PayTabs TC2 | second call returns cached response, no duplicate invoice | `db.subscriptioninvoices.find({"paytabsTranRef":"TST0001234567"}).count()` |
| PayTabs TC3 | Request 61 returns `429` | Inspect `/tmp/paytabs-callback.log` or Sentry rate-limit counter |
| PayTabs TC4 | `413 Payload Too Large` and log entry | `pnpm tsx tools/log-tail.ts payments | grep "payload rejected"` |
| PayTabs TC5 | `401 Unauthorized`, no DB writes | `db.subscriptioninvoices.find({"cartId":"order-sig-test"})` |
| Tap TC1 | `200 OK`, `tapTransactions` entry created | `db.tapTransactions.find({"tapChargeId":"chg_TS01234567890"})` |
| Tap TC2 | Replay skipped | `db.tapTransactions.find({"tapChargeId":"chg_REPLAY001"}).count()` |
| Tap TC3 | 61st request `429` | Tap webhook logs contain "Rate limit exceeded" |
| Tap TC4 | `413 Payload Too Large`, log entry | `pnpm tsx tools/log-tail.ts payments | grep "Tap payload rejected"` |
| Tap TC5 | `401 Unauthorized`, no DB writes | `db.tapTransactions.find({"tapChargeId":"chg_SIG_FAIL"})` |

Document every run in [`SMOKE_TEST_EXECUTION_LOG.md`](../SMOKE_TEST_EXECUTION_LOG.md) and attach curl output + relevant log excerpts so the QA lead can sign off the deployment gate.

### Success Criteria
✅ **Idempotency:** Replayed webhooks return 200 but don't duplicate database records  
✅ **Rate Limiting:** 61st request within 60s returns HTTP 429  
✅ **Size Limits:** >32KB payloads rejected with HTTP 413  
✅ **Signature Validation:** Invalid signatures rejected with HTTP 401  
✅ **ZATCA Integration:** Saudi payments generate valid QR codes

### Failure Indicators
❌ Duplicate payment records in database  
❌ Rate limits not enforced (>60 req/min accepted)  
❌ Large payloads crash server or consume excessive memory  
❌ Invalid signatures processed successfully  
❌ Missing ZATCA clearance for Saudi transactions

---

## Rollback Plan

If critical issues found:
1. **Immediate:** Disable webhooks via feature flag `PAYMENT_WEBHOOKS_ENABLED=false`
2. **Short-term:** Roll back to previous version
3. **Investigation:** Review logs, identify root cause
4. **Fix & Retest:** Apply fixes, repeat full test suite

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Developer | - | 2025-11-18 | ✅ Tests Ready |
| QA Lead | - | - | ⏳ Pending Execution |
| DevOps | - | - | ⏳ Staging Setup |
| Product Owner | - | - | ⏳ Final Approval |

---

## Next Steps

1. **Schedule staging testing window** (recommend 2-hour block during low traffic)
2. **Execute all test cases** and document results
3. **Review with team** before production deployment
4. **Update production env vars** based on staging findings
5. **Monitor production closely** for first 24 hours post-deployment
