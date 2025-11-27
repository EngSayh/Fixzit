# Fixzit Core Library (`lib/`)

> **Version:** 2.0.26  
> **Last Updated:** November 27, 2025

This directory contains the core utility modules, shared libraries, and infrastructure code used across the Fixzit platform.

---

## Directory Structure

```
lib/
├── auth.ts              # JWT authentication & password hashing
├── auth-middleware.ts   # Express-style auth middleware
├── authz.ts             # Authorization & permission checks
├── rbac.ts              # Role-based access control
│
├── mongo.ts             # MongoDB connection & utilities
├── redis.ts             # Redis client & caching
├── database.ts          # Database abstraction layer
│
├── logger.ts            # Structured logging (Pino-based)
├── audit.ts             # Audit trail logging
├── telemetry.ts         # OpenTelemetry instrumentation
│
├── api/                 # API utilities
├── cache/               # Caching strategies
├── errors/              # Custom error classes
├── finance/             # Financial calculations
├── hr/                  # HR utilities
├── i18n/                # Internationalization
├── integrations/        # Third-party integrations
├── middleware/          # Reusable middleware
├── monitoring/          # Metrics & alerting
├── payments/            # Payment processing
├── queues/              # BullMQ job queues
├── reports/             # Report generation
├── routes/              # Route utilities
├── schemas/             # Zod validation schemas
├── security/            # Security utilities
├── storage/             # File storage (S3/local)
├── types/               # TypeScript type definitions
├── utils/               # General utilities
├── validations/         # Input validation
└── vendor/              # Vendor-specific integrations
```

---

## Key Modules

### Authentication (`auth.ts`)

Core authentication functions for JWT-based auth:

```typescript
import {
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  authenticateUser,
  getUserFromToken,
} from '@/lib/auth';

// Hash password for storage
const hash = await hashPassword('userPassword');

// Authenticate user
const { token, user } = await authenticateUser(email, password);

// Verify token from request
const payload = await verifyToken(token);
```

**Related:**
- `auth-middleware.ts` - Express middleware for route protection
- `edge-auth-middleware.ts` - Edge runtime auth (Vercel Edge)
- `rbac.ts` - Role-based access control

### Database (`mongo.ts`)

MongoDB connection with connection pooling and retry logic:

```typescript
import { db, getDb } from '@/lib/mongo';

// Use default database
await db;

// Get specific database instance
const database = await getDb();
const collection = database.collection('users');
```

### Logger (`logger.ts`)

Structured logging with correlation IDs:

```typescript
import { logger } from '@/lib/logger';

logger.info('Operation completed', { userId, action: 'create' });
logger.error('Operation failed', { error, correlationId });
```

### Cache (`cache/`)

Multi-tier caching with Redis:

```typescript
import { cache } from '@/lib/cache';

// Set with TTL
await cache.set('key', value, { ttl: 3600 });

// Get with fallback
const data = await cache.getOrSet('key', fetchFunction);
```

### Queues (`queues/`)

BullMQ-based job queues:

```typescript
import { addJob, QUEUE_NAMES } from '@/lib/queues/setup';

await addJob(QUEUE_NAMES.NOTIFICATIONS, 'send-email', {
  to: 'user@example.com',
  template: 'welcome',
});
```

---

## Security Modules

### RBAC (`rbac.ts`)

Role-based access control:

```typescript
import { checkPermission, hasRole } from '@/lib/rbac';

if (!checkPermission(user, 'work-orders:create')) {
  throw new ForbiddenError('Insufficient permissions');
}
```

### Secrets (`secrets.ts`)

AWS Secrets Manager integration:

```typescript
import { getSecret } from '@/lib/secrets';

const apiKey = await getSecret('stripe-api-key');
```

### Security Utilities (`security/`)

- CORS configuration
- Rate limiting
- Input sanitization
- XSS prevention

---

## Environment Variables

Key environment variables used by lib modules:

| Variable | Module | Description |
|----------|--------|-------------|
| `JWT_SECRET` | auth.ts | JWT signing secret |
| `MONGODB_URI` | mongo.ts | MongoDB connection string |
| `REDIS_URL` | redis.ts | Redis connection URL |
| `AWS_REGION` | secrets.ts | AWS region for Secrets Manager |
| `LOG_LEVEL` | logger.ts | Logging level (debug/info/warn/error) |

---

## Testing

Unit tests are located in `lib/__tests__/`:

```bash
# Run lib tests
pnpm test lib/

# Run specific test
pnpm test lib/auth.test.ts

# Run with coverage
pnpm test:coverage lib/
```

---

## Best Practices

### Importing

Always use absolute imports:

```typescript
// ✅ Good
import { logger } from '@/lib/logger';

// ❌ Avoid
import { logger } from '../../../lib/logger';
```

### Error Handling

Use custom error classes from `lib/errors/`:

```typescript
import { ValidationError, NotFoundError } from '@/lib/errors';

if (!isValid) {
  throw new ValidationError('Invalid input', { field: 'email' });
}
```

### Async Operations

Always handle async errors:

```typescript
import { logger } from '@/lib/logger';

try {
  await riskyOperation();
} catch (error) {
  logger.error('Operation failed', { error });
  throw error; // Re-throw or handle appropriately
}
```

---

## Contributing

1. Follow existing patterns in the codebase
2. Add JSDoc comments to all exported functions
3. Write unit tests for new functionality
4. Update this README if adding new modules

---

## Related Documentation

- [Authentication Flow](../docs/AUTH_FLOW.md)
- [CSRF Token Flow](../docs/CSRF_TOKEN_FLOW.md)
- [API Security Guidelines](../docs/API_SECURITY.md)
- [Codebase Architecture](../docs/ARCHITECTURE.md)
