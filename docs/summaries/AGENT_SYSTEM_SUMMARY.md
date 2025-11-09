# Fixzit Agent System - Implementation Summary

**Date:** November 8, 2025  
**Status:** ✅ FULLY IMPLEMENTED

---

## Overview

The Fixzit Agent System is a comprehensive automated stabilization protocol that performs 13 orchestrated steps to maintain code quality, enforce governance policies, and enable continuous improvement through pattern detection and automated fixes.

---

## 🚀 Quick Start

### Running the Agent

```bash
# Dry-run mode (analysis only - safe to run anytime)
pnpm run fixzit:agent

# Apply mode (executes file moves & codemods - creates new branch)
pnpm run fixzit:agent:apply

# Stop background dev server
pnpm run fixzit:agent:stop
```

### Command-Line Options

```bash
node scripts/fixzit-agent.mjs [options]

Options:
  --apply          Execute file moves and codemods (creates new git branch)
  --report         Generate comprehensive reports (default: true)
  --since N        Analyze fixes from N days ago (default: 5)
  --port N         Dev server port (default: 3000)
  --no-keep-alive  Don't start dev server after completion
```

---

## 📁 System Components

### Core Files

| File | Purpose | Status |
|------|---------|--------|
| `scripts/fixzit-agent.mjs` | Main orchestration script (13 steps) | ✅ Implemented |
| `scripts/codemods/import-rewrite.cjs` | jscodeshift transform for import normalization | ✅ Implemented |
| `scripts/i18n-scan.mjs` | i18n key parity checker (EN/AR) | ✅ Implemented |
| `scripts/api-scan.mjs` | API endpoint documentation scanner | ✅ Implemented |
| `scripts/stop-dev.js` | Dev server stop utility | ✅ Implemented |
| `tests/hfv.e2e.spec.ts` | Halt-Fix-Verify E2E smoke tests (9×13) | ✅ Implemented |

### Package.json Scripts

```json
{
  "scripts": {
    "fixzit:agent": "node scripts/fixzit-agent.mjs --report",
    "fixzit:agent:apply": "node scripts/fixzit-agent.mjs --apply --report",
    "fixzit:agent:stop": "node scripts/stop-dev.js"
  }
}
```

---

## 🔄 The 13-Step Protocol

### Phase 1: Setup & Baseline

#### Step 0: Initialization
- Creates required directories: `reports/`, `tasks/`, `tmp/`, `.agent-cache/`
- Detects package manager (pnpm/yarn/npm)
- Generates timestamp-based branch name

#### Step 1: Install Tooling
Installs dev dependencies:
- `globby` - File pattern matching
- `chalk` - Terminal colors
- `ora` - Loading spinners
- `jscodeshift` - Code transformation
- `madge` - Module dependency analysis
- `depcheck` - Unused dependency detection
- `zx` - Shell scripting utilities

#### Step 2: Capture Baseline
- Captures git status
- Records Node.js and package manager versions
- Runs initial build (logs output)
- All baselines saved to `reports/`

#### Step 3: Git Safety
- Creates new branch: `fixzit-agent/YYYY-MM-DDTHH-mm-ss`
- Ensures clean isolation from main/develop
- Prevents accidental modifications to protected branches

---

### Phase 2: Analysis & Discovery

#### Step 4: Fix Mining (5-Day History)
Analyzes recent commits to identify patterns:
- Extracts commit hashes, dates, subjects, affected files
- Generates full diff patches
- Outputs:
  - `tmp/fixes_5d_raw.log` - Raw commit log
  - `tmp/fixes_5d_diff.patch` - Complete diff
  - `reports/fixes_5d.json` - Parsed commit data

**Heuristics Applied:**
- Hydration errors (`/hydration/i`)
- Undefined property access (`/cannot read propert(y|ies)/i`)
- Import alias misuse (`/@\/src\//g`)
- Fragile relative imports (`/\.\.\//g`)
- i18n/RTL issues (`/i18n|rtl/i`)
- Unhandled rejections (`/unhandled.*rejection/i`)

