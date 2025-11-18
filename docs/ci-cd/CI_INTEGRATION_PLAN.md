# CI Integration Plan for Route Alias Validation

## Quick Reference
**Script:** `scripts/check-route-aliases.ts`  
**Command:** `npm run check:route-aliases`  
**Status:** ✅ Working locally, ⚠️ Not in CI yet

---

## Option 1: Add to existing verify:routes script

### Current setup:
```json
// package.json
{
  "scripts": {
    "verify:routes": "tsx scripts/verify-routes.ts",
    "check:route-aliases": "tsx scripts/check-route-aliases.ts"
  }
}
```

### Recommended change:
```json
{
  "scripts": {
    "verify:routes": "npm run check:route-aliases && tsx scripts/verify-routes.ts",
    "check:route-aliases": "tsx scripts/check-route-aliases.ts"
  }
}
```

**Benefit:** Fail fast if aliases are broken before attempting HTTP checks

---

## Option 2: Add to CI workflow directly

### GitHub Actions example:
```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Validate route aliases
        run: npm run check:route-aliases
        
      - name: Run tests
        run: npm test
```

---

## Option 3: Add to pre-commit hook

### Husky example:
```bash
# .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run check:route-aliases || {
  echo "❌ Route alias validation failed!"
  echo "Run 'npm run check:route-aliases' to see details"
  exit 1
}
```

**Benefit:** Catch issues before they reach remote

---

## Recommended Approach

**Immediate (Week 1):**
1. Add to `verify:routes` script (Option 1)
2. Run manually before merging PRs
3. Document in README

**Short-term (Week 2):**
1. Add to CI workflow (Option 2)
2. Require check to pass for PR approval

**Long-term (Month 1):**
1. Add pre-commit hook (Option 3) for developer feedback
2. Create dashboard showing reuse metrics over time
3. Alert when new duplications are introduced

---

## Implementation Steps

### Step 1: Update package.json
```bash
cd /Users/eng.sultanalhassni/Downloads/Fixzit/Fixzit
```

Edit `package.json`:
```json
"verify:routes": "pnpm run check:route-aliases && pnpm run check:route-refs && tsx scripts/verify-routes.ts && pnpm run check:nav-routes",
"verify:routes:http": "tsx scripts/run-route-http-check.ts"
```

### Step 2: Test locally
```bash
pnpm verify:routes         # static alias/ref/nav validation
pnpm verify:routes:http    # builds, starts Next.js, then runs HTTP sweeps automatically
```

### Step 3: Add to CI
Created `.github/workflows/route-quality.yml` that runs:
```yaml
- pnpm install --frozen-lockfile
- pnpm run check:route-aliases
- pnpm run check:route-refs
- pnpm run verify:routes:http
env:
  ALLOW_LOCAL_MONGODB: 'true'
  DISABLE_MONGODB_FOR_BUILD: 'true'
```
GitHub Actions now fails the PR as soon as a broken alias, dangling `/fm|/marketplace|/aqar` reference, or HTTP regression is introduced (without needing a real MongoDB cluster).

### Step 4: Document
Document in project docs:
```markdown
## Route Validation

### Check alias integrity
pnpm run check:route-aliases

### Static verification (alias + references + nav)
pnpm run verify:routes

### Full stack verification (build + HTTP sweep)
pnpm run verify:routes:http
```

---

## Success Criteria

✅ **Immediate:**
- `npm run verify:routes` includes alias validation
- Developers see clear error messages when aliases break

✅ **Short-term:**
- CI fails PR if route aliases point to missing files
- Build notifications show which alias failed
- Route-alias snapshots stored automatically every time `npm run check:route-aliases` runs, so dashboards always have history

✅ **Long-term:**
- Zero false positives (script is stable)
- Dashboard tracks reuse metrics over time
- Team can see which modules need dedicated pages

---

## Related Files
- **Validation Script:** `scripts/check-route-aliases.ts`
- **HTTP Verification:** `scripts/verify-routes.ts` (existing)
- **HTTP Runner:** `scripts/run-route-http-check.ts`
- **Audit Report:** `BROKEN_ROUTES_AUDIT.md`
- **Package Scripts:** `package.json`

---

## Next Action

Run this command to integrate:
```bash
cd /Users/eng.sultanalhassni/Downloads/Fixzit/Fixzit
# Update verify:routes to include alias check
npm pkg set scripts.verify:routes="npm run check:route-aliases && tsx scripts/verify-routes.ts"
# Test it works
npm run verify:routes
```
