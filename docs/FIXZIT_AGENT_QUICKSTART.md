# 🚀 Fixzit Agent - Quick Start Guide

**One-page reference for executing the Fixzit Agent stabilization system**

---

## 📦 What Was Created?

✅ **8 Files Total:**

1. `app/administration/page.tsx` - Admin module (850+ lines, RBAC protected)
2. `scripts/fixzit-agent.mjs` - Main orchestration (500+ lines)
3. `scripts/codemods/import-rewrite.cjs` - Import path normalization
4. `scripts/codemods/replace-console.cjs` - Console → logger replacement
5. `scripts/i18n-scan.mjs` - Translation parity audit
6. `scripts/api-scan.mjs` - API endpoint scanner
7. `scripts/stop-dev.js` - Dev server shutdown utility
8. `tests/hfv.e2e.spec.ts` - Halt-Fix-Verify E2E tests (117 scenarios)

✅ **1 File Modified:**

- `package.json` - Added 3 new scripts

✅ **2 Documentation Files:**

- `CATEGORIZED_TASKS_LIST.md` - 45 tasks across 8 categories
- `FIXZIT_AGENT_COMPLETION_REPORT.md` - Comprehensive delivery report

---

## ⚡ Quick Commands

### Run Dry-Run Analysis (Safe, No Changes)

```bash
pnpm run fixzit:agent
```

**This will:**

- Analyze recent fixes (5 days)
- Scan for similar issues
- Check for duplicates
- Generate move plan
- Run static analysis
- Generate comprehensive reports

**Output:** `reports/*.{json,log,md}`

---

### Fix P0 Blockers (REQUIRED Before Apply)

```bash
# 1. Run tests to see failures
pnpm run test

# 2. Fix 143 failing tests (manual work: 4-6 hours)
# ... fix test files ...

# 3. Verify tests pass
pnpm run test

# 4. Run console replacement codemod (IMPORTANT: Only after tests pass)
npx jscodeshift -t scripts/codemods/replace-console.cjs app/ --parser=tsx --extensions=ts,tsx

# 5. Commit
git add .
git commit -m "chore: replace console with logger (Phase 3 P0)"

# 6. Verify build
pnpm run build
```

---

### Apply Mode (After Tests Green)

```bash
pnpm run fixzit:agent:apply
```

**⚠️ WARNING:** This creates a new branch and moves files!

**This will:**

- Create feature branch `fixzit-agent/TIMESTAMP`
- Move files per Gov V5 structure
- Run import rewrite codemod
- Commit changes
- Start keep-alive dev server

---

### Run E2E Tests

```bash
npx playwright test tests/hfv.e2e.spec.ts
```

**This will:**

- Test 9 roles × 13 pages = 117 scenarios
- Verify RBAC enforcement
- Check for console errors
- Capture screenshot evidence

**Output:** `reports/evidence/*.png`

---

### Stop Dev Server

```bash
pnpm run fixzit:agent:stop
```

---

## 📊 Check Reports

After running dry-run:

```bash
# Main similarity report
cat reports/5d_similarity_report.md

# Recent fixes (5 days)
cat reports/fixes_5d.json

# Potential issues
cat reports/similar_hits.json

# Duplicate files
cat reports/duplicates.json

# Move plan
cat reports/move-plan.json

# i18n missing keys
cat reports/i18n-missing.json

# API endpoints
cat reports/api-endpoint-scan.json

# Static analysis
cat reports/eslint_initial.log
cat reports/tsc_initial.log
```

---

## 🚦 Recommended Workflow

### Step 1: Dry-Run (10 minutes)

```bash
pnpm run fixzit:agent
cat reports/5d_similarity_report.md
```

### Step 2: Fix P0 Blockers (4-6 hours) ⚠️ CRITICAL

```bash
pnpm run test                        # See failures
# ... fix tests ...
pnpm run test                        # Verify green ✅
npx jscodeshift -t scripts/codemods/replace-console.cjs app/ --parser=tsx
git add . && git commit -m "chore: P0 fixes"
pnpm run build                       # Verify build ✅
```

### Step 3: Apply Mode (5 minutes)

```bash
pnpm run fixzit:agent:apply
git log -1                           # Review commit
git diff HEAD~1                      # Review changes
```