#### Step 5: Similarity Sweep
Scans entire codebase for similar issue patterns:
- Uses regex-based heuristics from Step 4
- Identifies repeated anti-patterns
- Outputs: `reports/similar_hits.json`

#### Step 6: Static Analysis
Runs comprehensive quality checks:
- **ESLint:** Full codebase lint with all rules
- **TypeScript:** Type checking with `--noEmit`
- Outputs:
  - `reports/eslint_all.log`
  - `reports/tsc_all.log`

#### Step 7: Duplicate Audit
Identifies duplicate and similar files:
- **Hash-based:** SHA1 content hashing for exact duplicates
- **Name-based:** Filename collision detection
- Outputs: `reports/duplicates.json`

#### Step 8: Canonical Move Plan (Governance V5)
Generates file reorganization plan based on module buckets:

**Gov V5 Buckets:**
- `app/dashboard` - Overview and dashboards
- `app/work-orders` - Work order management
- `app/properties` - Property & asset management
- `app/finance` - Financial operations, ZATCA compliance
- `app/hr` - Human resources, payroll
- `app/administration` - System administration
- `app/crm` - Customer relationship management
- `app/marketplace` - Souq/marketplace operations
- `app/support` - Help desk & knowledge base
- `app/compliance` - Legal & audit trails
- `app/reports` - Analytics & reporting
- `components/navigation` - TopBar, Sidebar, Footer

Outputs: `reports/move-plan.json`

---

### Phase 3: Execution & Validation

#### Step 9: Apply Changes (--apply mode only)
When `--apply` flag is used:
1. Executes `git mv` for all planned file moves
2. Runs `import-rewrite.cjs` codemod:
   - Fixes `@/src/` imports → `@/`
   - Converts deep relative imports → aliases
3. Stages and commits changes

Commit message:
```
fixzit-agent: canonicalize structure + import rewrites (STRICT v4, Gov V5)
```

#### Step 10: Post-Move Analysis (--apply mode only)
Re-runs static analysis after modifications:
- ESLint → `reports/eslint_after.log`
- TypeScript → `reports/tsc_after.log`

Allows comparison of before/after states.

#### Step 11: Generate Reports
Creates comprehensive markdown summary:
- Commit analysis
- Similarity findings
- Static analysis results
- Move plan summary
- Next steps guidance

Outputs: `reports/5d_similarity_report.md`

#### Step 12: Run Analysis Hooks
Executes specialized scanners:
- **i18n Scanner:** Checks EN/AR locale parity
- **API Scanner:** Documents all API endpoints

Non-blocking (continues on failure).

#### Step 13: Dev Server Keep-Alive (optional)
When `--keep-alive` flag is used:
- Starts detached dev server
- Runs on specified port (default: 3000)
- Saves PID to `.agent-cache/dev.pid`
- Accessible via `http://localhost:3000`

---

## 🧪 HFV E2E Testing Suite

### Test Matrix

**Coverage:** 9 roles × 13 critical pages = **117 test scenarios**

**Roles Tested:**
1. Super Admin
2. Corporate Admin
3. Property Manager
4. Technician
5. Tenant
6. Vendor
7. Service Provider
8. Finance Team
9. Guest

**Critical Pages:**
1. `/dashboard` - Dashboard
2. `/work-orders` - Work Orders
3. `/properties` - Properties
4. `/finance` - Finance
5. `/hr` - HR
6. `/administration` - Administration
7. `/crm` - CRM
8. `/marketplace` - Marketplace
9. `/support` - Support
10. `/compliance` - Compliance
11. `/reports` - Reports
12. `/login` - Login (public)
13. `/` - Landing Page (public)

### Test Behavior

**For Each Role + Page Combination:**
1. Mock authentication for the role
2. Navigate to page
3. Verify RBAC:
   - ✅ Should access (role has permission)
   - 🚫 Should NOT access (expect redirect/403/404)
4. Capture console errors (zero-tolerance)
5. Take full-page screenshot
6. Save evidence to `reports/evidence/{role}_{page}.png`

