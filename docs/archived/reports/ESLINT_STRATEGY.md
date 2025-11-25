# ESLint Issues Analysis & Fix Strategy

## Current Status

- **Last TypeScript Check**: 82 errors remaining (all in pending PRs #183, #184)
- **ESLint Issues**: 689 (638 errors, 51 warnings) - **67.5% REDUCTION from ~2119!**

## ✅ COMPLETED WORK (Phases 1-2b)

- ✅ **Phase 1**: Config improvements - Fixed ~1355 errors (64% reduction)
- ✅ **Phase 2a**: Auto-fix warnings - Fixed 44 warnings
- ✅ **Phase 2b**: React/JSX globals - Fixed 31 errors
- ✅ **TOTAL FIXED**: ~1430 issues (67.5% reduction!)
- ✅ **Commits**: f1c69a5c0, 7f480a6be pushed to fix/remaining-typescript-errors

## Top ESLint Issues by Category

### 1. Test Framework Globals (HIGH PRIORITY - ~400+ issues)

**Issues:**

- `'expect' is not defined` (297 occurrences)
- `'test' is not defined` (52 occurrences)
- `'it' is not defined` (43 occurrences)
- `'describe' is not defined` (17 occurrences)
- `'beforeEach' is not defined` (7 occurrences)

**Root Cause:** Test files missing vitest/jest imports or ESLint config not recognizing test globals

**Fix Strategy:**

1. Add `.eslintrc.json` overrides for test files:
   ```json
   {
     "overrides": [
       {
         "files": ["**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts"],
         "env": {
           "jest": true
         },
         "globals": {
           "describe": "readonly",
           "test": "readonly",
           "it": "readonly",
           "expect": "readonly",
           "beforeEach": "readonly",
           "afterEach": "readonly",
           "beforeAll": "readonly",
           "afterAll": "readonly",
           "vi": "readonly"
         }
       }
     ]
   }
   ```

**Estimated Time:** 15 minutes
**Impact:** Fixes ~400 errors

---

### 2. React Undefined (MEDIUM PRIORITY - ~29 issues)

**Issues:**

- `'React' is not defined` (29 occurrences)

**Root Cause:** Missing `import React from 'react'` in JSX files (Next.js 13+ auto-imports React, but ESLint doesn't know)

**Fix Strategy:**

1. Update ESLint config to recognize Next.js React auto-import:
   ```json
   {
     "extends": ["next/core-web-vitals"],
     "rules": {
       "react/react-in-jsx-scope": "off"
     }
   }
   ```

**Estimated Time:** 5 minutes
**Impact:** Fixes ~29 errors

---

### 3. TypeScript/Browser Globals (MEDIUM PRIORITY - ~50 issues)

**Issues:**

- `'google' is not defined` (17 occurrences)
- `'RequestInit' is not defined` (7 occurrences)
- `'EventListener' is not defined` (6 occurrences)
- `'NodeJS' is not defined` (seen in help/ask/route.ts)
- `'HeadersInit' is not defined` (seen in demo-login)

**Root Cause:** Missing type definitions or ESLint env config

**Fix Strategy:**

1. Add proper env and globals to ESLint config:
   ```json
   {
     "env": {
       "browser": true,
       "node": true,
       "es2021": true
     },
     "globals": {
       "google": "readonly",
       "NodeJS": "readonly"
     }
   }
   ```
2. For TypeScript types, add `/// <reference types="node" />` where needed

**Estimated Time:** 20 minutes
**Impact:** Fixes ~50 errors

---

### 4. Unused Variables (LOW PRIORITY - ~100+ issues)

**Issues:**

- Various `'X' is defined but never used` errors
- Includes function parameters, imports, constants

**Fix Strategy:**

1. Prefix unused variables with underscore: `_variableName`
2. Remove truly unused imports and variables
3. Use ESLint auto-fix where safe:
   ```bash
   pnpm eslint --fix --rule 'no-unused-vars: off' --rule '@typescript-eslint/no-unused-vars: error'
   ```

**Estimated Time:** 1-2 hours (manual review needed)
**Impact:** Fixes ~100-200 errors

---

### 5. TypeScript Any (LOW PRIORITY - ~18 issues)

**Issues:**

- `Unexpected any. Specify a different type` (18 occurrences)

**Fix Strategy:**

1. Replace `any` with proper types where possible
2. Use `unknown` for truly unknown types
3. Add `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with justification where `any` is necessary

**Estimated Time:** 1 hour
**Impact:** Fixes ~18 errors

---

### 6. Unused ESLint Directives (LOW PRIORITY - ~5 issues)

**Issues:**

- `Unused eslint-disable directive` (5 occurrences)

**Fix Strategy:**

1. Remove unused disable comments
2. Run: `eslint --fix` to auto-remove

**Estimated Time:** 5 minutes
**Impact:** Fixes ~5 errors

---

### 7. React Hooks Exhaustive Deps (MEDIUM PRIORITY - ~8 issues)

**Issues:**

- `Definition for rule 'react-hooks/exhaustive-deps' was not found` (8 occurrences)

**Root Cause:** Missing `eslint-plugin-react-hooks` plugin

**Fix Strategy:**

1. Ensure plugin is installed and configured:
   ```json
   {
     "plugins": ["react-hooks"],
     "rules": {
       "react-hooks/rules-of-hooks": "error",
       "react-hooks/exhaustive-deps": "warn"
     }
   }
   ```

**Estimated Time:** 5 minutes
**Impact:** Enables proper React hooks linting

---

## Recommended Action Plan

### Phase 1: Quick Wins (30-45 minutes) - ~500 errors fixed

1. **ESLint Config Updates** (Priority 1-3 above)
   - Add test globals
   - Fix React imports
   - Add browser/node globals
   - **Expected Impact:** ~480 errors resolved

### Phase 2: Cleanup (1-2 hours) - ~300 errors fixed

2. **Unused Variables Cleanup**
   - Prefix with underscore or remove
   - **Expected Impact:** ~200 errors resolved

3. **TypeScript Any Replacement**
   - Replace with proper types
   - **Expected Impact:** ~18 errors resolved

4. **Remove Unused Directives**
   - Auto-fix with ESLint
   - **Expected Impact:** ~5 errors resolved

### Phase 3: Manual Review (2-3 hours) - Remaining issues

5. **Review Remaining Issues**
   - File-specific problems
   - Logic errors
   - Custom fixes needed

---

## Immediate Next Steps

1. **Update ESLint Configuration** (Create PR #186):

   ```bash
   # Create new branch
   git checkout -b fix/eslint-config-globals

   # Update .eslintrc.json with test globals and env settings
   # Run eslint to verify
   pnpm lint

   # Commit and push
   git add .eslintrc.json
   git commit -m "fix: ESLint config - add test globals and env settings"
   git push -u origin fix/eslint-config-globals

   # Create PR
   gh pr create --title "fix: ESLint configuration - 480+ errors resolved" --draft
   ```

2. **Unused Variables Cleanup** (Create PR #187):

   ```bash
   # Create new branch
   git checkout -b fix/eslint-unused-variables

   # Fix unused variables (prefix with underscore or remove)
   # Use find/replace and manual review

   # Commit and push
   gh pr create --title "fix: ESLint unused variables cleanup" --draft
   ```

---

## Success Metrics

- **Target:** Reduce from 2119 to <500 ESLint issues
- **Time Investment:** 4-6 hours total
- **PRs Created:** 2-3 focused PRs
- **Maintainability:** Improved with proper ESLint config

---

**Status:** Ready to execute Phase 1
**Next Action:** Create fix/eslint-config-globals branch and update .eslintrc.json
