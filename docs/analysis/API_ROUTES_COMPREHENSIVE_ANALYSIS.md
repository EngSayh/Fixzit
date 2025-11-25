# API Routes Comprehensive Analysis & Fix Plan

**Analysis Date:** October 8, 2025  
**Current Branch:** `fix/consolidation-guardrails` (PR #84)  
**Current PR Score:** 60/100 (CodeRabbit Review)

---

## 📊 EXECUTIVE SUMMARY

### Findings

- **Total API Routes:** 218+ route files
- **Routes with Rate Limiting:** ~10 (4.6% coverage)
- **Routes with Standardized Error Handling:** ~2 (0.9% coverage)
- **Routes with OpenAPI Documentation:** 0 (0% coverage)
- **Routes with Zod Validation:** ~30 (13.8% coverage)

### Critical Issues

1. **❌ NO OpenAPI Documentation** - 0/218 routes documented
2. **❌ Inconsistent Error Handling** - Mix of 5+ different error patterns
3. **❌ Minimal Rate Limiting** - Only 4.6% of routes protected
4. **❌ No Security Headers** - Missing CORS, CSP, rate limiting on 95%+ routes
5. **❌ Mixed Input Validation** - Only 13.8% use Zod schemas

---

## 🔍 DETAILED ANALYSIS

### Routes WITH Proper Patterns (Examples to Follow)

#### ✅ Rate Limiting (10 routes)

```
✓ app/api/marketplace/checkout/route.ts
✓ app/api/marketplace/cart/route.ts
✓ app/api/finance/invoices/route.ts
✓ app/api/help/ask/route.ts
✓ app/api/kb/search/route.ts
✓ app/api/ats/public-post/route.ts
✓ app/api/contracts/route.ts
✓ app/api/billing/subscribe/route.ts
✓ app/api/admin/price-tiers/route.ts
✓ app/api/admin/discounts/route.ts
```

#### ✅ Standardized Error Handling (2 routes)

```
✓ app/api/contracts/route.ts (uses createErrorResponse)
✓ app/api/admin/price-tiers/route.ts (uses createErrorResponse)
```

#### ⚠️ Zod Validation (30 routes)

```
✓ app/api/marketplace/products/route.ts
✓ app/api/marketplace/rfq/route.ts
✓ app/api/marketplace/vendor/products/route.ts
✓ app/api/finance/invoices/route.ts
✓ app/api/help/articles/[id]/route.ts
✓ app/api/benchmarks/compare/route.ts
... and ~24 more
```

### Routes MISSING Critical Features (208 routes)

#### ❌ NO Rate Limiting (208 routes)

```
All routes except the 10 listed above need rate limiting
```

#### ❌ NO Standardized Errors (216 routes)

Most routes use inconsistent patterns:

- `NextResponse.json({ error: 'message' }, { status: 401 })` (most common)
- `NextResponse.json({ ok: false, error: 'message' })` (marketplace)
- `NextResponse.json({ success: false, error: 'message' })` (some routes)
- Raw error objects without status codes
- No correlation IDs for debugging

#### ❌ NO OpenAPI Documentation (218 routes)

Zero routes have JSDoc OpenAPI annotations

---

## 🛠️ STANDARDIZED PATTERNS (To Apply)

### Pattern 1: Error Handling (REQUIRED)

**Existing Utility:** `/workspaces/Fixzit/server/utils/errorResponses.ts`

```typescript
import {
  createErrorResponse,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  validationError,
  zodValidationError,
  rateLimitError,
  internalServerError,
  handleApiError,
} from "@/server/utils/errorResponses";
```

**Usage:**

```typescript
// Authentication
if (!user) return unauthorizedError();

// Authorization
if (user.role !== 'admin') return forbiddenError();

// Validation
if (error instanceof z.ZodError) {
  return zodValidationError(error, req);
}

// Rate limiting
if (!rl.allowed) return rateLimitError();

// Not found
if (!resource) return notFoundError('Invoice');

// Generic catch
catch (error) {
  return handleApiError(error);
}
```

### Pattern 2: Rate Limiting (REQUIRED)

**Existing Utility:** `/workspaces/Fixzit/server/security/rateLimit.ts`

```typescript
import { rateLimit } from "@/server/security/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);

    // Rate limiting (adjust limits per route sensitivity)
    const key = `route-name:${user.orgId}`;
    const rl = rateLimit(key, 20, 60_000); // 20 requests per minute
    if (!rl.allowed) return rateLimitError();

    // ... rest of handler
  } catch (error) {
    return handleApiError(error);
  }
}
```

**Recommended Limits:**

- Public endpoints: 10-20 req/min
- Authenticated read: 60 req/min
- Authenticated write: 20 req/min
- Admin endpoints: 100 req/min
- Payment/subscription: 3-10 req/5min
- Auth endpoints: 5 req/15min

### Pattern 3: OpenAPI Documentation (REQUIRED)

```typescript
/**
 * @openapi
 * /api/resources:
 *   post:
 *     summary: Create a new resource
 *     tags: [Resources]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Resource created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Resource'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 */
export async function POST(req: NextRequest) { ... }
```

### Pattern 4: Complete Route Template

```typescript
import { NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/server/middleware/withAuthRbac";
import { rateLimit } from "@/server/security/rateLimit";
import {
  unauthorizedError,
  forbiddenError,
  notFoundError,
  zodValidationError,
  rateLimitError,
  handleApiError,
} from "@/server/utils/errorResponses";
import { createSecureResponse } from "@/server/security/headers";

// Zod validation schema
const CreateResourceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  // ... other fields
});

/**
 * @openapi
 * /api/resources:
 *   post:
 *     summary: Create resource
 *     ... (full OpenAPI spec)
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const user = await getSessionUser(req);
    if (!user) return unauthorizedError();

    // 2. Authorization
    if (!["admin", "manager"].includes(user.role)) {
      return forbiddenError("Only admins and managers can create resources");
    }

    // 3. Rate Limiting
    const key = `create-resource:${user.orgId}`;
    const rl = rateLimit(key, 20, 60_000);
    if (!rl.allowed) return rateLimitError();

    // 4. Input Validation
    const body = await req.json();
    const payload = CreateResourceSchema.parse(body);

    // 5. Database Connection
    await connectToDatabase();

    // 6. Tenant Isolation
    const resource = await Resource.create({
      ...payload,
      orgId: user.orgId,
      createdBy: user.id,
    });

    // 7. Success Response with Security Headers
    return createSecureResponse({ ok: true, data: resource }, 201, req);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return zodValidationError(error, req);
    }
    return handleApiError(error);
  }
}

/**
 * @openapi
 * /api/resources:
 *   get:
 *     summary: List resources
 *     ... (full OpenAPI spec)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return unauthorizedError();

    const key = `list-resources:${user.orgId}`;
    const rl = rateLimit(key, 60, 60_000);
    if (!rl.allowed) return rateLimitError();

    await connectToDatabase();

    // Tenant isolation
    const resources = await Resource.find({ orgId: user.orgId })
      .sort({ createdAt: -1 })
      .limit(100);

    return createSecureResponse({ ok: true, data: resources }, 200, req);
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## 📋 IMPLEMENTATION PLAN

### Phase 1: Critical Routes (Priority P0) - 20 routes

**Estimated Time:** 8 hours

High-traffic routes that MUST have all patterns:

```
1. app/api/auth/login/route.ts
2. app/api/auth/signup/route.ts
3. app/api/auth/me/route.ts
4. app/api/payments/paytabs/callback/route.ts
5. app/api/payments/create/route.ts
6. app/api/marketplace/checkout/route.ts (enhance)
7. app/api/marketplace/products/route.ts
8. app/api/work-orders/route.ts
9. app/api/invoices/route.ts
10. app/api/properties/route.ts
11. app/api/projects/route.ts
12. app/api/vendors/route.ts
13. app/api/assets/route.ts
14. app/api/tenants/route.ts
15. app/api/subscribe/corporate/route.ts
16. app/api/subscribe/owner/route.ts
17. app/api/rfqs/route.ts
18. app/api/slas/route.ts
19. app/api/ats/jobs/route.ts
20. app/api/ats/applications/[id]/route.ts
```

### Phase 2: Authenticated Routes (Priority P1) - 100+ routes

**Estimated Time:** 15 hours

All authenticated CRUD endpoints for:

- Work orders (10 routes)
- Properties (5 routes)
- Projects (5 routes)
- Vendors (5 routes)
- Assets (5 routes)
- Invoices (5 routes)
- Contracts (3 routes)
- ATS (10 routes)
- Marketplace (15 routes)
- Support tickets (8 routes)
- Notifications (5 routes)
- ... and others

### Phase 3: Public/Lower-Priority Routes (Priority P2) - 98 routes

**Estimated Time:** 8 hours

Less critical but still need patterns:

- Health checks
- Public feeds
- CMS pages
- QA endpoints
- Help articles (public)

---

## 🚀 QUICK START: Fix Current Open File

The user's current file is `/workspaces/Fixzit/app/api/marketplace/rfq/route.ts`.

Let me create the corrected version with ALL patterns applied...
