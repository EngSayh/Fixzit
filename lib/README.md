# Fixzit Core Library (`lib/`)

> **Version:** 2.0.27  
> **Last Updated:** January 26, 2025

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
├── cache.ts             # In-memory cache helpers
├── database.ts          # Database abstraction layer
│
├── logger.ts            # Structured logging (Pino-based)
├── audit.ts             # Audit trail logging
├── telemetry.ts         # OpenTelemetry instrumentation
│
├── api/                 # API utilities
├── cache/               # Caching strategies
├── constants/           # Domain-specific constants & labels (bilingual EN/AR)
├── errors/              # Custom error classes
├── finance/             # Financial calculations
├── hr/                  # HR utilities
├── i18n/                # Internationalization
├── integrations/        # Third-party integrations
├── middleware/          # Reusable middleware
├── monitoring/          # Metrics & alerting
├── payments/            # Payment processing
├── queues/              # In-memory job queues
├── reports/             # Report generation
├── routes/              # Route utilities
├── schemas/             # Zod validation schemas
├── security/            # Security utilities
├── storage/             # File storage (S3/local)
├── types/               # TypeScript type definitions
├── utils/               # General utilities
├── validations/         # Form & input validation with Zod schemas
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
} from "@/lib/auth";

// Hash password for storage
const hash = await hashPassword("userPassword");

// Authenticate user
const { token, user } = await authenticateUser(email, password);

// Verify token from request
const payload = await verifyToken(token);
```

**Related:**

- `auth-middleware.ts` - Express middleware for route protection
- `edge-auth-middleware.ts` - Edge runtime auth (Vercel Edge)
- `rbac.ts` - Role-based access control

### Database (`mongodb-unified.ts`)

Unified MongoDB connection module with build-safe toggles and health checks. This module consolidates database connectivity from legacy `mongo.ts` and `mongoose` imports to enforce consistent patterns and health checking across the codebase.

> **Migration Note (REFAC-0015 / NIT-001):** As of Jan 2026, all database imports should use `@/lib/mongodb-unified` instead of `@/lib/mongo` or `@/db/mongoose`. This ensures:
>
> - Single entry point for database connections
> - Build-safe toggles (DISABLE_MONGODB_FOR_BUILD)
> - Consistent health checks via `pingDatabase()`
> - Proper singleton caching in development

```typescript
import { connectDb, db, pingDatabase } from "@/lib/mongodb-unified";

// Connect to database (idempotent, cached)
await connectDb();

// Use raw database handle (for native MongoDB operations)
const database = await db();
const collection = database.collection("users");

// Health check
const { ok, latencyMs } = await pingDatabase();
```

### Logger (`logger.ts`)

Structured logging with correlation IDs:

```typescript
import { logger } from "@/lib/logger";

logger.info("Operation completed", { userId, action: "create" });
logger.error("Operation failed", { error, correlationId });
```

### Cache (`cache/`)

In-memory caching with TTL:

```typescript
import { getCached, CacheTTL } from "@/lib/cache";

// Get with fallback + TTL
const data = await getCached("key", CacheTTL.ONE_HOUR, fetchFunction);
```

### Queues (`queues/`)

In-memory job queues:

```typescript
import { addJob, QUEUE_NAMES } from "@/lib/queues/setup";

await addJob(QUEUE_NAMES.NOTIFICATIONS, "send-email", {
  to: "user@example.com",
  template: "welcome",
});
```

### Constants (`constants/`)

Centralized domain-specific constants with bilingual labels (EN/AR):

```typescript
import {
  ASSET_TYPES,
  ASSET_STATUSES,
  ASSET_CRITICALITY_LEVELS,
  ASSET_TYPE_LABELS,
  ASSET_DEFAULTS,
  type AssetType,
  type AssetStatus,
} from "@/lib/constants/asset-constants";

// Type-safe asset type
const type: AssetType = "HVAC";

// Bilingual labels for dropdowns
const label = ASSET_TYPE_LABELS["HVAC"]; // { en: 'HVAC', ar: 'التكييف', tKey: 'assets.type.hvac' }

