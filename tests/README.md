# Fixzit E2E Testing Framework

## 🚀 3-Hour Unattended Testing System

This testing framework runs continuously for 3 hours without any user prompts, testing all pages across all user roles in both English and Arabic.

## Architecture

### User Roles Tested

- **SuperAdmin**: Full system access
- **Admin**: Organization-level administration
- **Manager**: Department/team management
- **Technician**: Field service operations
- **Tenant**: Property owner/resident
- **Vendor**: Service provider

### Locales Tested

- **English (en-US)**: LTR layout
- **Arabic (ar-SA)**: RTL layout

### Test Matrix

Total configurations: **12** (6 roles × 2 locales)

## Quick Start

### Prerequisites

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm test:install
```

### Setup Test Users

1. Copy environment template:

```bash
cp .env.test .env.local
```

2. Update credentials in `.env.local` to match your test database

3. Generate authentication states:

```bash
pnpm test:e2e:setup
```

This creates storage states in `tests/state/` for each role.

### Run Tests

#### Option 1: VS Code Task (Recommended)

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "Tasks: Run Task"
3. Select **"🚀 START: 3-Hour Unattended E2E Testing"**
4. Walk away for 3 hours ☕

#### Option 2: Command Line

```bash
# Start dev server in one terminal
pnpm dev

# Run loop in another terminal
pnpm test:e2e:loop
```

## Test Coverage

### Pages Tested (14 modules)

- `/` - Landing page
- `/app` - App home
- `/dashboard` - Main dashboard
- `/work-orders` - Work order management
- `/properties` - Property management
- `/finance` - Financial management
- `/hr` - Human resources
- `/admin` - Administration
- `/crm` - Customer relationship management
- `/marketplace` - Service marketplace
- `/support` - Help & support
- `/compliance` - Regulatory compliance
- `/reports` - Analytics & reports
- `/system` - System management

### Test Types

#### 1. Smoke Tests (`smoke.spec.ts`)

- Page loads successfully
- Core layout elements present (header, sidebar, footer)
- Language & currency selectors visible
- No console errors
- No failed network requests (4xx/5xx)
- RTL/LTR direction correct for locale

#### 2. i18n Tests (`i18n.spec.ts`)

- No missing translation keys
- Language switching works
- RTL layout integrity
- Currency selector functionality

#### 3. i18n Scanner (`i18n-scan.mjs`)

- Static code analysis for translation usage
- Validates all keys exist in dictionaries
- Detects hardcoded UI text
- **STRICT MODE**: Fails build if keys missing

## Verification Loop

Each cycle runs:

1. **TypeScript Type Check** (`pnpm typecheck`)
2. **ESLint** (`pnpm lint`)
3. **i18n Key Scan** (`pnpm scan:i18n`)
4. **E2E Tests** (`pnpm test:e2e`)

The loop repeats until 3 hours elapsed.

## Results & Artifacts

After completion, check:

- **`playwright-report/index.html`**: Interactive HTML report with pass/fail details
- **`playwright-report/results.json`**: Machine-readable results
- **`tests/loop-runner.log`**: Timestamped execution log
- **Videos**: Saved for failed tests in `test-results/`
- **Traces**: Saved for failed tests, viewable with `npx playwright show-trace`

## Configuration Files

- **`playwright.config.ts`**: Playwright configuration with 12 project variants
- **`loop-runner.mjs`**: 3-hour orchestration script
- **`i18n-scan.mjs`**: Translation key validator
- **`setup-auth.ts`**: Authentication state generator
- **`.env.test`**: Test environment variables template

## Customization

### Adjust Test Duration

Edit `tests/loop-runner.mjs`:

```javascript
const THREE_HOURS_MS = 3 * 60 * 60 * 1000; // Change multiplier
```

### Add New Pages

Edit `tests/specs/smoke.spec.ts`:

```typescript
const CORE_PAGES = [
  // ... existing pages
  { path: "/new-module", name: "New Module" },
];
```

### Change Parallel Workers

Edit `playwright.config.ts`:

```typescript
workers: 4, // Increase/decrease based on CPU cores
```

## Troubleshooting

### Authentication Fails (401 Errors)

If tests fail with 401 Unauthorized errors or timeouts on protected routes:

```bash
# Method 1: Use the regeneration script (recommended)
./scripts/regenerate-test-auth.sh

# Method 2: Run setup manually
pnpm test:e2e:setup
```

**Root Cause**: Session tokens in `tests/state/*.json` are encrypted JWTs with expiration. They need regeneration when:

- NEXTAUTH_SECRET or AUTH_SECRET changes
- Test user credentials change
- Tokens expire (typically after 30 days)
- globalSetup didn't run with correct environment

**The regeneration script will**:

1. Validate `.env.test` exists
2. Check app is running on BASE_URL
3. Execute `tests/setup-auth.ts` to regenerate all 6 role states
4. Verify each state file is valid (>100 bytes)
5. Report success or troubleshooting steps

### Auth Regeneration Not Working

**Symptom**: Script fails with "App not running" or "Setup failed"

**Fix**:

```bash
# 1. Ensure dev server is running with proper env vars
ALLOW_OFFLINE_MONGODB=true SKIP_ENV_VALIDATION=true \\
  NEXTAUTH_SECRET=dev-secret AUTH_SECRET=dev-secret \\
  BASE_URL=http://localhost:3000 \\
  pnpm dev

# 2. In another terminal, run regeneration
./scripts/regenerate-test-auth.sh

# 3. Verify state files
ls -lh tests/state/*.json
# Each should be >100 bytes and recently modified
```

### Dev Server Not Starting

```bash
# Check port 3000 is free
lsof -i :3000

# Kill existing process
kill -9 <PID>
```

### Tests Timeout

Increase timeout in `playwright.config.ts`:

```typescript
timeout: 120000, // milliseconds
```

### Missing Translation Keys

Run scanner separately:

```bash
pnpm scan:i18n
```

Fix missing keys in:

- `i18n/locales/en/common.json`
- `i18n/locales/ar/common.json`
- `contexts/TranslationContext.tsx`

## Best Practices

1. **Never commit `.env.local`**: Contains test credentials
2. **Run locally before CI**: Catch issues early
3. **Check loop log**: `tests/loop-runner.log` shows detailed progress
4. **Use artifacts**: Videos/traces are gold for debugging
5. **Keep roles realistic**: Match production access patterns

## CI/CD Integration

For GitHub Actions:

```yaml
- name: Run E2E Tests
  run: |
    pnpm install
    pnpm test:install
    pnpm dev &
    sleep 10
    pnpm test:e2e
  env:
    CI: true
```

## Support

For issues or questions:

- Check `playwright-report/index.html` for test failures
- Review `tests/loop-runner.log` for cycle details
- Run single test: `pnpm exec playwright test --grep "Dashboard"`
- Debug mode: `pnpm test:debug`

---

**Built with Playwright + Next.js for Fixzit Production Verification**