**Assertion Types:**
- Header/footer visibility (layout integrity)
- Console error count === 0 (HFV policy)
- RBAC enforcement (authorized vs unauthorized)
- Page load success (HTTP 200 or expected redirect)

### Running Tests

```bash
# Run all HFV tests
npx playwright test tests/hfv.e2e.spec.ts

# Run specific role
npx playwright test tests/hfv.e2e.spec.ts --grep "Super Admin"

# Run with UI (headed mode)
npx playwright test tests/hfv.e2e.spec.ts --headed

# Debug mode
npx playwright test tests/hfv.e2e.spec.ts --debug
```

---

## 🛠️ Codemod: Import Rewrite

**File:** `scripts/codemods/import-rewrite.cjs`  
**Transform Engine:** jscodeshift

### Rules Applied

1. **Normalize `@/src/` to `@/`**
   ```typescript
   // BEFORE
   import { Button } from '@/src/components/ui/Button';
   
   // AFTER
   import { Button } from '@/components/ui/Button';
   ```

2. **Convert deep relative imports to aliases**
   ```typescript
   // BEFORE (in app/finance/invoices/page.tsx)
   import { formatCurrency } from '../../../lib/utils/currency';
   
   // AFTER
   import { formatCurrency } from '@/lib/utils/currency';
   ```

3. **Preserve external imports**
   ```typescript
   // NOT MODIFIED
   import React from 'react';
   import { useSession } from 'next-auth/react';
   ```

### Usage

```bash
# Run codemod on entire codebase
npx jscodeshift -t scripts/codemods/import-rewrite.cjs . --extensions=ts,tsx,js,jsx --parser=tsx

# Dry-run (no modifications)
npx jscodeshift -t scripts/codemods/import-rewrite.cjs . --extensions=ts,tsx --parser=tsx --dry

# Run on specific directory
npx jscodeshift -t scripts/codemods/import-rewrite.cjs app/finance --extensions=ts,tsx --parser=tsx
```

---

## 📊 Analysis Utilities

### i18n Scanner

**File:** `scripts/i18n-scan.mjs`

**Purpose:** Detects i18n key mismatches between English and Arabic locales.

**Checks:**
1. Keys in EN but missing in AR
2. Keys in AR but missing in EN
3. Keys used in code but missing from both locales

**Output:** `reports/i18n-missing.json`

**Example Output:**
```json
{
  "enOnly": ["dashboard.newFeature"],
  "arOnly": ["dashboard.oldFeature"],
  "usedButMissing": ["auth.invalidToken"],
  "counts": {
    "enKeys": 450,
    "arKeys": 448,
    "usedKeys": 455,
    "enOnly": 2,
    "arOnly": 1,
    "usedButMissing": 5
  }
}
```

**Usage:**
```bash
node scripts/i18n-scan.mjs
```

---

### API Scanner

**File:** `scripts/api-scan.mjs`

**Purpose:** Documents all Next.js API route handlers.

**Scans For:**
- Route files: `app/**/route.{ts,js}`
- HTTP methods: GET, POST, PUT, PATCH, DELETE
- NextResponse usage
- Authentication patterns

**Output:** `reports/api-endpoint-scan.json`

**Example Output:**
```json
[
  {
    "path": "/api/auth/[...nextauth]",
    "file": "app/api/auth/[...nextauth]/route.ts",
    "methods": ["GET", "POST"],
    "importsNextServer": true
  },
  {
    "path": "/api/work-orders",
    "file": "app/api/work-orders/route.ts",
    "methods": ["GET", "POST"],
    "importsNextServer": true
  }
]
```

**Usage:**
```bash
node scripts/api-scan.mjs
```

---

## 🎯 Dev Server Management

### Start Server (Keep-Alive)

The agent can start a detached dev server that continues running after the agent exits.

```bash
# Agent with keep-alive server
pnpm run fixzit:agent -- --keep-alive --port 3000
```

**Behavior:**
- Server runs detached (background)
- PID saved to `.agent-cache/dev.pid`
- Logs to `tmp/dev-server.log` (if enabled)
- Accessible at `http://localhost:{PORT}`

