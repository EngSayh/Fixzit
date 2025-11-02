# File Consolidation Plan

## Analysis Date: 2025-11-02
## Source: reports/duplicates.json

---

## ✅ Intentional Duplicates (No Action Required)

### Next.js App Router Patterns
- **`layout.tsx`** (6 instances) - ✅ **KEEP ALL** - Each route needs its own layout
- **`not-found.tsx`** (3 instances) - ✅ **KEEP ALL** - Route-specific 404 pages
- **`page.tsx`** (103 instances) - ✅ **KEEP ALL** - Next.js App Router pattern
- **`route.ts`** (148 instances) - ✅ **KEEP ALL** - API routes
- **`route.test.ts`** (5 instances) - ✅ **KEEP ALL** - Tests for specific routes

### Test Files
- **`mongodb-unified.ts`** - ✅ **KEEP BOTH** - Real impl + mock
  - `lib/mongodb-unified.ts` (real implementation)
  - `tests/mocks/mongodb-unified.ts` (test mock)

- **`http.ts`** - ✅ **KEEP BOTH** - Real impl + test utils
  - `lib/api/http.ts` (production HTTP client)
  - `tests/utils/http.ts` (test utilities)

- **`utils.test.ts`** - ✅ **KEEP BOTH** - Different test suites
  - `lib/utils.test.ts` (lib utils tests)
  - `tests/utils.test.ts` (general utils tests)

- **`page.test.tsx`** (3 instances) - ✅ **KEEP ALL** - Tests for specific pages

### Configuration Files
- **`playwright.config.ts`** (3 instances) - ✅ **KEEP ALL** - Different test contexts
  - `playwright.config.ts` (root config)
  - `qa/playwright.config.ts` (QA-specific config)
  - `tests/playwright.config.ts` (test-specific config)

### Module-Specific Files
- **`index.ts`** (4 instances) - ✅ **KEEP ALL** - Different module exports
  - `types/index.ts` (type definitions)
  - `lib/db/index.ts` (database exports)
  - `lib/models/index.ts` (model exports)
  - `models/aqar/index.ts` (aqar model exports)

- **`schema.ts`** (2 instances) - ✅ **KEEP BOTH** - Different schemas
  - `modules/organizations/schema.ts`
  - `modules/users/schema.ts`

- **`service.ts`** (2 instances) - ✅ **KEEP BOTH** - Different services
  - `modules/organizations/service.ts`
  - `modules/users/service.ts`

- **`validator.ts`** (2 instances) - ✅ **KEEP BOTH** - Different validators
  - `modules/organizations/validator.ts`
  - `modules/users/validator.ts`

### Model Duplicates (Domain-Specific)
- **`Payment.ts`** (2 instances) - ✅ **KEEP BOTH** - Different domains
  - `models/aqar/Payment.ts` (real estate payments)
  - `server/models/finance/Payment.ts` (financial payments)

- **`Project.ts`** (2 instances) - ✅ **KEEP BOTH** - Different domains
  - `models/aqar/Project.ts` (real estate projects)
  - `server/models/Project.ts` (general projects)

- **`Employee.ts`** (2 instances) - ✅ **KEEP BOTH** - Different contexts
  - `models/hr/Employee.ts` (HR context)
  - `server/models/Employee.ts` (server context)

- **`RFQ.ts`** (2 instances) - ✅ **KEEP BOTH** - Different locations
  - `server/models/RFQ.ts` (general RFQ)
  - `server/models/marketplace/RFQ.ts` (marketplace RFQ)

### Public Assets
- **`app.js`** (2 instances) - ⚠️ **REVIEW NEEDED**
  - `public/app.js`
  - `public/assets/js/app.js`
  - **Action**: Check if one is symlink/duplicate content

---

## 🔧 Action Required (TRUE Duplicates)

### 1. ErrorBoundary Components
**Status**: DUPLICATE - Consolidate to single source

**Files**:
- `components/ErrorBoundary.tsx` (167 lines) - **✅ PRIMARY** (comprehensive, translated, theme-aware)
- `qa/ErrorBoundary.tsx` (17 lines) - **❌ MINIMAL** (testing stub)

**Usage**:
- `providers/Providers.tsx` imports from `@/components/ErrorBoundary`
- `providers/QAProvider.tsx` imports from `@/qa/ErrorBoundary`

**Action**:
✅ **KEEP** `components/ErrorBoundary.tsx` (comprehensive)
❌ **REMOVE** `qa/ErrorBoundary.tsx` (minimal testing stub)
🔄 **UPDATE** `providers/QAProvider.tsx` to import from `@/components/ErrorBoundary`

### 2. Auth Files
**Status**: DIFFERENT PURPOSES - Keep all

**Files**:
- `auth.ts` (root) - NextAuth initialization
- `lib/auth.ts` - Auth utilities
- `tests/fixtures/auth.ts` - Test fixtures

