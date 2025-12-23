# GitHub Actions Workflows

This directory contains GitHub Actions workflow configurations for CI/CD.

## Available Workflows

### Core CI

- **ci-fast-lane.yml** - Quick PR checks (lint, typecheck)
- **ci-full-suite.yml** - Complete test suite
- **ci-sharded.yml** - Sharded test execution for faster runs

### Other

- **build-sourcemaps.yml** - Sentry sourcemap upload
- **renovate.yml** - Dependency updates
- **pr_agent.yml** - AI-powered PR review

## CI Optimization Tips

### Test Sharding

Run tests in shards for faster CI:

```bash
# Local execution
./scripts/test-sharded.sh

# Or via pnpm
pnpm test:ci:sharded
```

This runs server and client projects sequentially, which:
- Reduces memory pressure (single project at a time)
- Provides clearer failure isolation
- Typically completes in 60-70% of full suite time

### MongoMemoryServer Caching

MongoMemoryServer downloads MongoDB binaries on first run. To cache:

```yaml
# In your workflow
- name: Cache MongoDB Memory Server
  uses: actions/cache@v4
  with:
    path: ~/.cache/mongodb-binaries
    key: mongodb-memory-${{ runner.os }}
```

This saves 30-60 seconds per CI run.

### Known Benign Log Messages

These warnings are expected and non-fatal:

| Message | Source | Reason |
|---------|--------|--------|
| `Encryption key missing` | Profile tests | Test environment lacks secrets |
| `i18n fallback` | Translation tests | Intentional missing translations |
| `ErrorBoundary: Boom` | Error boundary tests | Intentional error simulation |
| `profile fetch fail` | Mocked tests | Expected mock behavior |

### Silencing Test Noise

In vitest setup, silence known warnings:

```typescript
// vitest.setup.ts
beforeAll(() => {
  vi.spyOn(console, 'warn').mockImplementation((msg) => {
    if (msg.includes('Encryption key') || msg.includes('i18n fallback')) {
      return; // Silence known benign warnings
    }
    console.warn(msg);
  });
});
```

## Recommended CI Configuration

```yaml
# Optimized CI workflow
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9
          
      - name: Cache dependencies
        uses: actions/cache@v4
        with:
          path: ~/.pnpm-store
          key: pnpm-${{ hashFiles('pnpm-lock.yaml') }}
          
      - name: Cache MongoDB binaries
        uses: actions/cache@v4
        with:
          path: ~/.cache/mongodb-binaries
          key: mongodb-memory-${{ runner.os }}
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Run sharded tests
        run: pnpm test:ci:sharded
```

## Troubleshooting

### Tests Hanging

If tests hang, check for:
1. Unclosed MongoDB connections
2. Pending timers/intervals
3. Unresolved promises

Add timeout to vitest config:
```typescript
testTimeout: 30000,
hookTimeout: 30000,
```

### Memory Issues

If OOM errors occur:
1. Use sharded execution (`--project server` then `--project client`)
2. Limit workers: `--maxWorkers=2`
3. Run sequentially: `--pool=forks --poolOptions.forks.singleFork`

### Flaky Tests

For flaky tests:
1. Isolate with MongoMemoryServer per test file
2. Use `beforeAll`/`afterAll` for DB setup
3. Add retry: `--retry=1`
