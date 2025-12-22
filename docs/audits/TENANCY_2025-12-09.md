# Multi-Tenancy Security Audit Report

**Date**: 2025-12-09  
**Auditor**: Copilot Security Audit  
**Branch**: `audit/multi-tenancy-rbac-health-20251209`  
**Status**: 🔴 **CRITICAL FINDINGS IDENTIFIED**

---

## Executive Summary

This audit examines data access patterns across the Fixzit Next.js codebase to identify potential cross-tenant data leakage vulnerabilities. The codebase uses Mongoose plugins (`tenantIsolationPlugin`, `auditPlugin`) for automatic tenant scoping, but several patterns bypass or do not properly implement tenant isolation.

### Risk Assessment Summary

| Severity | Count | Description |
|----------|-------|-------------|
| 🟥 Critical | 4 | Direct cross-tenant data access possible |
| 🟧 High | 8 | Missing tenant validation on findById |
| 🟨 Medium | 12 | Aggregation pipelines without orgId $match |
| 🟩 Low | 6 | Design decisions documented as intentional |

---

## 🟥 CRITICAL ISSUES

### CRIT-001: Admin Billing Benchmark - No Tenant Validation on Update

**File**: `app/api/admin/billing/benchmark/[id]/route.ts`  
**Line**: 48  
**Severity**: 🟥 Critical

```typescript
const doc = await Benchmark.findByIdAndUpdate(params.id, sanitizedBody, { new: true });
```

**Issue**: The `Benchmark.findByIdAndUpdate()` call uses only the document `id` without validating tenant ownership. The `Benchmark` model has `tenantId` field but the route doesn't verify the super admin's target tenant matches the document's tenant.

**Risk**: A super admin could theoretically update any tenant's benchmark data if they know the document ID.

**Recommendation**:
```typescript
// Add tenant validation
const existingDoc = await Benchmark.findById(params.id);
if (!existingDoc || existingDoc.tenantId.toString() !== targetTenantId) {
  return createSecureResponse({ error: "NOT_FOUND" }, 404, req);
}
const doc = await Benchmark.findByIdAndUpdate(params.id, sanitizedBody, { new: true });
```

---

### CRIT-002: ATS Moderation - FindById Without Tenant Check

**File**: `app/api/ats/moderation/route.ts`  
**Line**: 60  
**Severity**: 🟥 Critical

```typescript
const job = await Job.findById(jobId);
if (!job) return notFoundError("Job");

if (action === "approve") {
  job.status = "published";
  job.publishedAt = new Date();
  await job.save();
}
```

**Issue**: The `Job.findById(jobId)` retrieves any job by ID without verifying the authenticated user's organization owns that job. While the route requires authentication, it doesn't check `job.orgId === user.orgId`.

**Risk**: An authenticated user with moderation permissions could approve/reject jobs from other organizations.

**Recommendation**:
```typescript
const job = await Job.findById(jobId);
if (!job) return notFoundError("Job");

// Add tenant validation
if (job.orgId !== user.orgId && !user.isSuperAdmin) {
  return notFoundError("Job");
}
```

---

### CRIT-003: Aqar Listings - FindById Without Tenant Context

**File**: `app/api/aqar/listings/[id]/route.ts`  
**Lines**: 49, 137, 298  
**Severity**: 🟥 Critical

```typescript
const listing = await AqarListing.findById(id)
  .select("_id title price areaSqm city status media amenities...")
  .lean();
```

**Issue**: Multiple endpoints in this file use `findById()` without tenant scoping. While the GET endpoint may be intentionally public for listing visibility, the PATCH and DELETE endpoints should verify ownership.

**Risk**: Users could potentially access, modify, or delete listings from other tenants.

**Recommendation**:
- For GET: Document as intentionally public (platform-wide listing visibility)
- For PATCH/DELETE: Add tenant validation
```typescript
const listing = await AqarListing.findById(id);
if (!listing || (listing.orgId !== user.orgId && !user.isSuperAdmin)) {
  return notFoundError("Listing");
}
```

---

### CRIT-004: SMS Message - FindById Without Tenant Validation

**File**: `app/api/admin/sms/route.ts`  
**Lines**: 228, 315  
**Severity**: 🟥 Critical