**Action**: ✅ **NO CHANGE** - All serve different purposes

### 3. Middleware Files
**Status**: DIFFERENT PURPOSES - Keep all

**Files**:
- `middleware.ts` (root) - Next.js middleware (auth/routing)
- `lib/audit/middleware.ts` - Audit logging middleware

**Action**: ✅ **NO CHANGE** - Different middleware types

### 4. Language Options
**Status**: DUPLICATE - Consolidate

**Files**:
- `config/language-options.ts` (⚠️ check size)
- `data/language-options.ts` (⚠️ check size)

**Action**:
🔍 **INVESTIGATE** - Determine which is canonical
🔄 **CONSOLIDATE** to single location (prefer `config/`)

### 5. MongoDB Init Scripts
**Status**: DUPLICATE - Different contexts

**Files**:
- `deployment/mongo-init.js` - Production deployment init
- `scripts/mongo-init.js` - Development/local init

**Action**:
✅ **KEEP BOTH** - Different deployment contexts
📝 **DOCUMENT** difference in README

### 6. Search Implementations
**Status**: DIFFERENT DOMAINS - Keep both

**Files**:
- `kb/search.ts` - Knowledge base search
- `lib/marketplace/search.ts` - Marketplace search

**Action**: ✅ **NO CHANGE** - Different search domains

### 7. PayTabs Integration
**Status**: DUPLICATE - Consolidate

**Files**:
- `lib/paytabs.ts` (⚠️ check size)
- `services/paytabs.ts` (⚠️ check size)

**Action**:
🔍 **INVESTIGATE** - Determine canonical location
🔄 **CONSOLIDATE** to `lib/paytabs.ts` (prefer lib for shared code)

### 8. Pricing Logic
**Status**: DUPLICATE - Consolidate

**Files**:
- `lib/pricing.ts` (⚠️ check size)
- `services/pricing.ts` (⚠️ check size)

**Action**:
🔍 **INVESTIGATE** - Determine canonical location
🔄 **CONSOLIDATE** to `lib/pricing.ts`

### 9. Rate Limiting
**Status**: ✅ ALREADY CONSOLIDATED - Verify imports

**Files**:
- `lib/rateLimit.ts` (121 lines) - ❌ OLD LOCATION
- `server/security/rateLimit.ts` (16 lines) - ✅ NEW CANONICAL

**Usage**: All imports use `@/server/security/rateLimit`

**Action**:
✅ **KEEP** `server/security/rateLimit.ts` (active)
⚠️ **CHECK** `lib/rateLimit.ts` for any unique code before deletion
❌ **REMOVE** `lib/rateLimit.ts` if no unique code

### 10. RBAC Implementation
**Status**: DUPLICATE - Different purposes

**Files**:
- `lib/rbac.ts` (25 lines) - ⚠️ check content
- `utils/rbac.ts` (41 lines) - ⚠️ check content

**Action**:
🔍 **INVESTIGATE** - Check if one re-exports the other
🔄 **CONSOLIDATE** if duplicate, or document differences

---

## 📊 Summary

**Total Duplicates Found**: 29 basename groups

**Breakdown**:
- ✅ **Intentional (No Action)**: 24 groups (Next.js patterns, tests, domain-specific)
- 🔧 **Action Required**: 5 groups (ErrorBoundary, language-options, paytabs, pricing, rbac)
- ⚠️ **Review Needed**: 3 groups (rateLimit verification, public/app.js, consolidation checks)

---

## 🎯 Immediate Actions

### Phase 1: ErrorBoundary Consolidation (HIGH PRIORITY)
```bash
# Remove minimal QA ErrorBoundary
rm qa/ErrorBoundary.tsx

# Update QA Provider import
sed -i "s|from '@/qa/ErrorBoundary'|from '@/components/ErrorBoundary'|g" providers/QAProvider.tsx
```

### Phase 2: Investigation (MEDIUM PRIORITY)
```bash
# Compare file sizes and content
wc -l config/language-options.ts data/language-options.ts
diff config/language-options.ts data/language-options.ts

wc -l lib/paytabs.ts services/paytabs.ts
diff lib/paytabs.ts services/paytabs.ts

wc -l lib/pricing.ts services/pricing.ts
diff lib/pricing.ts services/pricing.ts

wc -l lib/rbac.ts utils/rbac.ts
diff lib/rbac.ts utils/rbac.ts
```

### Phase 3: Consolidation (AFTER INVESTIGATION)
Based on investigation results, consolidate duplicates and update all imports.

---

## ✅ Verification Commands

```bash
# After consolidation, verify no broken imports
pnpm typecheck

# Verify no broken references
pnpm lint

# Test build
pnpm build

# Run tests
pnpm test
```