### Stop Server

```bash
# Stop the background server
pnpm run fixzit:agent:stop
```

**Behavior:**
- Reads PID from `.agent-cache/dev.pid`
- Sends SIGTERM to process
- Cleans up PID file
- Handles stale PIDs gracefully

**File:** `scripts/stop-dev.js`

---

## 📋 Output Files Reference

### Reports Directory (`reports/`)

| File | Purpose | Generated By |
|------|---------|--------------|
| `git-status-initial.log` | Initial git state | Step 2 |
| `versions.txt` | Node & PM versions | Step 2 |
| `build-initial.log` | Initial build output | Step 2 |
| `fixes_5d.json` | Parsed commit data | Step 4 |
| `similar_hits.json` | Similarity scan results | Step 5 |
| `eslint_all.log` | Pre-move ESLint output | Step 6 |
| `tsc_all.log` | Pre-move TypeScript output | Step 6 |
| `duplicates.json` | Duplicate file audit | Step 7 |
| `move-plan.json` | Canonical file moves | Step 8 |
| `eslint_after.log` | Post-move ESLint | Step 10 |
| `tsc_after.log` | Post-move TypeScript | Step 10 |
| `5d_similarity_report.md` | Comprehensive summary | Step 11 |
| `i18n-missing.json` | i18n key parity report | Step 12 |
| `api-endpoint-scan.json` | API endpoint documentation | Step 12 |
| `evidence/{role}_{page}.png` | HFV test screenshots | E2E tests |

### Temporary Files (`tmp/`)

| File | Purpose |
|------|---------|
| `fixes_5d_raw.log` | Raw git log output |
| `fixes_5d_diff.patch` | Complete diff of recent commits |

### Tasks Directory (`tasks/`)

| File | Purpose |
|------|---------|
| `TODO_flat.json` | Flat list of detected issues |

---

## 🔧 Configuration

### Governance V5 Bucket Rules

Modify `CONFIG.GOV_V5_BUCKETS` in `fixzit-agent.mjs`:

```javascript
const CONFIG = {
  GOV_V5_BUCKETS: [
    { bucket: 'app/dashboard', regex: /dashboard|overview/i },
    { bucket: 'app/work-orders', regex: /work-?order|wo|ticket/i },
    // Add custom rules here
  ]
};
```

### Similarity Heuristics

Add custom pattern detection in `CONFIG.SIMILARITY_HEURISTICS`:

```javascript
SIMILARITY_HEURISTICS: [
  { name: 'Custom Pattern', regex: /your-pattern/i },
  // More heuristics
]
```

---

## 📝 Best Practices

### When to Run Dry-Run Mode

**Always safe:**
- Daily/weekly code health checks
- Before major refactors
- After merging feature branches
- During onboarding new developers

**Command:**
```bash
pnpm run fixzit:agent
```

### When to Run Apply Mode

**Use with caution:**
- After reviewing move plan (`reports/move-plan.json`)
- On a feature branch (agent creates one automatically)
- When ready to commit structural changes

**Command:**
```bash
pnpm run fixzit:agent:apply
```

### Workflow Integration

**Recommended Git workflow:**
```bash
# 1. Ensure main is up-to-date
git checkout main
git pull origin main

# 2. Run agent in apply mode (creates new branch)
pnpm run fixzit:agent:apply

# 3. Review changes
git diff HEAD~1

# 4. Run tests
pnpm test
pnpm run test:e2e

# 5. Push and create PR
git push origin fixzit-agent/YYYY-MM-DDTHH-mm-ss
gh pr create --fill

# 6. After PR merge, delete agent branch
git branch -d fixzit-agent/YYYY-MM-DDTHH-mm-ss
```

---

## 🚨 Troubleshooting

### Agent Fails to Start

**Symptom:** `Error: Cannot find module 'globby'`

**Solution:**
```bash
# Install missing dependencies
pnpm install

# Or let agent install them
pnpm run fixzit:agent
```

### Dev Server Won't Stop