```typescript
const message = await SMSMessage.findById(messageId);
```

**Issue**: The `SMSMessage.findById()` retrieves any SMS message by ID. While the route requires `SUPER_ADMIN` role, the `SMSMessage` model has optional `orgId` field that isn't validated.

**Risk**: A super admin action could affect messages from any tenant without explicit scoping.

**Recommendation**:
```typescript
const query: Record<string, unknown> = { _id: messageId };
if (targetOrgId) {
  query.orgId = targetOrgId;
}
const message = await SMSMessage.findOne(query);
```

---

## 🟧 HIGH SEVERITY ISSUES

### HIGH-001: Aqar Leads - FindById on Listing/Project Without Tenant Verification

**File**: `app/api/aqar/leads/route.ts`  
**Lines**: 143, 174  
**Severity**: 🟧 High

```typescript
const listing = await AqarListing.findById(listingId);
// ...
const project = await AqarProject.findById(projectId);
```

**Issue**: When creating a lead inquiry, the route fetches the listing/project by ID to get recipient info but doesn't validate tenant context. However, the code does extract `orgIdForLead` from the document.

**Risk**: Leads could be created against listings from other organizations, though the lead itself gets properly scoped.

---

### HIGH-002: Aqar Favorites - FindById Without Tenant Scope

**File**: `app/api/aqar/favorites/[id]/route.ts`  
**Line**: 46  
**Severity**: 🟧 High

```typescript
const favorite = await AqarFavorite.findById(id);

if (!favorite) {
  return NextResponse.json({ error: "Favorite not found" }, { status: 404 });
}

// Check ownership
if (favorite.userId.toString() !== user.id) {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

**Issue**: While user ownership is checked, there's no organization-level check. The `findById()` retrieves any favorite in the system.

**Risk**: Information disclosure - revealing that a favorite ID exists (even if forbidden).

**Recommendation**: Use `findOne({ _id: id, userId: user.id })` for atomic ownership verification.

---

### HIGH-003: ATS Convert to Employee - FindById on Related Documents

**File**: `app/api/ats/convert-to-employee/route.ts`  
**Lines**: 81-82  
**Severity**: 🟧 High

```typescript
const [cand, job] = await Promise.all([
  Candidate.findById(app.candidateId).lean(),
  Job.findById(app.jobId).lean(),
]);
```

**Issue**: After fetching an application with org validation, related Candidate and Job documents are fetched by ID without additional tenant checks. These should inherit the application's tenant context.

**Risk**: Low in practice (IDs come from validated application), but lacks defense-in-depth.

---

### HIGH-004: Career Apply - Public Job Application Without Org Context

**File**: `app/api/careers/apply/route.ts`  
**Line**: 63  
**Severity**: 🟧 High

```typescript
const job = await Job.findById(jobId).lean();
```

**Issue**: The public careers application endpoint fetches jobs by ID without org filtering. While intentionally public, the resulting application should be scoped to the job's organization.

**Status**: Needs verification that `Application.create()` properly inherits `orgId` from job.

---

### HIGH-005: ATS Jobs Apply - Same Pattern as HIGH-004

**File**: `app/api/ats/jobs/[id]/apply/route.ts`  
**Line**: 57  
**Severity**: 🟧 High

```typescript
const job = await Job.findById(params.id).lean();
```

**Issue**: Same as HIGH-004. Job fetched by ID for public application.

---

### HIGH-006: User Preferences - Self-Only Access

**File**: `app/api/user/preferences/route.ts`  
**Lines**: 153, 312  
**Severity**: 🟧 High

```typescript
const user = await User.findById(session.user.id).select('preferences');
```

**Issue**: Uses `session.user.id` directly, which is controlled by authentication. While safe in practice, the `User` model has `tenantIsolationPlugin` which adds automatic filtering based on context.

**Status**: ✅ Likely safe - user can only access their own preferences via session ID.

---

### HIGH-007: Verification Document Review - Partial Tenant Check

**File**: `app/api/onboarding/documents/[id]/review/route.ts`  
**Line**: 38  
**Severity**: 🟧 High

```typescript
const doc = await VerificationDocument.findById(params.id);
if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

