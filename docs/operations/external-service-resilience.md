# External Service Resilience Playbook

This runbook captures how Fixzit handles latency budgets, retries, and circuit
breakers when calling external services. It also documents the default timeout
values so engineers no longer need to reverse–engineer them from source files.

## Shared utilities

| Utility                               | Location                                     | Description                                                                                  |
| ------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `executeWithRetry`                    | `lib/resilience/retry.ts`                    | Exponential backoff with jitter, optional retry hooks, and consistent logging.               |
| `withTimeout` / `createTimeoutSignal` | `lib/resilience/timeout.ts`                  | Extracted AbortController pattern for HTTP requests and SDK calls.                           |
| `CircuitBreaker`                      | `lib/resilience/circuit-breaker.ts`          | Simple half‑open breaker with configurable thresholds.                                       |
| `SERVICE_RESILIENCE`                  | `config/service-timeouts.ts`                 | Declarative timeout and retry budgets per integration (PayTabs, Twilio, Meilisearch, ZATCA). |
| `serviceCircuitBreakers`              | `lib/resilience/service-circuit-breakers.ts` | Named breakers reused across API routes and services.                                        |

Code samples (Twilio SMS, PayTabs, Meilisearch) now delegate to these helpers so
that every integration shares the same resilience behavior.

## Timeout, retry, and breaker matrix

| Service         | Operation                  | Timeout (ms)                         | Retries                       | Breaker Cooldown | Notes / Files                                                    |
| --------------- | -------------------------- | ------------------------------------ | ----------------------------- | ---------------- | ---------------------------------------------------------------- |
| **PayTabs**     | Payment page request       | 15 000 (`PAYTABS_TIMEOUT_MS`)        | 3 attempts, 750 ms base delay | 30 s             | `lib/paytabs.ts`, `app/api/payments/paytabs/route.ts`            |
|                 | Refund / status query      | 12 000 (`PAYTABS_REFUND_TIMEOUT_MS`) | 3 attempts                    | 30 s             | `services/souq/claims/refund-processor.ts` via `lib/paytabs`     |
|                 | Payout submission / status | 15 000 (`PAYTABS_PAYOUT_TIMEOUT_MS`) | 3 attempts                    | 30 s             | `services/souq/settlements/withdrawal-service.ts`                |
|                 | Transaction verify         | 8 000 (`PAYTABS_VERIFY_TIMEOUT_MS`)  | 3 attempts                    | 30 s             | `lib/paytabs.ts`                                                 |
| **Twilio**      | SMS send / WhatsApp send   | 10 000 (`TWILIO_TIMEOUT_MS`)         | 3 attempts, 500 ms delay      | 20 s             | `lib/sms.ts`, `services/notifications/fm-notification-engine.ts` |
|                 | Delivery status            | 5 000 (`TWILIO_STATUS_TIMEOUT_MS`)   | 3 attempts                    | 20 s             | `lib/sms.ts#getSMSStatus`                                        |
| **Meilisearch** | Product search queries     | 3 000 (`MEILI_SEARCH_TIMEOUT_MS`)    | 3 attempts, 400 ms delay      | 15 s             | `app/api/souq/search/route.ts`, `lib/meilisearch-client.ts`      |
|                 | Index writes / reindex     | 5 000 (`MEILI_INDEXING_TIMEOUT_MS`)  | 3 attempts                    | 15 s             | `services/souq/search-indexer-service.ts`                        |
| **ZATCA**       | Invoice clearance API      | 10 000 (`ZATCA_TIMEOUT_MS`)          | 3 attempts, 1 s delay         | 60 s             | `app/api/payments/paytabs/callback/route.ts`                     |

All numbers live in `config/service-timeouts.ts` and may be overridden by the
environment variables shown above.

## PayTabs latency guarantees

- PayTabs publishes a 15 s SLA for payment requests and recommends issuing a
  duplicate `tran_ref` query before failing the transaction. We encode that as
  the default `PAYTABS_TIMEOUT_MS` and limit retries to three.
- Payout submissions and refunds tend to complete faster, but we still budget
  12–15 s, aligned with PayTabs’ Saudi data-center round-trip averages.
- Verification calls (`payment/query`) use a tighter 8 s budget because they
  execute synchronously in the payment callback route and must return within the
  HTTP timeout window.

## Twilio timeout recommendations

Twilio’s REST guidelines recommend a 5–10 s read timeout. We standardize on:

- `TWILIO_TIMEOUT_MS=10000` for SMS/WhatsApp sends.
- `TWILIO_STATUS_TIMEOUT_MS=5000` for delivery lookups.
- All Twilio SDK calls pass through `withTwilioResilience` in `lib/sms.ts`.

Retries only occur on connection-level failures; Twilio responses with a valid
SID are treated as final to avoid double-sending messages.

## Meilisearch query timeouts

- Query endpoints now use `withMeiliResilience('products-search', 'search', …)`
  so every search request inherits the 3 s timeout and breaker.
- Index writes run through the same helper with the 5 s indexing budget.
- These budgets are intentionally lower than the API gateway timeouts to fail
  fast and trigger retries inside Fixzit instead of letting user requests hang.

## Implementation references

- PayTabs resilience: `lib/paytabs.ts`, `app/api/payments/paytabs/*`.
- Twilio resilience: `lib/sms.ts`, `services/notifications/fm-notification-engine.ts`.
- Meilisearch resilience: `lib/meilisearch-client.ts`, `services/souq/search-indexer-service.ts`, `app/api/souq/search/route.ts`.
- Shared tooling: `lib/resilience/*`, `config/service-timeouts.ts`.

Refer back to this playbook whenever adding a new integration or adjusting the
budgets so that every service follows the same patterns.