**Symptom:** `pnpm run fixzit:agent:stop` reports "Process not found"

**Solution:**
```bash
# Find dev server process manually
ps aux | grep "next dev"

# Kill manually
kill -9 <PID>

# Clean up stale PID file
rm .agent-cache/dev.pid
```

### E2E Tests Fail with "Navigation timeout"

**Symptom:** HFV tests timeout waiting for pages

**Solution:**
```bash
# 1. Ensure dev server is running
pnpm run dev

# 2. Verify BASE_URL
export BASE_URL=http://localhost:3000

# 3. Run tests
npx playwright test tests/hfv.e2e.spec.ts

# 4. Check for port conflicts
lsof -i :3000
```

### Codemod Produces Incorrect Imports

**Symptom:** Imports like `@/app/dashboard` instead of `@/components/Button`

**Solution:**
1. Review codemod logic in `scripts/codemods/import-rewrite.cjs`
2. Test on single file first:
   ```bash
   npx jscodeshift -t scripts/codemods/import-rewrite.cjs app/test.tsx --dry
   ```
3. Adjust path resolution logic
4. Re-run on full codebase

---

## 📈 Success Metrics

### Healthy Repository Indicators

✅ **Zero console errors** in HFV E2E tests  
✅ **<10 TypeScript errors** in `tsc_all.log`  
✅ **<50 ESLint warnings** in `eslint_all.log`  
✅ **Zero hash-based duplicates** in `duplicates.json`  
✅ **<5 missing i18n keys** in `i18n-missing.json`  
✅ **All API routes documented** in `api-endpoint-scan.json`

### Weekly Health Check

```bash
# Monday morning routine
pnpm run fixzit:agent

# Review reports:
cat reports/5d_similarity_report.md
cat reports/i18n-missing.json
cat reports/api-endpoint-scan.json

# Address any blockers found
```

---

## 🎓 Advanced Usage

### Custom Git History Range

```bash
# Analyze last 10 days instead of 5
node scripts/fixzit-agent.mjs --since 10
```

### Parallel Analysis on CI/CD

```yaml
# .github/workflows/agent-health-check.yml
name: Weekly Agent Health Check

on:
  schedule:
    - cron: '0 9 * * 1' # Every Monday at 9 AM

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm run fixzit:agent
      
      - name: Upload Reports
        uses: actions/upload-artifact@v4
        with:
          name: agent-reports
          path: reports/
```

---

## 🤝 Contributing

### Adding New Heuristics

1. Edit `CONFIG.SIMILARITY_HEURISTICS`
2. Add regex pattern and descriptive name
3. Test with `pnpm run fixzit:agent`
4. Submit PR with examples

### Adding New Gov V5 Buckets

1. Edit `CONFIG.GOV_V5_BUCKETS`
2. Define bucket path and regex
3. Run in dry-run mode to preview moves
4. Apply and verify

---

## 📚 Related Documentation

- [TEST_COVERAGE_SUMMARY.md](./TEST_COVERAGE_SUMMARY.md) - Test expansion summary
- [SECURITY.md](./SECURITY.md) - Security policy and disclosure
- [CATEGORIZED_TASKS_LIST.md](./CATEGORIZED_TASKS_LIST.md) - Task prioritization
- [docs/requirements/000-index.md](./docs/requirements/000-index.md) - System requirements

---

## ✅ Verification Checklist

Before considering the agent system complete:

- [x] All 13 steps implemented in `fixzit-agent.mjs`
- [x] Import rewrite codemod functional
- [x] i18n and API scanners operational
- [x] HFV E2E suite covers 9×13 scenarios
- [x] Dev server start/stop utilities working
- [x] Package.json scripts configured
- [x] Reports directory structure created
- [x] Governance V5 buckets defined
- [x] Zero console error policy enforced
- [x] Documentation complete

---

**Status:** ✅ **FULLY IMPLEMENTED AND OPERATIONAL**

**Last Verified:** November 8, 2025  
**Version:** 5.0  
**Maintainer:** Fixzit Engineering Team
