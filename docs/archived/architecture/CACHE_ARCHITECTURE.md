# Cache Architecture (In-Memory)

> **Last Updated**: 2025-01-17  
> **Maintainers**: Engineering Team

## Overview

Fixzit uses in-memory cache and queue helpers to avoid external cache/queue dependencies.
These helpers are single-instance only and reset on process restart.

| Module | Purpose | Runtime | Notes |
|--------|---------|---------|-------|
| `lib/cache.ts` | In-memory cache wrapper | Server-only | TTL support + metrics |
| `lib/otp-store.ts` | OTP + rate limit store | Server-only | In-memory, single-instance |
| `lib/queue.ts` | Queue primitives | Server-only | In-memory Queue/Worker/Job |
| `lib/queues/setup.ts` | Queue registry | Server-only | Queue names + helpers |

## Cache (`lib/cache.ts`)

`lib/cache.ts` wraps `MemoryKV` with TTL and basic metrics.

```typescript
import { getCached, CacheTTL } from "@/lib/cache";

const result = await getCached("seller:abc123:balance", CacheTTL.FIVE_MINUTES, fetchBalance);
```

### Cache Metrics

```typescript
const metrics = getCacheMetrics();
// {
//   hits: 10,
//   misses: 4,
//   writes: 6,
//   deletes: 2,
//   errors: 0,
//   lastErrorAt: null,
//   lastError: null
// }
```

## Queue (`lib/queue.ts` + `lib/queues/setup.ts`)

Queues are in-memory and process-local. Use `lib/queues/setup.ts` for named queues
and worker helpers.

```typescript
import { createWorker, QUEUE_NAMES } from "@/lib/queues/setup";

createWorker(QUEUE_NAMES.REFUNDS, async (job) => {
  // handle refund retry
  return { ok: true };
});
```

### Queue Names

```typescript
export const QUEUE_NAMES = {
  BUY_BOX_RECOMPUTE: "souq:buybox-recompute",
  AUTO_REPRICER: "souq:auto-repricer",
  SETTLEMENT: "souq:settlement",
  REFUNDS: "souq:refunds",
  INVENTORY_HEALTH: "souq:inventory-health",
  ADS_AUCTION: "souq:ads-auction",
  POLICY_SWEEP: "souq:policy-sweep",
  SEARCH_INDEX: "souq:search-index",
  ACCOUNT_HEALTH: "souq:account-health",
  NOTIFICATIONS: "souq:notifications",
  EXPORTS: "fm:exports",
};
```

## Environment Variables

No cache/queue-specific environment variables are required. The database still uses:

```bash
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/fixzit
```

## Decision Tree

```
Need cached data?
YES -> Use lib/cache.ts
NO  -> Need a background job?
       YES -> Use lib/queue.ts or lib/queues/setup.ts
       NO  -> Use direct database calls
```

## Cache Key Patterns

```typescript
// Pattern: {domain}:{entity}:{id}:{field}
"seller:abc123:balance"
"analytics:org456:30" // 30-day analytics
"otp:phone:+1234567890"
```

## Cache TTLs

```typescript
export const CacheTTL = {
  FIVE_MINUTES: 300,
  FIFTEEN_MINUTES: 900,
  ONE_HOUR: 3600,
  ONE_DAY: 86400,
  ONE_WEEK: 604800,
} as const;
```

## Common Issues

### 1. Cache/queue resets on restart

In-memory state is cleared when the process restarts. Plan for retries or rebuilds.

### 2. Multi-instance deployments

In-memory queues and caches are not shared across instances. Use a centralized
queue/cache if horizontal scaling is required.

### 3. Jobs not processing

Ensure the worker process is running and `createWorker` is called for the queue name.

## Migration Guide

### From external queues to in-memory:

```diff
- import { Queue } from "external-queue-lib";
- const queue = new Queue("souq:refunds", { connection: externalQueue });
+ import { Queue } from "@/lib/queue";
+ const queue = new Queue("souq:refunds");
```

## Related Documentation