### Step 4: E2E Tests (15 minutes)

```bash
npx playwright test tests/hfv.e2e.spec.ts
ls -lh reports/evidence/             # Review screenshots
```

### Step 5: Create PR

```bash
git push -u origin HEAD
gh pr create --fill --draft --title "fixzit-agent: Gov V5 + import normalization"
```

### Step 6: Stop Server

```bash
pnpm run fixzit:agent:stop
```

---

## 🎯 P0 Blockers (Must Fix Before Apply)

### 1. 143 Failing Tests

- **Priority:** P0
- **Time:** 4-6 hours
- **Impact:** Blocks all merges
- **Action:** Run `pnpm run test`, fix failures

### 2. Console Statements Phase 3

- **Priority:** P0
- **Time:** 30 minutes (automated via codemod)
- **Impact:** Production logs polluted
- **Action:** Run console replacement codemod (see Step 2 above)

---

## 🔍 Heuristics Detected (8 Patterns)

The agent scans for:

1. Hydration/Server-Client mismatch
2. Undefined property access
3. i18n/RTL issues (`text-left`, `pl-`, etc.)
4. Fragile relative imports (`../../../`)
5. Alias misuse (`@/src/`)
6. NextResponse usage
7. TypeScript assignability issues
8. Unhandled promise rejections

**Output:** `reports/similar_hits.json` + `tasks/TODO_flat.json`

---

## 📁 Gov V5 Canonical Buckets (14 Total)

Files will be moved to:

- `app/dashboard`
- `app/work-orders`
- `app/properties`
- `app/finance`
- `app/hr`
- `app/administration`
- `app/crm`
- `app/marketplace`
- `app/support`
- `app/compliance`
- `app/reports`
- `app/system`
- `components`
- `components/navigation`

**Output:** `reports/move-plan.json`

---

## 🛠️ Codemod Details

### Import Rewrite

```bash
npx jscodeshift -t scripts/codemods/import-rewrite.cjs app/ --parser=tsx
```

**Transforms:**

- `@/src/foo` → `@/foo`
- `../../../lib/bar` → `@/lib/bar`

### Console Replacement

```bash
npx jscodeshift -t scripts/codemods/replace-console.cjs app/ --parser=tsx
```

**Transforms:**

- `console.log` → `logger.info`
- `console.warn` → `logger.warn`
- `console.error` → `logger.error`

**Auto-adds:** `import { logger } from '@/lib/logger'`

---

## 📞 Troubleshooting

### Issue: "PID file not found"

**Solution:** Dev server not running. Ignore or start manually.

### Issue: "Working directory not clean"

**Solution:** Commit or stash changes before running `--apply` mode.

### Issue: "Tests failing"

**Solution:** Fix P0 blockers first. See Step 2 in workflow.

### Issue: "Import errors after apply"

**Solution:** Run import rewrite codemod again:

```bash
npx jscodeshift -t scripts/codemods/import-rewrite.cjs app/ --parser=tsx
```

### Issue: "Build fails after apply"

**Solution:** Check TypeScript errors:

```bash
cat reports/tsc_after.log
pnpm exec tsc --noEmit
```

---

## ✅ Success Checklist

Before marking complete:

- [ ] Dry-run executed (`pnpm run fixzit:agent`)
- [ ] Reports reviewed (`reports/*.{json,md}`)
- [ ] P0 blockers fixed (143 tests + console statements)
- [ ] Tests green (`pnpm run test`)
- [ ] Build succeeds (`pnpm run build`)
- [ ] Apply mode executed (`pnpm run fixzit:agent:apply`)
- [ ] E2E tests executed (`npx playwright test tests/hfv.e2e.spec.ts`)
- [ ] Evidence reviewed (`reports/evidence/*.png`)
- [ ] PR created (`gh pr create --fill --draft`)

---

## 📚 Full Documentation

See `FIXZIT_AGENT_COMPLETION_REPORT.md` for:

- Comprehensive feature list
- Technical architecture
- Detailed usage examples
- Decision rationale
- Success metrics

---

**Generated:** November 6, 2024  
**Version:** Fixzit Agent v1.0  
**Storage:** 3.0GB / 23GB available (23% utilization) ✅

🚀 **Ready to execute!** Start with Step 1 (Dry-Run) above.
