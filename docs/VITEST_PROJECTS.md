# Fixzit Test Configuration Matrix

> **AUDIT-2025-12-25:** Document created per improvement analysis recommendation to clarify test configuration split.

## Overview

Fixzit uses multiple Vitest configurations to optimize test execution across different environments:

| Configuration | Environment | Purpose | Command |
|--------------|-------------|---------|---------|
| `client` | jsdom | React components, hooks, client utilities | `pnpm vitest --project client run` |
| `server` | node | API routes, services, jobs, server utilities | `pnpm vitest --project server run` |
| `server-mocked` | node | Tests requiring mongoose mocks (isolated) | `pnpm vitest --project server-mocked run` |

## Project Split Rationale

### Client Project (`jsdom`)
- **Excludes:** node-only suites (services, jobs, debug, finance, returns, lib/server)
- **Includes:** React components, client hooks, UI utilities
- **Why separate:** jsdom doesn't support Node.js APIs like `fs`, `path`, or MongoDB drivers

### Server Project (`node`)
- **Includes:** API routes, services, jobs, debug utilities, finance, returns, lib
- **Excludes:** React component tests requiring DOM
- **Why separate:** Server code needs real Node.js environment for database connections

### Server-Mocked Project (`node`)
- **Purpose:** Tests that mock Mongoose to avoid database connections
- **Setup file:** `vitest.setup.minimal.ts` (no MongoDB connection)
- **Includes:** `models/*.model.test.ts`, `tests/api/**/*.mocked.test.ts`
- **Why separate:** Mongoose mock conflicts with real connection in same process

## Quick Commands

```bash
# Run all tests
pnpm vitest run

# Run specific project
pnpm vitest --project client run
pnpm vitest --project server run
pnpm vitest --project server-mocked run

# Watch mode (development)
pnpm vitest --project server

# Run with coverage
pnpm vitest run --coverage

# Run E2E tests (Playwright)
pnpm playwright test
```

## Test File Naming Conventions

| Pattern | Project | Description |
|---------|---------|-------------|
| `*.test.ts` | server | Standard unit/integration tests |
| `*.test.tsx` | client | React component tests |
| `*.mocked.test.ts` | server-mocked | Tests with Mongoose mocks |
| `*.spec.ts` | E2E (Playwright) | End-to-end tests |
| `*.smoke.spec.ts` | E2E (Playwright) | Smoke tests |
| `*.e2e.spec.ts` | E2E (Playwright) | Full E2E flows |

## CI/CD Integration

GitHub Actions runs tests in parallel:

```yaml
jobs:
  test:
    strategy:
      matrix:
        project: [client, server, server-mocked]
    steps:
      - run: pnpm vitest --project ${{ matrix.project }} run
```

## Adding New Tests

1. **API Route Tests:** Place in `tests/api/` → runs in `server` project
2. **Component Tests:** Place in `tests/components/` or co-locate with component → runs in `client` project
3. **Model Tests (mocked):** Place in `models/*.model.test.ts` → runs in `server-mocked` project
4. **E2E Tests:** Place in `tests/e2e/` → runs with Playwright

## Troubleshooting

### "Cannot find module 'mongoose'" in client tests
- Check if test file is importing server-only modules
- Move test to `server` project or mock the import

### "ReferenceError: document is not defined" in server tests
- Test is using DOM APIs in Node environment
- Move test to `client` project or mock the DOM

### Mongoose mock conflicts
- Tests using mongoose mocks should go in `server-mocked` project
- Use `vitest.setup.minimal.ts` for clean environment

---

*Last updated: 2025-12-25 by [AGENT-001-A]*
