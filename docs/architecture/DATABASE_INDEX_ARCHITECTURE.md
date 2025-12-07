# Database Index Architecture

**Created**: 2025-12-07  
**Version**: 1.0  
**Scope**: MongoDB index management strategy for multi-tenant Fixzit

---

## Overview

Fixzit uses a **dual-source index architecture** to manage MongoDB indexes. This document explains the architecture, when to use each approach, and how to prevent IndexOptionsConflict errors.

---

## Architecture Summary

### Two Approaches

| Approach | File | Use Case | Models Using This |
|----------|------|----------|-------------------|
| **Manual Native Driver** | `lib/db/collections.ts` | High-volume collections requiring explicit control | WorkOrder, Product, Property, Invoice, Order, SupportTicket |
| **Mongoose Schema** | `model.createIndexes()` | Smaller collections where schema-driven indexes suffice | User, Vendor, Tenant, Organization, WorkOrderComment, WorkOrderAttachment, WorkOrderTimeline, QaLog, QaAlert |

### Key Principle

> **Each collection should use ONE approach, never both.**

Using both approaches for the same collection causes `IndexOptionsConflict` errors during deployment.

---

## Detailed Approach Descriptions

### Approach 1: Manual Native Driver (`lib/db/collections.ts`)

**Location**: `lib/db/collections.ts` → `createIndexes()` function

**Characteristics**:
- Uses MongoDB native driver: `db.collection().createIndex()`
- **Explicit index names** (e.g., `workorders_orgId_status`)
- Full control over index options (background, TTL, partial filters)
- Indexes are created during deployment via `ensureCoreIndexes()`

**When to Use**:
- High-volume collections (>100K documents expected)
- Collections requiring complex index configurations
- Collections with many indexes (>5)
- When explicit naming is critical for operations/debugging

**Example**:
```typescript
// In lib/db/collections.ts
await db.collection(COLLECTIONS.WORK_ORDERS).createIndex(
  { orgId: 1, status: 1 },
  { background: true, name: "workorders_orgId_status" }
);
```

**Schema Requirements**:
- Set `autoIndex: false` in schema options
- Do NOT define indexes in the schema (or they become documentation-only)

### Approach 2: Mongoose Schema (`model.createIndexes()`)

**Location**: Individual model files (e.g., `server/models/User.ts`)

**Characteristics**:
- Uses Mongoose: `Schema.index()` + `model.createIndexes()`
- Index names defined in schema index options
- Called during deployment via `ensureCoreIndexes()` → `modelIndexTargets`

**When to Use**:
- Smaller collections (<100K documents)
- Collections with few indexes (≤5)
- When indexes are tightly coupled to schema design
- When schema serves as documentation

**Example**:
```typescript
// In server/models/User.ts
UserSchema.index(
  { orgId: 1, email: 1 },
  { unique: true, partialFilterExpression: UNIQUE_TENANT_FILTER, name: "users_orgId_email_unique" }
);

// Schema options
{
  timestamps: true,
  autoIndex: false, // Manual control via ensureCoreIndexes()
}
```

---

## Index Naming Convention

All indexes MUST have explicit names following this pattern:

```
{collection}_{field1}_{field2}[_{modifier}]
```

**Examples**:
- `workorders_orgId_status`
- `workorders_orgId_workOrderNumber_unique`
- `users_orgId_email_unique`
- `products_orgId_sku_unique`
- `qalogs_createdAt_ttl_30d`

**Naming Rules**:
1. Collection name in lowercase, singular or matching COLLECTIONS constant
2. Fields in camelCase, separated by underscore
3. `_unique` suffix for unique indexes
4. `_ttl_Xd` suffix for TTL indexes (X = days)

---

## Multi-Tenancy Requirements (STRICT v4.1)

### All Indexes MUST be Org-Scoped

Every index that touches business data MUST include `orgId` as the first key:

```typescript
// ✅ CORRECT - Org-scoped
{ orgId: 1, email: 1 }
{ orgId: 1, status: 1, priority: 1 }

// ❌ WRONG - Global index (tenant data leak risk)
{ email: 1 }
{ status: 1, priority: 1 }
```

