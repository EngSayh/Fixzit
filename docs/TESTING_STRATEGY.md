# Testing Strategy - Production-Ready System

## Philosophy

**We test PRODUCTION code, not mocks.** Tests should validate real system behavior with real databases, real APIs, and real components.

## Test Types

### 1. Model Tests (Unit - Real Database)

**Purpose**: Test data models with real MongoDB  
**Framework**: Vitest + MongoDB Memory Server  
**Command**: `pnpm test:models`  
**Location**: `tests/unit/models/`

**What we test**:

- Schema validation
- Model methods and statics
- Database indexes
- Pre/post hooks
- Data integrity

**Current Status**: ✅ 15/15 passing

**Example**:

```typescript
// Uses REAL MongoDB Memory Server
describe("Asset Model", () => {
  it("should create asset with valid data", async () => {
    const asset = await Asset.create({
      name: "Test Asset",
      type: "equipment",
      orgId: "test-org",
    });
    expect(asset._id).toBeDefined();
  });
});
```

### 2. E2E Tests (Integration - Real System)

**Purpose**: Test complete user workflows with real browser  
**Framework**: Playwright  
**Command**: `pnpm test:e2e`  
**Location**: `tests/e2e/`, `tests/specs/`

**What we test**:

- Complete user journeys
- Page navigation
- Form submissions
- API integration
- Authentication flows
- Cross-module interactions

**Example**:

```typescript
test("user can create work order", async ({ page }) => {
  await page.goto("/fm/work-orders");
  await page.click('button:has-text("New Work Order")');
  await page.fill('[name="title"]', "Fix AC Unit");
  await page.click('button:has-text("Submit")');
  await expect(page.locator(".success-message")).toBeVisible();
});
```

### 3. API Tests (Integration - Real Routes)

**Purpose**: Test API endpoints with real request/response  
**Framework**: Playwright API Testing  
**Command**: `pnpm test:api:integration`  
**Location**: `tests/api/`

**What we test**:

- HTTP status codes
- Request validation
- Response format
- Error handling
- Authentication/authorization

**Example**:

```typescript
test("GET /api/health returns 200", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.status).toBe("healthy");
});
```

## What We DON'T Test

### ❌ Mock-Based Unit Tests

- Tests with `vi.mock()`, `jest.mock()`
- Tests with fake database responses
- Tests with mocked external services
- **Why**: They test implementation details, not real behavior

### ❌ Isolated Component Tests (with mocks)

- React component tests with mocked props
- Component tests with mocked context
- **Why**: Components should be tested in real context via E2E

### ❌ Tests with `vi.resetModules()`

- Tests that clear and reload modules
- Tests with complex mock timing dependencies
- **Why**: Fragile, hard to maintain, don't reflect production

## Migration Plan

### Phase 1: Identify Production-Ready Tests ✅

- [x] Model tests with MongoDB Memory Server (15 tests)
- [x] E2E smoke tests
- [x] Health check integration tests

### Phase 2: Remove Mock-Based Tests

- [ ] Archive or delete tests in `tests/unit/components/` with heavy mocking
- [ ] Remove API route tests that mock database
- [ ] Remove tests that mock Next.js internals

### Phase 3: Expand Production Testing

- [ ] Add more model tests for all models
- [ ] Create E2E tests for critical user journeys
- [ ] Add API integration tests using Playwright request context

### Phase 4: Continuous Integration

- [ ] Run model tests on every commit
- [ ] Run E2E tests on every PR
- [ ] Performance benchmarks on staging

## Test Commands

```bash
# Real database model tests
pnpm test:models

# E2E tests with real browser
pnpm test:e2e

# Smoke tests (critical paths)
pnpm test:smoke

# Full production test suite
pnpm test:production
```

## Vitest Configuration & Mock Patterns

### Pool Configuration (IMPORTANT)

Server tests **MUST** use `pool: "forks"` with `isolate: true` to prevent mock contamination between test files.

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    projects: [
      {
        name: 'server',
        pool: 'forks',      // Use process isolation
        poolOptions: {
          forks: {
            isolate: true,  // Each file in its own process
          },
        },
      },
    ],
  },
});
```

**Why?** Using `pool: "threads"` causes mock state to be shared between test files because they run in the same process. This leads to flaky tests where mocks from one file affect other files.

### Module-Scoped Mock Pattern (REQUIRED)

When using `vi.mock()`, always use the module-scoped variable pattern:

```typescript
// ✅ CORRECT: Module-scoped mock variable
const mockResolveContext = vi.fn();

vi.mock("@/lib/marketplace/context", () => ({
  resolveMarketplaceContext: (...args: unknown[]) => mockResolveContext(...args),
}));

beforeEach(() => {
  mockResolveContext.mockClear();
  mockResolveContext.mockResolvedValue({ success: true });
});

it("should handle error case", () => {
  mockResolveContext.mockResolvedValue({ success: false });
  // Test error handling
});
```

```typescript
// ❌ WRONG: Mock defined inside vi.mock callback (can't be referenced/reset)
vi.mock("@/lib/marketplace/context", () => ({
  resolveMarketplaceContext: vi.fn().mockResolvedValue({ success: true }),
}));
// Can't easily override this mock in individual tests!
```

### Middleware Execution Order

When testing API routes, understand the middleware order:

```text
Request → Rate Limit → Auth → RBAC → Handler → Response
```

**Implications for testing:**
- Rate limit tests need a valid session to reach rate limiting (otherwise auth returns 401 first)
- RBAC tests need to mock the role check, not just set the session role
- Handler tests should mock all preceding middleware

```typescript
// Rate limit test - needs valid session
it("returns 429 when rate limited", async () => {
  sessionUser = { orgId: "org_123", role: "ADMIN" }; // Valid session
  vi.mocked(enforceRateLimit).mockReturnValue(
    new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429 })
  );
  
  const response = await route.GET(req);
  expect(response.status).toBe(429);
});

// RBAC test - must mock the role check function
it("returns 403 when user lacks required role", async () => {
  sessionUser = { orgId: "org_123", role: "EMPLOYEE" };
  vi.mocked(hasAllowedRole).mockReturnValue(false); // Override the mock!
  
  const response = await route.GET(req);
  expect(response.status).toBe(403);
});
```

### Test Comment Guidelines

**Avoid** using `@vitest-environment` prefix in regular comments as it can be parsed as a directive:

```typescript
// ❌ WRONG: Can be parsed as directive
// @vitest-environment required for this test

// ✅ CORRECT: Safe comment wording  
// vitest-environment directive needed for this test
```

## Quality Standards

### ✅ Production-Ready Test Checklist

- [ ] Uses real database (MongoDB Memory Server or test DB)
- [ ] Uses real HTTP requests (not mocked fetch)
- [ ] Tests observable behavior, not implementation
- [ ] Can run in CI/CD pipeline
- [ ] Independent (doesn't depend on other tests)
- [ ] Deterministic (same input = same output)
- [ ] Fast enough (<5s per test file)

### ❌ Avoid

- Mock databases or models
- Mock HTTP responses
- Mock React components
- Testing private methods
- Testing implementation details
- Brittle selectors (test-ids preferred)

## Current Status

**Production-Ready Tests**: 15 (Model tests)  
**Mock-Based Tests to Remove**: ~450  
**Target**: 100+ production-ready tests covering critical paths

## Next Steps

1. **Immediate**: Skip/remove all mock-based tests
2. **Short-term**: Expand model test coverage
3. **Medium-term**: Build E2E test suite for critical journeys
4. **Long-term**: Replace all testing with production-ready approach