// Default values for forms
const defaults = ASSET_DEFAULTS; // { location coordinates, etc. }
```

**Modules:**

- `asset-constants.ts` - Asset types, statuses, criticality levels with EN/AR labels

### Validations (`validations/`)

Zod-based form and input validation schemas:

```typescript
import {
  CreateAssetSchema,
  UpdateAssetSchema,
  createAssetFormDefaults,
  type CreateAssetInput,
} from "@/lib/validations/asset-schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// Use with react-hook-form
const form = useForm<CreateAssetInput>({
  resolver: zodResolver(CreateAssetSchema),
  defaultValues: createAssetFormDefaults,
});

// Validate input
const result = CreateAssetSchema.safeParse(input);
if (!result.success) {
  console.error(result.error.flatten());
}
```

**Schemas:**

- `asset-schemas.ts` - Create/Update asset, location, purchase info schemas

---

## Security Modules

### RBAC (`rbac.ts`)

Role-based access control:

```typescript
import { checkPermission, hasRole } from "@/lib/rbac";

if (!checkPermission(user, "work-orders:create")) {
  throw new ForbiddenError("Insufficient permissions");
}
```

### Secrets (`secrets.ts`)

AWS Secrets Manager integration:

```typescript
import { getSecret } from "@/lib/secrets";

const apiKey = await getSecret("stripe-api-key");
```

### Security Utilities (`security/`)

- CORS configuration
- Rate limiting
- Input sanitization
- XSS prevention

---

## STRICT v4.1 RBAC & Multi-tenancy Essentials

- Canonical roles (14): Super Admin, Corporate Admin, Management, Finance, HR, Corporate Employee, Property Owner, Technician, Tenant/End-User, plus sub-roles Finance Officer, HR Officer, Support, Operations/Ops, and Vendor-facing roles.
- Always include `org_id` scoping on data access; SUPER_ADMIN is the only cross-org role and must be audited.
- Tenants: enforce `unit_id ∈ user.units`; never fetch across units without explicit ownership.
- Technicians: require `org_id` + `assigned_to_user_id === user._id` for FM workflows; respect assignment guards in `domain/fm/fm.behavior.ts`.
- Property Owners/Managers: filter by owned/managed `property_id`; OWNER_DEPUTY aliases follow the same filters.
- Vendors: enforce `vendor_id === user.vendor_id` for Marketplace/Souq flows.
- PII (HR/Finance): restrict to Super Admin, Admin, HR Officer, Finance Officer; avoid logging sensitive fields.

---

## Environment Variables

Key environment variables used by lib modules:

| Variable      | Module     | Description                           |
| ------------- | ---------- | ------------------------------------- |
| `JWT_SECRET`  | auth.ts    | JWT signing secret                    |
| `MONGODB_URI` | mongo.ts   | MongoDB connection string             |
| `AWS_REGION`  | secrets.ts | AWS region for Secrets Manager        |
| `LOG_LEVEL`   | logger.ts  | Logging level (debug/info/warn/error) |

---

## Testing

Unit tests are located in `lib/__tests__/`:

```bash
# Run lib tests (vitest)
pnpm exec vitest run lib/__tests__

# Run specific test
pnpm exec vitest run lib/__tests__/auth.test.ts

# Run with coverage
pnpm exec vitest run --coverage lib/__tests__
```

---

## Best Practices

### Importing

Always use absolute imports:

```typescript
// ✅ Good
import { logger } from "@/lib/logger";

// ❌ Avoid
import { logger } from "../../../lib/logger";
```

### Error Handling

Use custom error classes from `lib/errors/`:

```typescript
import { ValidationError, NotFoundError } from "@/lib/errors";

if (!isValid) {
  throw new ValidationError("Invalid input", { field: "email" });
}
```

### Async Operations

Always handle async errors:

```typescript
import { logger } from "@/lib/logger";

try {
  await riskyOperation();
} catch (error) {
  logger.error("Operation failed", { error });
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

- [Authentication & NextAuth Readiness](../docs/security/NEXTAUTH_V5_PRODUCTION_READINESS.md)
- [CSRF Token Flow](../docs/archived/CSRF_TOKEN_FLOW.md)
- [Security Guidelines](../docs/guides/SECURITY.md)
- [Architecture Overview](../docs/architecture/ARCHITECTURE.md)
