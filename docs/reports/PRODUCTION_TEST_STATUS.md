# Production Test Suite - Current Status

**Last Updated**: $(date)

## ✅ Production-Ready Tests (REAL Systems)

### 1. Model Tests (Real MongoDB)

**Status**: 15/15 passing ✅  
**Framework**: Vitest + MongoDB Memory Server  
**Command**: `pnpm test:models`

**Test Files**:

- `tests/unit/models/Asset.test.ts` (9 tests)
- `tests/unit/models/HelpArticle.test.ts` (6 tests)

**What's Tested**:

- Schema validation with REAL MongoDB
- Model indexes
- Pre/post hooks
- Data persistence

### 2. E2E Tests (Real Browser + API)

**Status**: Ready to run  
**Framework**: Playwright  
**Command**: `pnpm test:e2e`

**Test Files**:

- `tests/e2e/database.spec.ts` - Database connectivity (8 tests)
  - Health check with real DB
  - Properties API with real MongoDB
  - Concurrent request handling
  - Multi-tenant data isolation
  - Malformed query handling
  - Performance requirements (<5s)
  - Connection recovery
  
- `tests/marketplace.smoke.spec.ts` - Critical user journey
  - Search → Product Detail → Add to Cart flow
  - Real browser interactions
  
- `tests/specs/smoke.spec.ts` - Core functionality
- `tests/specs/i18n.spec.ts` - Internationalization

**What's Tested**:

- Complete user workflows
- Real HTTP requests
- Real MongoDB queries
- Real browser rendering
- No mocking

## ❌ Legacy Tests (Mocked - To Be Removed)

### Mock-Based Unit Tests

**Status**: 369/502 passing ⚠️  
**Command**: `pnpm test:legacy` (renamed from test:api)  
**Issue**: Heavy mocking, doesn't test production behavior

**Files to Archive**:

- `tests/unit/api/**/*.test.ts` (API routes with mocked DB)
- `tests/unit/components/**/*.test.tsx` (React components with mocked context)
- Tests using `vi.mock()`, `vi.resetModules()`

## 📊 Test Coverage Goals

### Current Coverage

- **Model Tests**: 2 models (Asset, HelpArticle)
- **E2E Tests**: 4 test files
- **Total Production Tests**: ~23 tests

### Target Coverage (Next 30 days)

#### Phase 1: Expand Model Tests (Week 1-2)

- [ ] User model (authentication, authorization)
- [ ] WorkOrder model (status transitions, assignments)
- [ ] Property model (validation, queries)
- [ ] Payment model (transactions, calculations)
- [ ] Vendor model (relationships, ratings)
- [ ] Marketplace models (Product, Category, RFQ)
- **Target**: 60+ model tests

#### Phase 2: Core E2E Journeys (Week 2-3)

- [ ] User registration → Email verification → Login
- [ ] Create property → Upload images → Publish listing
- [ ] Create work order → Assign vendor → Mark complete
- [ ] Marketplace: Browse → Add to cart → Checkout
- [ ] Vendor portal: View jobs → Submit quote → Accept work
- [ ] Admin: User management, organization setup
- **Target**: 30+ E2E tests

#### Phase 3: Integration Tests (Week 3-4)

- [ ] API endpoint tests (Playwright request context)
- [ ] File upload/download flows
- [ ] Payment gateway integration
- [ ] Email/SMS notification triggers
- [ ] Report generation
- **Target**: 40+ integration tests

## 🚀 Running Production Tests

### Quick Commands

```bash
# Run ALL production tests (models + E2E)
pnpm test:production

# Run only model tests (fast, ~2s)
pnpm test:models

# Run only E2E tests (slower, real browser)
pnpm test:e2e

# Run with UI (for debugging)
pnpm test:ui

# Run specific test file
pnpm test:e2e tests/e2e/database.spec.ts
```

### CI/CD Integration

```bash
# Pre-commit hook
pnpm test:models

# Pull request gate
pnpm test:production

# Deployment gate
pnpm typecheck && pnpm lint && pnpm test:production
```

## 📈 Migration Progress

### Completed

- [x] Created production test strategy
- [x] Identified real vs mock tests
- [x] Renamed test:api to test:legacy
- [x] Created test:production command
- [x] Documented E2E test infrastructure

### Next Steps

1. **Remove mock tests** (or mark .skip)
2. **Expand model tests** for critical models
3. **Write E2E tests** for critical user journeys
4. **Set up CI/CD** to run production tests on every PR
5. **Archive/delete** mock-based tests

## 🎯 Success Criteria

A test is **production-ready** if:

- ✅ Uses real database (MongoDB Memory Server or test DB)
- ✅ Uses real HTTP requests (no mocked fetch)
- ✅ Tests observable behavior, not implementation details
- ✅ Can run in CI/CD pipeline
- ✅ Independent (no test order dependencies)
- ✅ Deterministic (same input = same output)
- ✅ Fast (<5s per test file)

## 🚫 What to Avoid

- ❌ Mock databases or models
- ❌ Mock HTTP responses
- ❌ Mock React components
- ❌ Test private methods
- ❌ Test implementation details
- ❌ Brittle selectors (use test-ids instead)

## 📝 Writing New Tests

### Model Test Template

```typescript
// tests/unit/models/YourModel.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectDB, disconnectDB } from './testSetup';
import { YourModel } from '@/models/YourModel';

describe('YourModel', () => {
  beforeAll(async () => await connectDB());
  afterAll(async () => await disconnectDB());

  it('should create model with valid data', async () => {
    const doc = await YourModel.create({ /* real data */ });
    expect(doc._id).toBeDefined();
  });
});
```

### E2E Test Template

```typescript
// tests/e2e/your-feature.spec.ts
import { test, expect } from '@playwright/test';

test('user can complete workflow', async ({ page }) => {
  await page.goto('/your-page');
  
  // Use test-ids for reliable selectors
  await page.getByTestId('action-button').click();
  
  // Assert on observable behavior
  await expect(page.getByTestId('success-message')).toBeVisible();
});
```

## 📚 Resources

- [Testing Strategy](./TESTING_STRATEGY.md)
- [Playwright Docs](https://playwright.dev)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)
- [Vitest Docs](https://vitest.dev)
