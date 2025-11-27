# CodeRabbit Issues Action Plan

> **Generated:** November 27, 2025  
> **Based on:** 43,035 comments across PRs #1–#354  
> **Scope:** System-wide audit across all 12 categories

---

## 📊 Executive Summary

| Category | Comments | PRs | Priority | Effort |
|----------|----------|-----|----------|--------|
| Docs/Process | 6,688 | 330 | 🟡 Medium | High |
| Error/Logging/Monitoring | 5,011 | 297 | 🔴 High | Medium |
| Testing/QA | 4,574 | 330 | 🔴 High | High |
| Data/Schema/DB | 4,055 | 279 | 🔴 High | Medium |
| Infra/Deploy | 3,989 | 330 | 🔴 High | High |
| Security/RBAC/Auth | 3,970 | 282 | 🔴 Critical | Medium |
| Business Logic/Validation | 3,858 | 274 | 🔴 High | High |
| UI/UX/Accessibility | 3,846 | 330 | 🟡 Medium | Medium |
| CI/CD & Automation | 2,775 | 276 | 🟡 Medium | Medium |
| i18n/RTL | 1,832 | 264 | 🟡 Medium | Medium |
| Performance | 1,513 | 263 | 🟡 Medium | Medium |
| Meta/Other | 924 | 247 | 🟢 Low | Low |

---

## 🔴 PHASE 1: CRITICAL (Week 1-2)

### 1. Security/RBAC/Auth — 3,970 comments

#### Issues Found:
- ❌ **Missing CSRF protection** in all state-changing endpoints
- ❌ **Hardcoded demo passwords** in `app/api/auth/otp/send/route.ts:126`
- ⚠️ **OTP code exposed in dev mode** responses (`lib/sms.ts:618`)
- ⚠️ **Inconsistent role checking** (some use role checks, some use permission checks)

#### Action Items:

| Task | File(s) | Priority | Assignee |
|------|---------|----------|----------|
| Implement CSRF token validation | `middleware.ts`, API routes | P0 | - |
| Remove/disable demo password bypass in production | `app/api/auth/otp/send/route.ts` | P0 | - |
| Remove OTP from dev response or guard with strict env check | `lib/sms.ts:618` | P1 | - |
| Standardize RBAC to permission-based checks | All API routes | P1 | - |
| Add per-user rate limiting for sensitive operations | `lib/rate-limit.ts` | P2 | - |

```typescript
// EXAMPLE FIX: CSRF Token Middleware
// middleware.ts
export function csrfProtection(request: NextRequest) {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
    const csrfToken = request.headers.get('X-CSRF-Token');
    const sessionCsrf = request.cookies.get('csrf-token')?.value;
    if (!csrfToken || csrfToken !== sessionCsrf) {
      return new Response('Invalid CSRF token', { status: 403 });
    }
  }
}
```

---

### 2. Business Logic/Validation — 3,858 comments

#### Critical Race Conditions:
- 🔴 **Double-processing refunds** - `services/souq/returns-service.ts` uses both BullMQ queue AND in-process timers
- 🔴 **Inventory double-reservation** - `services/souq/cart-service.ts` reads then writes without atomic operation
- 🔴 **Concurrent approval overwrites** - `lib/finance/approval-workflow.ts` modifies workflow in-memory

#### Missing Validations:
- `services/souq/auto-repricer-service.ts` - No `basePrice` validation
- `services/souq/cart-service.ts` - No `quantity` validation for negative values
- `lib/finance/expense.service.ts` - Negative amounts bypass approval policies

#### Action Items:

| Task | File(s) | Priority | Assignee |
|------|---------|----------|----------|
| Add MongoDB atomic operations for inventory | `services/souq/cart-service.ts` | P0 | - |
| Remove in-process retry or add distributed lock | `services/souq/returns-service.ts` | P0 | - |
| Add TLV field length validation per ZATCA spec | `lib/zatca.ts` | P0 | - |
| Validate `basePrice` in auto-repricer | `services/souq/auto-repricer-service.ts` | P1 | - |
| Add negative amount validation | `lib/finance/expense.service.ts` | P1 | - |

