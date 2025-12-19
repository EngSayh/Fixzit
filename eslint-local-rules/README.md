# Fixzit Custom ESLint Rules

## Overview
Custom ESLint rules to enforce Fixzit domain invariants, particularly multi-tenancy and RBAC.

## Rules

### `local/require-tenant-scope`

**Purpose**: Detect MongoDB/Mongoose queries that may be missing tenant scope filters.

**Severity**: `warn` (non-blocking, for gradual adoption)

**Applies to**:
- `app/api/**/*.{ts,tsx}`
- `lib/**/*.{ts,tsx}`
- `server/**/*.{ts,tsx}`
- `domain/**/*.{ts,tsx}`

**Detects**:
- `Model.find({})` without `org_id` or `property_owner_id`
- `Model.findOne({ field: value })` missing tenant filter
- `Model.updateMany({})` without tenant scope
- All write methods: `create`, `insertMany`, `updateOne`, `updateMany`, `findOneAndUpdate`, `findByIdAndUpdate`, `deleteOne`, `deleteMany`, `findOneAndDelete`, `findByIdAndDelete`, `replaceOne`
- Read methods: `find`, `findOne`, `findById`, `count`, `countDocuments`, `aggregate`

**Exceptions** (automatically skipped):
- Platform-wide models: `Category`, `Brand`, `Job`, `HelpArticle`, `KnowledgeBaseArticle`, `Template`, `GlobalSetting`, `SystemAuditLog`, `RateLimitBucket`
- Queries with variables (cannot be statically analyzed)
- Queries with explicit tenant fields: `org_id`, `orgId`, `property_owner_id`, `propertyOwnerId`
- Queries with exemption comments: `// PLATFORM-WIDE`, `// SUPER_ADMIN`, `// NO_TENANT_SCOPE`

**Examples**:

❌ **Bad** (will trigger warning):
```typescript
// Missing tenant scope
const users = await User.find({});

// Missing tenant filter
const user = await User.findOne({ email: "test@example.com" });

// Missing tenant scope on write
await WorkOrder.updateMany({}, { status: "closed" });
```

✅ **Good** (no warning):
```typescript
// Has tenant scope
const users = await User.find({ org_id: orgId });

// Has tenant scope with property owner
const properties = await Property.find({ property_owner_id: ownerId });

// Platform-wide model (automatically exempt)
const categories = await Category.find({});

// Documented platform-wide query
// PLATFORM-WIDE: Jobs are shared across all tenants
const jobs = await Job.find({ status: "published" });
```

---

### `local/require-lean`

**Purpose**: Suggest `.lean()` for read-only Mongoose queries to reduce hydration overhead.

**Severity**: `warn` (non-blocking, for gradual adoption)

**Applies to**:
- `app/api/**/*.{ts,tsx}`
- `lib/**/*.{ts,tsx}`
- `server/**/*.{ts,tsx}`
- `domain/**/*.{ts,tsx}`

**Detects**:
- `await Model.find(...)` without `.lean()`
- `return Model.findOne(...)` without `.lean()`
- `await Model.findById(...)` without `.lean()`

**Exceptions** (automatically skipped):
- Queries already chained with `.lean()`
- Queries not directly awaited/returned (e.g., query builders)
- Queries with exemption comments: `// NO_LEAN`

**Examples**:

❌ **Bad** (will trigger warning):
```typescript
const users = await User.find({ orgId });
return User.findOne({ orgId, email });
```

✅ **Good** (no warning):
```typescript
const users = await User.find({ orgId }).lean();
return User.findOne({ orgId, email }).lean();

// NO_LEAN: requires document methods/virtuals
const doc = await User.findOne({ orgId, email });
```

## Usage

The rule is enabled by default in `eslint.config.mjs` for all API routes and data access layers.

To run ESLint with this rule:
```bash
pnpm lint
```

To check a specific file:
```bash
pnpm eslint app/api/path/to/file.ts
```

## Configuration

To adjust the severity or disable the rule:

```javascript
// eslint.config.mjs
{
  files: ["app/api/**/*.{ts,tsx}"],
  rules: {
    "local/require-tenant-scope": "off", // or "error" for strict enforcement
  },
}
```

## Adding Platform-Wide Models

If you add a new model that is intentionally platform-wide (no tenant scope), add it to the `PLATFORM_WIDE_MODELS` set in `eslint-local-rules/index.js`:

```javascript
const PLATFORM_WIDE_MODELS = new Set([
  // ... existing models
  "YourNewModel",
]);
```

## Maintenance

- **Location**: `eslint-local-rules/index.js`
- **Tests**: Run ESLint on API routes to verify detection
- **Gradual Adoption**: Rule is set to `warn` to allow gradual fixes without blocking builds

## Future Enhancements

- Add auto-fix suggestions to inject tenant filters
- Detect missing RBAC checks
- Enforce rate limiting on public endpoints
- Detect missing error handling patterns