### Unique Indexes MUST Use Partial Filter Expression

For tenant-scoped unique constraints:

```typescript
const UNIQUE_TENANT_FILTER = { orgId: { $exists: true } };

UserSchema.index(
  { orgId: 1, email: 1 },
  { 
    unique: true, 
    partialFilterExpression: UNIQUE_TENANT_FILTER,
    name: "users_orgId_email_unique"
  }
);
```

This ensures:
1. Uniqueness is enforced within each tenant
2. Legacy documents without `orgId` don't block new inserts
3. Cross-tenant uniqueness is NOT enforced (each tenant can have same email)

---

## Preventing IndexOptionsConflict

### Root Cause

IndexOptionsConflict occurs when:
1. Same index key spec exists with different options (name, background, TTL)
2. Both schema AND manual indexes define the same index
3. Mongoose auto-creates indexes while manual creation also runs

### Prevention Checklist

1. **Set `autoIndex: false`** in schema options for all models with manual indexes
2. **Never define indexes in both locations** for the same collection
3. **Always use explicit index names** to enable comparison
4. **Run `scripts/ensure-indexes.ts --verify`** before deployment to detect conflicts

### Migration Path: Dual-Defined to Single-Source

If a model has indexes defined in BOTH locations:

1. Decide which approach to use (see "When to Use" above)
2. Remove indexes from the other location
3. Set `autoIndex: false` if using manual approach
4. Run `db.collection.dropIndexes()` in staging to clear old indexes
5. Re-run `ensureCoreIndexes()` to create clean indexes
6. Verify with `--verify` flag

---

## File Reference

| File | Purpose |
|------|---------|
| `lib/db/collections.ts` | Manual index definitions (createIndexes function) |
| `lib/db/index.ts` | Orchestrator that calls both approaches |
| `server/models/*.ts` | Schema-based index definitions |
| `scripts/ensure-indexes.ts` | CLI tool for index management |

---

## Adding New Indexes

### For Collections Using Manual Approach

1. Add index to `lib/db/collections.ts`:
   ```typescript
   await db.collection(COLLECTIONS.YOUR_COLLECTION).createIndex(
     { orgId: 1, newField: 1 },
     { background: true, name: "yourcollection_orgId_newField" }
   );
   ```

2. Test locally: `npx tsx scripts/ensure-indexes.ts`

3. Verify: `npx tsx scripts/ensure-indexes.ts --verify`

### For Collections Using Schema Approach

1. Add index to model schema:
   ```typescript
   YourSchema.index(
     { orgId: 1, newField: 1 },
     { name: "yourcollection_orgId_newField" }
   );
   ```

2. Ensure model is in `modelIndexTargets` array in `lib/db/index.ts`

3. Test locally: `npx tsx scripts/ensure-indexes.ts`

---

## Deployment

Indexes are created during deployment via:

```bash
npx tsx scripts/ensure-indexes.ts
```

This calls `ensureCoreIndexes()` which:
1. Calls `createIndexes()` from `lib/db/collections.ts`
2. Calls `model.createIndexes()` for each model in `modelIndexTargets`

**Pre-deployment Verification**:
```bash
npx tsx scripts/ensure-indexes.ts --verify
```

---

## Troubleshooting

### Error: IndexOptionsConflict

**Symptom**: Deployment fails with IndexOptionsConflict error

**Diagnosis**:
```bash
# List all indexes on collection
mongosh --eval "db.workorders.getIndexes()"
```

**Fix**:
1. Identify conflicting index (same key spec, different options)
2. Drop the incorrect index
3. Ensure only ONE source defines the index
4. Re-run deployment

### Error: Index Not Found

**Symptom**: Query slow, explain shows COLLSCAN

**Diagnosis**:
```bash
npx tsx scripts/ensure-indexes.ts --verify
```

**Fix**:
1. Add missing index to appropriate location
2. Re-run `ensureCoreIndexes()`

---

**Document Owner**: Engineering Team  
**Last Updated**: 2025-12-07