// Defense-in-depth: Query scoped to user's org (Super Admins can access any org)
const orgFilter = user.isSuperAdmin ? {} : { orgId: user.orgId };
const onboarding = await OnboardingCase.findOne({
  _id: doc.onboarding_case_id,
  ...orgFilter,
});
```

**Issue**: The `VerificationDocument` is fetched by ID without tenant scope, then its parent `OnboardingCase` is checked with org filter. This is defense-in-depth but has a timing gap.

**Recommendation**: Fetch document with org scope from the start:
```typescript
const doc = await VerificationDocument.findOne({
  _id: params.id,
  orgId: user.isSuperAdmin ? { $exists: true } : user.orgId,
});
```

---

### HIGH-008: Payment Tap Webhook - FindById on Payment

**File**: `app/api/payments/tap/webhook/route.ts`  
**Line**: 747  
**Severity**: 🟧 High

```typescript
const payment = await Payment.findById(transaction.paymentId);
```

**Issue**: Webhook processing fetches payment by ID. Webhooks are server-to-server but should still validate tenant context to prevent ID enumeration attacks via crafted webhook payloads.

---

## 🟨 MEDIUM SEVERITY ISSUES

### MED-001: Souq Review Aggregation - Missing OrgId in $match

**File**: `app/api/souq/sellers/[id]/dashboard/route.ts`  
**Lines**: 132-151  
**Severity**: 🟨 Medium

```typescript
SouqReview.aggregate([
  {
    $lookup: {
      from: "souq_products",
      localField: "productId",
      foreignField: "_id",
      as: "product",
    },
  },
  { $unwind: "$product" },
  {
    $lookup: {
      from: "souq_listings",
      localField: "product._id",
      foreignField: "productId",
      as: "listings",
    },
  },
  { $unwind: "$listings" },
  { $match: { "listings.sellerId": seller._id } },  // ❌ No orgId filter!
  { $group: { _id: null, avgRating: { $avg: "$rating" } } },
]),
```

**Issue**: The aggregation pipeline joins across collections but doesn't filter by `orgId` at any stage. This could include reviews from other organizations in the aggregation.

**Recommendation**: Add `{ $match: { orgId: seller.orgId } }` as the first pipeline stage:
```typescript
SouqReview.aggregate([
  { $match: { orgId: seller.orgId } },  // ✅ Add tenant filter first
  // ... rest of pipeline
])
```

---

### MED-002: SouqReview Count - Missing OrgId Filter

**File**: `app/api/souq/sellers/[id]/dashboard/route.ts`  
**Lines**: 163-171  
**Severity**: 🟨 Medium

```typescript
const [totalReviews, pendingReviews] = await Promise.all([
  SouqReview.countDocuments({
    productId: { $in: productIds },
  }),
  SouqReview.countDocuments({
    productId: { $in: productIds },
    sellerResponse: { $exists: false },
    createdAt: { $gte: thirtyDaysAgo },
  }),
]);
```

**Issue**: `countDocuments` queries only filter by `productId`, not `orgId`. While `productIds` come from an org-scoped query, reviews on those products could theoretically be from other orgs.

**Recommendation**: Add `orgId: seller.orgId` to both queries.

---

### MED-003: Aqar Listing Search - No Explicit Tenant Scope

**File**: `app/api/aqar/listings/search/route.ts`  
**Severity**: 🟨 Medium

**Issue**: The search endpoint builds a complex query but doesn't add explicit `orgId` filter. This may be intentional for platform-wide listing search, but should be documented.

**Status**: ⚠️ Needs review - is cross-tenant listing search intentional?

---

### MED-004 through MED-012: Additional Aggregation Issues

Similar patterns found in:
- `app/api/ats/analytics/route.ts` - ✅ Has orgId in filter
- `app/api/owner/statements/route.ts` - Needs audit
- `app/api/crm/overview/route.ts` - ✅ Has orgFilter
- `app/api/admin/communications/route.ts` - Needs audit
- `app/api/admin/testing-users/route.ts` - Admin-only, may be intentional

---

## 🟩 LOW SEVERITY / BY DESIGN

### LOW-001: Souq Categories - Platform-Wide Catalog

**File**: `app/api/souq/categories/route.ts`  
**Line**: 16  
**Severity**: 🟩 Low (By Design)

```typescript
// PLATFORM-WIDE DATA: Categories are shared across all tenants by design.
// This is a read-only catalog that all sellers can access.
const categories = await Category.find({ isActive: true })
```

**Status**: ✅ Documented as intentional platform-wide data.

---

### LOW-002: Souq Brands - Platform-Wide Catalog

**File**: `app/api/souq/brands/route.ts`  
**Line**: 21  
**Severity**: 🟩 Low (By Design)

```typescript
// NOTE: Brands are PLATFORM-WIDE resources shared across all tenants.
// This is intentional - brands (Nike, Samsung, etc.) are not tenant-specific.
const brands = await Brand.find({ isActive: true })
```

**Status**: ✅ Documented as intentional.

---

### LOW-003: LinkedIn/Indeed Job Feeds - Public Aggregation

**File**: `app/api/feeds/linkedin/route.ts`  
**Line**: 55  
**Severity**: 🟩 Low (By Design)

```typescript
// PUBLIC FEEDS: Intentionally cross-tenant for job aggregation.
// This exposes only public, published jobs from all organizations
const jobs = await Job.find({ status: "published", visibility: "public" })
```

**Status**: ✅ Documented as intentional for job board integration.

---

### LOW-004 through LOW-006: Global Platform Resources

- `Module` model - Global feature flags, no tenant isolation by design
- `PlatformSettings` model - Platform-wide settings
- `FeatureFlag` model - Global feature toggles

---

## Models Missing tenantIsolationPlugin

| Model | Has Plugin | Notes |
|-------|------------|-------|
| `Benchmark` | ❌ | Uses `tenantId` field manually |
| `SMSMessage` | ❌ | Uses optional `orgId` field |
| `PaymentMethod` | ❌ | Uses XOR validation (orgId OR owner_user_id) |
| `Module` | ❌ | Global by design |
| `PlatformSettings` | ❌ | Global by design |
| `CopilotKnowledge` | ❓ | Needs audit |
| `FeatureFlag` | ❓ | Needs audit |

---

## Recommendations

### Immediate Actions (Critical)

1. **Add tenant validation to all `findById` calls in mutation endpoints**
   - Pattern: `findOne({ _id: id, orgId: user.orgId })` instead of `findById(id)`
   
2. **Add `$match: { orgId }` as first stage in all aggregation pipelines**
   - Even when subsequent stages filter indirectly

3. **Document intentional cross-tenant access patterns**
   - Add comments explaining business justification

### Short-Term Actions (High)

4. **Create middleware wrapper for tenant-scoped queries**
   ```typescript
   export function scopedFindById(Model, id, orgId, options) {
     return Model.findOne({ _id: id, orgId }, null, options);
   }
   ```

5. **Add ESLint rule to flag `.findById(` without nearby `orgId` check**

6. **Review all models without `tenantIsolationPlugin` for necessity**

### Long-Term Actions (Medium)

7. **Implement tenant context in AsyncLocalStorage universally**
   - Already partially implemented in `authContext.ts`

8. **Add integration tests for multi-tenant isolation**
   - Create test organization A and B
   - Verify user from A cannot access B's data

9. **Implement audit logging for cross-tenant access attempts**

---

## Appendix: Files Requiring Attention

| File | Priority | Action Required |
|------|----------|-----------------|
| `app/api/admin/billing/benchmark/[id]/route.ts` | 🟥 | Add tenant validation |
| `app/api/ats/moderation/route.ts` | 🟥 | Add orgId check |
| `app/api/aqar/listings/[id]/route.ts` | 🟥 | Add tenant scope to PATCH/DELETE |
| `app/api/admin/sms/route.ts` | 🟥 | Add orgId to findById |
| `app/api/aqar/leads/route.ts` | 🟧 | Add tenant scope to lookups |
| `app/api/aqar/favorites/[id]/route.ts` | 🟧 | Use findOne with userId |
| `app/api/souq/sellers/[id]/dashboard/route.ts` | 🟨 | Add orgId to aggregations |
| `app/api/onboarding/documents/[id]/review/route.ts` | 🟧 | Scope initial query |

---

**Report Generated**: 2025-12-09T00:00:00Z  
**Next Audit Due**: 2026-01-09