```typescript
// EXAMPLE FIX: Atomic Inventory Reservation
// services/souq/cart-service.ts
await db.collection('inventory').findOneAndUpdate(
  { productId, quantity: { $gte: requestedQty } },
  { $inc: { quantity: -requestedQty, reserved: requestedQty } },
  { returnDocument: 'after' }
);
```

---

### 3. Data/Schema/DB — 4,055 comments

#### Missing Schema Validation:
- 15+ API routes accept request bodies without Zod validation
- Files affected: `app/api/souq/claims/**`, `app/api/finance/**`, `app/api/vendors/**`

#### ObjectId Validation Inconsistencies:
- Some files use `ObjectId.isValid()`, others use try/catch
- Mixed `org_id` vs `orgId` naming across codebase

#### Action Items:

| Task | File(s) | Priority | Assignee |
|------|---------|----------|----------|
| Add Zod schemas to Souq claims API | `app/api/souq/claims/**/*.ts` | P0 | - |
| Create centralized ObjectId validation utility | `lib/utils/objectid.ts` | P1 | - |
| Standardize `org_id`/`orgId` naming | Codebase-wide | P2 | - |
| Add missing indexes for `communication_logs` | `db/indexes.ts` | P1 | - |

```typescript
// EXAMPLE: Centralized ObjectId Validator
// lib/utils/objectid.ts
import { ObjectId } from 'mongodb';

export function parseObjectId(id: string | undefined, fieldName = 'id'): ObjectId {
  if (!id || !ObjectId.isValid(id)) {
    throw new ValidationError(`Invalid ${fieldName}: must be a valid ObjectId`);
  }
  return new ObjectId(id);
}
```

---

### 4. Infra/Deploy — 3,989 comments

#### Critical Issues:
- ❌ **Root Dockerfile missing HEALTHCHECK**
- ❌ **docker-compose.yml references non-existent path** `./deployment/docker/Dockerfile`
- ❌ **vercel.json disables frozen lockfile** (`--frozen-lockfile=false`)
- ❌ **Production source maps enabled** (`productionBrowserSourceMaps: true`)

#### Action Items:

| Task | File(s) | Priority | Assignee |
|------|---------|----------|----------|
| Add HEALTHCHECK to root Dockerfile | `Dockerfile` | P0 | - |
| Fix Dockerfile path in docker-compose | `docker-compose.yml` | P0 | - |
| Enable frozen lockfile in Vercel | `vercel.json` | P1 | - |
| Disable production source maps | `next.config.js` | P1 | - |
| Add comprehensive env validation at startup | `lib/env.ts` | P1 | - |

```dockerfile
# EXAMPLE: Dockerfile HEALTHCHECK
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1
```

---

## 🟠 PHASE 2: HIGH PRIORITY (Week 3-4)

### 5. Error/Logging/Monitoring — 5,011 comments

#### Issues Found:
- ⚠️ **Generic error messages** without error codes in 15+ service files
- ⚠️ **Missing error handling** in `components/NotificationCenter.tsx:30-46`
- ⚠️ **Direct console usage** instead of structured logger in some files
- ⚠️ **Empty catch blocks** returning null silently in `lib/auth.ts:78-85`

#### Action Items:

| Task | File(s) | Priority | Assignee |
|------|---------|----------|----------|
| Add error codes to service layer errors | `services/souq/reviews-service.ts`, `services/souq/claims/claim-service.ts` | P1 | - |
| Add try/catch with proper logging to NotificationCenter | `components/NotificationCenter.tsx` | P1 | - |
| Replace console.* with structured logger | `lib/sms.ts:282,299` | P2 | - |
| Create domain-specific error classes | `lib/errors/` | P2 | - |

