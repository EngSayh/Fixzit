# Tenant Update Triage Report

**Generated:** 2025-12-21
**Total Direct DB Updates:** 28

## Classification Rules

| Risk | Criteria |
|------|----------|
| ✅ **Safe** | Uses tenantIsolationPlugin OR explicit orgId in filter |
| ⚠️ **Review** | Uses raw collection access without visible tenant scope |
| ❌ **Vulnerable** | No tenant scope detected in update path |

---

## Triage Results

### Models with `tenantIsolationPlugin`

366 plugin usages detected across models - all Mongoose model operations automatically enforce tenant scope.

---

### API Route Updates - Detailed Analysis

| File | Line | Pattern | Tenant Scope | Verdict |
|------|------|---------|--------------|---------|
| `app/api/rfqs/[id]/bids/route.ts` | 247 | `RFQ.updateOne({ _id: rfq._id, orgId: user.orgId }, ...)` | ✅ Explicit `orgId` in filter | ✅ Safe |
| `app/api/notifications/bulk/route.ts` | 97, 107, 117 | `notifications.updateMany(filter, ...)` where `filter = { _id: { $in: ids }, orgId }` | ✅ Explicit `orgId` in filter | ✅ Safe |
| `app/api/issues/import/route.ts` | 280 | `Issue.updateOne(...)` | ✅ Uses Mongoose model with plugin | ✅ Safe |
| `app/api/admin/users/[id]/route.ts` | 242 | `UserModel.updateOne(...)` | ✅ SUPER_ADMIN only route | ✅ Safe (privileged) |
| `app/api/auth/reset-password/route.ts` | 143 | `User.updateOne(...)` | ✅ Token-validated user self-update | ✅ Safe |
| `app/api/support/incidents/route.ts` | 298 | `.updateOne(...)` | ✅ Uses Mongoose model with plugin | ✅ Safe |
| `app/api/support/tickets/[id]/reply/route.ts` | 129 | `SupportTicket.updateOne({ _id: id }, ...)` | ✅ Prior findOne validates orgId/ownership (line 97) | ✅ Safe |
| `app/api/fm/reports/process/route.ts` | 148, 161, 180 | `collection.updateOne(...)` | ✅ jobDoc obtained from findOneAndUpdate with `{ orgId: tenantId }` | ✅ Safe |
| `app/api/fm/system/users/invite/route.ts` | 193 | `collection.updateOne(...)` | ✅ doc._id from insertOne just created in tenant scope | ✅ Safe |
| `app/api/webhooks/sendgrid/route.ts` | 203, 208 | `emailsCollection.updateOne({ emailId }, ...)` | ✅ Webhook correlation ID (no tenant) | ✅ Safe (webhook) |
| `app/api/souq/settlements/request-payout/route.ts` | 214, 240 | `db.collection(...).updateOne(...)` | ✅ Filter includes `orgId: { $in: orgCandidates }` | ✅ Safe |
| `app/api/souq/claims/[id]/decision/route.ts` | 178 | `db.collection(COLLECTIONS.CLAIMS).updateOne(filter, ...)` | ✅ filter includes `buildOrgScopeFilter(userOrgId)` (line 108) | ✅ Safe |

---

### Model-Level Updates (Instance Methods)

| File | Line | Pattern | Tenant Scope | Verdict |
|------|------|---------|--------------|---------|
| `server/models/FeatureFlag.ts` | 427, 432 | `this.updateOne({ key }, ...)` | ✅ Global flags (no tenant) | ✅ Safe (global) |
| `server/models/aqar/Listing.ts` | 661, 671, 678 | Instance method `this.constructor.updateOne(...)` | ✅ Called on scoped instance | ✅ Safe |
| `server/models/aqar/Project.ts` | 167, 174 | Instance method `this.constructor.updateOne(...)` | ✅ Called on scoped instance | ✅ Safe |
| `server/models/TestingUser.ts` | 358 | `this.updateMany(...)` | ✅ Test-only model | ✅ Safe (test) |
| `server/models/ServiceProvider.ts` | 537 | `this.updateOne(...)` | ✅ Instance method on scoped doc | ✅ Safe |

---

### Service-Level Updates

| File | Line | Pattern | Tenant Scope | Verdict |
|------|------|---------|--------------|---------|
| `server/services/hr/payroll-finance.integration.ts` | 218 | `PayrollRun.updateOne(...)` | ✅ Uses Mongoose model with plugin | ✅ Safe |

---

## Audit Verification (2025-12-21)

All 5 flagged raw collection operations have been manually verified:

| File | Verification |
|------|--------------|
| `fm/reports/process/route.ts` | ✅ jobDoc from findOneAndUpdate with `{ orgId: tenantId }` (line 98) |
| `fm/system/users/invite/route.ts` | ✅ doc._id from insertOne in tenant context |
| `souq/settlements/request-payout/route.ts` | ✅ Filter includes `orgId: { $in: orgCandidates }` |
| `souq/claims/[id]/decision/route.ts` | ✅ Filter uses `buildOrgScopeFilter(userOrgId)` (line 108) |
| `support/tickets/[id]/reply/route.ts` | ✅ Prior findOne validates `{ orgId: user?.orgId }` (line 97) |

**Result: All raw collection operations are tenant-scoped. No cross-tenant write vulnerabilities.**

---

## Recommendations

1. **Prefer Mongoose models** over raw collection access for automatic tenant isolation
2. **Add explicit tenant filter** when using raw `db.collection()` operations
3. **Use `setTenantContext()`** before any model operations in API routes
4. **Add lint rule** to flag `db.collection().update*` without `orgId` in filter

---

## Related Files

- `reports/direct-db-updates.txt` - Raw grep output
- `reports/findByIdAndUpdate.usage.txt` - findByIdAndUpdate patterns (uses plugin)
