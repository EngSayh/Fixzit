# Redis Architecture

> **Last Updated**: 2025-01-17  
> **Maintainers**: Engineering Team

## Overview

Fixzit uses **ioredis** as the unified Redis client library, but provides two distinct access patterns based on runtime and use-case requirements:

| Module | Purpose | Runtime | Features |
|--------|---------|---------|----------|
| `lib/redis.ts` | Caching + Singleton | Edge-safe | Dynamic require, fallback support |
| `lib/redis-client.ts` | Caching + Rate Limiting | Server-only | Direct import, in-memory fallbacks |
| `lib/queues/setup.ts` | BullMQ Job Queues | Server-only | Uses `lib/redis.ts` connection |

## Why Two Redis Modules?

### 1. Edge Runtime Compatibility (`lib/redis.ts`)

Next.js Edge Runtime does **not** support:
- The `dns` module (required by ioredis)
- Node.js `require()` 

To avoid bundling ioredis into Edge/client builds (which would crash), `lib/redis.ts` uses:

```typescript
// Dynamic require at runtime, not import at bundle time
function getRedisCtor(): RedisCtor | null {
  if (typeof require === "undefined") return null;
  try {
    const mod = require("ioredis");
    return mod.default || mod;
  } catch {
    return null; // Graceful fallback
  }
}
```

**Use `lib/redis.ts` when:**
- Code might run in Edge runtime (API routes, middleware)
- You need graceful Redis unavailability handling
- You need connection observability metrics

### 2. Server-Only with Fallbacks (`lib/redis-client.ts`)

For server-only code that needs guaranteed caching (even without Redis), this module provides:

- Direct ioredis import (smaller bundle for server-only code)
- **In-memory fallback** when Redis is not configured
- Built-in rate limiting support

```typescript
// Falls back to in-memory if Redis unavailable
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const client = getRedisClient();
    if (client) {
      // Try Redis
      const value = await client.get(key);
      return value ? JSON.parse(value) : null;
    }
    // Fallback to in-memory
    const memoryValue = memoryGet(key);
    return memoryValue ? JSON.parse(memoryValue) : null;
  },
  // ...
};
```

**Use `lib/redis-client.ts` when:**
- Code is server-only (never Edge runtime)
- You need in-memory fallback for development
- You need rate limiting utilities

## BullMQ Queues (`lib/queues/setup.ts`)

BullMQ requires a persistent Redis connection for job durability. It imports from `lib/redis.ts`:

```typescript
import { getRedisClient } from '@/lib/redis';

function requireRedisConnection(context: string): Redis {
  const connection = getRedisClient();
  if (!connection) {
    throw new Error(`Redis not configured for ${context}`);
  }
  return connection;
}
```

### Queue Names

```typescript
export const QUEUE_NAMES = {
  BUY_BOX_RECOMPUTE: 'souq:buybox-recompute',
  AUTO_REPRICER: 'souq:auto-repricer',
  SETTLEMENT: 'souq:settlement',
  REFUNDS: 'souq:refunds',
  INVENTORY_HEALTH: 'souq:inventory-health',
  ADS_AUCTION: 'souq:ads-auction',
  POLICY_SWEEP: 'souq:policy-sweep',
  SEARCH_INDEX: 'souq:search-index',
  ACCOUNT_HEALTH: 'souq:account-health',
  NOTIFICATIONS: 'souq:notifications',
};
```

## Environment Variables

```bash
# Primary Redis URL (required for production)
REDIS_URL=rediss://user:pass@host:6379

# Alternative names (for compatibility)
REDIS_KEY=rediss://...       # Vercel/GitHub Actions convention
BULLMQ_REDIS_URL=rediss://... # Dedicated queue instance
OTP_STORE_REDIS_URL=rediss://... # Dedicated OTP instance

# Component-based config (fallback)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=secret
REDIS_DB=0
```

## Connection Observability

`lib/redis.ts` provides metrics for monitoring:

```typescript
const metrics = getRedisMetrics();
// {
//   connectionAttempts: 5,
//   successfulConnections: 4,
//   connectionErrors: 1,
//   reconnectAttempts: 2,
//   lastConnectedAt: Date,
//   lastErrorAt: Date,
//   lastError: 'ECONNREFUSED',
//   currentStatus: 'ready'
// }
```

## Decision Tree

```
Is code Edge-compatible or might run in middleware?
├── YES → Use lib/redis.ts (dynamic require)
└── NO → Is graceful degradation needed?
    ├── YES → Use lib/redis-client.ts (in-memory fallback)
    └── NO → Is this for BullMQ queues?
        ├── YES → Use lib/queues/setup.ts (requires Redis)
        └── NO → Use lib/redis.ts (singleton, metrics)
```

## Cache Key Patterns

### Standard Naming

```typescript
// Pattern: {domain}:{entity}:{id}:{field}
'seller:abc123:balance'
'analytics:org456:30'  // 30-day analytics
'otp:phone:+1234567890'
```

### Security: Key Redaction

All logging redacts cache keys to prevent ID enumeration:

```typescript
redactCacheKey("seller:12345:balance")
// → "seller:1234****:balance"
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

## Health Checks

```typescript
// lib/redis.ts
const healthy = await isRedisHealthy();
// Returns true if PING returns PONG

// For queue health
const stats = await getQueueStats('souq:notifications');
// { waiting: 5, active: 2, completed: 100, failed: 1, delayed: 0, paused: 0 }
```

## Common Issues

### 1. "Redis not configured" in development

This is expected. Set `REDIS_URL` or use the in-memory fallbacks.

### 2. Connection exhaustion

**Problem**: Creating new Redis() per request exhausts connections.

**Solution**: Always use singleton `getRedisClient()`, never `new Redis()`.

### 3. Edge runtime crash

**Problem**: `Cannot find module 'dns'`

**Solution**: Code using Redis must not be in Edge runtime. Use `lib/redis.ts` which handles this gracefully.

### 4. BullMQ jobs not processing

**Check**:
1. Is `REDIS_URL` set?
2. Is the worker started? (Call `createWorker()`)
3. Check queue stats: `getQueueStats(QUEUE_NAMES.NOTIFICATIONS)`

## Migration Guide

### From multiple Redis instances to singleton:

```diff
- import Redis from 'ioredis';
- const redis = new Redis(process.env.REDIS_URL);
+ import { getRedisClient, getCached } from '@/lib/redis';
+ const redis = getRedisClient(); // May be null!

// Better: Use cache helpers
- const value = await redis.get(key);
+ const value = await getCached(key, CacheTTL.FIVE_MINUTES, fetchData);
```

## Related Documentation

- [BullMQ Documentation](https://docs.bullmq.io/)
- [ioredis GitHub](https://github.com/redis/ioredis)
- [Next.js Edge Runtime](https://nextjs.org/docs/api-reference/edge-runtime)