```typescript
// EXAMPLE: Standardized Error with Code
export class ClaimError extends AppError {
  constructor(code: string, message: string, details?: unknown) {
    super(`CLAIM_${code}`, message, details);
  }
}

// Usage
throw new ClaimError('NOT_FOUND', 'Claim not found', { claimId });
```

---

### 6. Testing/QA — 4,574 comments

#### Critical Missing Tests:
| File | Type | Coverage |
|------|------|----------|
| `services/souq/**/*.ts` | Business Logic | ~10% (only returns-service.ts tested) |
| `services/aqar/**/*.ts` | Business Logic | 0% |
| `services/notifications/**/*.ts` | Integration | 0% |
| `lib/auth.ts` | Security | 0% |
| `lib/edge-auth-middleware.ts` | Security | 0% |

#### Skipped Tests: ~38 total
- `tests/e2e/work-orders.spec.ts` - 6 skipped (auth required)
- `tests/e2e/referrals.spec.ts` - 10 skipped (auth required)

#### Action Items:

| Task | File(s) | Priority | Assignee |
|------|---------|----------|----------|
| Add tests for Souq services | `services/souq/**/*.ts` | P1 | - |
| Add tests for auth functions | `lib/auth.ts` | P1 | - |
| Un-skip E2E tests with auth fixtures | `tests/e2e/*.spec.ts` | P2 | - |
| Add E2E tests for payment flow | `tests/e2e/payments.spec.ts` | P2 | - |
| Set up coverage threshold enforcement | `vitest.config.ts` | P2 | - |

---

### 7. CI/CD & Automation — 2,775 comments

#### Issues Found:
- ❌ **test-runner.yml is a stub** - only runs `echo "Testing runner assignment"`
- ❌ **No deployment workflow** for automated deployments
- ❌ **No Prettier configuration** or formatting check
- ❌ **No coverage reporting** to PR comments

#### Action Items:

| Task | File(s) | Priority | Assignee |
|------|---------|----------|----------|
| Fix test-runner.yml to actually run tests | `.github/workflows/test-runner.yml` | P0 | - |
| Add Vercel deployment workflow | `.github/workflows/deploy.yml` | P1 | - |
| Add Prettier config and format check | `.prettierrc`, `package.json` | P2 | - |
| Add Codecov/Coveralls integration | `.github/workflows/quality.yml` | P2 | - |

```yaml
# EXAMPLE: Fixed test-runner.yml
name: Test Runner
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:ci
```

---

## 🟡 PHASE 3: MEDIUM PRIORITY (Week 5-6)

### 8. Docs/Process — 6,688 comments

#### Missing Documentation:
- **~225+ functions** missing JSDoc (90% of exports)
- **15 directories** missing README files
- **48+ API routes** missing OpenAPI specs

#### Key Directories Needing READMEs:
- `lib/` - Core utilities
- `services/` - Business services
- `domain/` - Domain logic
- `app/api/` - API routes

#### Action Items:

| Task | Priority | Estimated Effort |
|------|----------|------------------|
| Add READMEs to `lib/`, `services/`, `domain/` | P2 | 4 hours |
| Add JSDoc to auth functions | P2 | 2 hours |
| Expand OpenAPI specs for FM, Billing, HR APIs | P3 | 8 hours |
| Set up automated JSDoc enforcement in ESLint | P3 | 1 hour |

---

### 9. UI/UX/Accessibility — 3,846 comments

#### Issues Found:
- **10+ buttons** missing `aria-label` across multiple components
- **Form inputs** in `ViewingScheduler.tsx` lack associated labels
- **Missing loading skeletons** in `property-details`, `reports` pages
- **Missing error states** in several app pages

#### Action Items:

| Task | File(s) | Priority | Assignee |
|------|---------|----------|----------|
| Add aria-labels to interactive buttons | `NotificationCenter.tsx`, `DashboardHero.tsx`, `HeroSection.tsx` | P2 | - |
| Add form labels/aria to ViewingScheduler | `components/aqar/ViewingScheduler.tsx` | P2 | - |
| Add loading skeletons to list pages | `app/fm/properties/**`, `app/fm/reports/**` | P3 | - |
| Verify color contrast meets WCAG | `globals.css`, component styles | P3 | - |

---

### 10. i18n/RTL — 1,832 comments

#### Issues Found:
- **~50+ hardcoded strings** need translation keys
- **~15 instances** of date/number formatting not locale-aware
- **~5-10 instances** of RTL-incompatible CSS (`ml-`, `mr-` instead of `ms-`, `me-`)
- **~10 aria-labels** not translated

#### Action Items:

| Task | File(s) | Priority | Assignee |
|------|---------|----------|----------|
| Replace hardcoded strings in ViewingScheduler | `components/aqar/ViewingScheduler.tsx` | P2 | - |
| Fix date formatting to use current locale | `lib/utils/format-utils.ts`, components | P2 | - |
| Convert `ml-`/`mr-` to `ms-`/`me-` | Various components | P3 | - |
| Add translations for aria-labels | i18n/*.json files | P3 | - |

```typescript
// EXAMPLE: Locale-aware date formatting
const formatted = new Intl.DateTimeFormat(locale, {
  dateStyle: 'medium',
  timeStyle: 'short'
}).format(date);
```

---

### 11. Performance — 1,513 comments

#### High Priority Issues:
- **N+1 Queries** in 6 files (buybox-service, cart-service, etc.)
- **Missing pagination** in 6 API endpoints
- **Unbounded data fetching** in multiple services

#### Action Items:

| Task | File(s) | Priority | Assignee |
|------|---------|----------|----------|
| Add pagination to admin users endpoint | `app/api/admin/users/route.ts` | P1 | - |
| Batch operations in buybox-service | `services/souq/buybox-service.ts` | P2 | - |
| Add limits to inventory queries | `services/souq/inventory-service.ts` | P2 | - |
| Dynamic imports for recharts | Chart components | P3 | - |

```typescript
// EXAMPLE: Pagination fix
const users = await db.collection('users')
  .find(filter)
  .skip((page - 1) * limit)
  .limit(limit)
  .toArray();
```

---

## 🟢 PHASE 4: LOW PRIORITY (Week 7+)

### 12. Meta/Other — 924 comments

- Code style consistency
- Comment cleanup
- Deprecated code removal
- Technical debt documentation

---

## 📅 Implementation Timeline

```
Week 1-2: PHASE 1 - Critical Security & Business Logic
├── Security/RBAC/Auth fixes
├── Race condition fixes
├── Critical validation gaps
└── Infrastructure critical issues

Week 3-4: PHASE 2 - High Priority
├── Error handling improvements
├── Test coverage expansion
├── CI/CD fixes
└── Schema validation

Week 5-6: PHASE 3 - Medium Priority
├── Documentation
├── Accessibility
├── i18n/RTL
└── Performance

Week 7+: PHASE 4 - Low Priority
└── Technical debt cleanup
```

---

## 📈 Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Security vulnerabilities | ~5 critical | 0 critical |
| Test coverage | ~15% | 60% |
| API routes with schema validation | ~40% | 95% |
| Functions with JSDoc | ~10% | 50% |
| Accessibility compliance | Unknown | WCAG 2.1 AA |
| i18n coverage | ~80% | 95% |

---

## 🔗 Related Documents

- [CODERABBIT_FIXES_SUMMARY.md](./CODERABBIT_FIXES_SUMMARY.md) - Detailed analysis
- [CRITICAL_TECHNICAL_DEBT_AUDIT.md](../CRITICAL_TECHNICAL_DEBT_AUDIT.md) - Technical debt
- [SYSTEM_AUDIT_FINDINGS.md](../SYSTEM_AUDIT_FINDINGS.md) - System audit

---

*This action plan should be reviewed weekly and updated based on progress.*
