# 🎯 STRICT GOVERNANCE - FIXZIT 100/100 PERFECTION

**Framework**: Non-negotiable rules enforced by automation  
**Goal**: TypeScript 0 errors, ESLint 0 warnings, verified quality gates  
**Date**: October 9, 2025

---

## 📋 NON-NEGOTIABLES (Immutable Rules)

### 1. Layout & Function Freeze

- ✅ Single Header + Sidebar + Content shell ONLY
- ❌ No duplicate headers
- ❌ No "creative tweaks"
- **Enforcement**: Playwright test asserts exactly 1 header per page

### 2. Halt-Fix-Verify Protocol

- **Halt** on ANY error (console/runtime/network/build)
- **Fix** in smallest scope possible
- **Verify** with artifacts (T0 + T0+10s screenshots, logs, commit)
- ❌ No moving forward with unresolved errors
- **Enforcement**: `pnpm verify:page` must pass before marking "Clean"

### 3. Branding Tokens (Sanctioned Palette)

```css
--brand-blue: #0061a8 /* Primary */ --brand-green: #00a859 /* Success */
  --brand-yellow: #ffb400 /* Warning */;
```

**Whitelist** (approved grays/reds/etc):

- `#FFFFFF` (white)
- `#111827`, `#1F2937`, `#374151`, `#6B7280`, `#9CA3AF`, `#E5E7EB`, `#F9FAFB` (grays)
- `#DC2626` (error red)
- `#16A34A` (success alt)
- `#FACC15` (warning alt)
- `#2563EB` (info blue)

**Banned Colors** (must be replaced):

- ❌ `#023047` → use `#0061A8` (brand-blue)
- ❌ `#F6851F` → use `#FFB400` (brand-yellow)
- ❌ Any arbitrary Tailwind hex `bg-[#...]`

**Enforcement**: `pnpm style:scan` blocks commits with off-palette colors

### 4. Global Elements (Every Page)

- ✅ Header with Fixzit branding
- ✅ Language selector (flags + native + ISO codes)
- ✅ Currency selector (icons)
- ✅ Footer
- ✅ Back-to-Home link
- ✅ Full RTL support (ar_SA)
- **Enforcement**: Playwright visual regression + element presence assertions

### 5. Completion Scope

- ✅ All modules exist with mock data
- ✅ Role navigation works (Super Admin → Guest)
- ✅ Everything passes verification checklist
- **Enforcement**: Role matrix must be 100% green before "Complete"

---

## 🏗️ REPOSITORY STRUCTURE

```
/workspaces/Fixzit/
├── app/                      # Next.js App Router pages
├── components/               # React components
├── lib/                      # Business logic, utilities
├── packages/
│   ├── ui/                   # Design system (tokens, primitives)
│   ├── config/               # Shared configs (ESLint, TS, Tailwind)
│   ├── testing/              # Playwright helpers, test utils
│   ├── observability/        # OpenTelemetry, pino logger
│   └── cache/                # MongoDB client + helpers
├── scripts/
│   ├── scan-hex.js           # Brand enforcement scanner
│   ├── verify-page.ts        # Halt-Fix-Verify automation
│   └── verify-all.ts         # Full role matrix verification
├── tests/
│   ├── e2e/                  # Playwright specs (page × role)
│   └── load/                 # k6 load tests
├── types/                    # Shared TypeScript types
└── artifacts/                # Verification artifacts (screenshots, logs)
```

---

## 🔧 PACKAGE SCRIPTS (Runnable in Cursor/Terminal)

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "tsc -b && next build",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "style:scan": "node scripts/scan-hex.js",
    "test": "vitest run",
    "e2e": "playwright test",
    "e2e:headed": "playwright test --headed",
    "verify:page": "ts-node scripts/verify-page.ts",
    "verify:all": "ts-node scripts/verify-all.ts",
    "zap:scan": "node scripts/zap-scan.js",
    "k6": "k6 run tests/load/smoke.k6.js",
    "ci": "pnpm typecheck && pnpm lint && pnpm style:scan && pnpm test && pnpm e2e"
  }
}
```

---

## 🚦 PARALLEL EXECUTION LANES

### Lane A: Static Hygiene (ESLint/TypeScript) - IN PROGRESS

**Goal**: 0 warnings, 0 errors, 0 `any` types  
**Current**: 423 warnings (348 `any` + 68 unused + 7 other)  
**Strategy**:

1. Fix unused variables (68) - prefix with `_` or remove
2. Fix escape characters (2) - remove unnecessary escapes
3. Fix React hooks (3) - add missing dependencies
4. Fix `any` types (348) - replace with proper interfaces

**Status**: 🟡 IN PROGRESS (153 files manually edited, TypeScript still 0 errors)

### Lane B: Brand & Layout Freeze - TODO

**Goal**: Lock shell, enforce palette, remove off-brand colors  
**Tasks**:

- [ ] Create `/packages/ui/tokens.css` with brand tokens
- [ ] Update `tailwind.config.mjs` with theme extension
- [ ] Implement `scan-hex.js` to block off-palette colors
- [ ] Replace all `#023047` → `#0061A8`
- [ ] Replace all `#F6851F` → `#FFB400`
- [ ] Assert single header per page (Playwright)

### Lane C: Type-Safe Boundaries - TODO

**Goal**: Org-scoped DB queries, typed APIs, RBAC everywhere  
**Tasks**:

- [ ] Create Mongoose plugin `withOrg` for automatic orgId scoping
- [ ] Add Zod schemas for all API boundaries
- [ ] Repository layer to hide Mongoose from UI
- [ ] Deny unscoped queries at model layer

### Lane D: Observability - TODO

**Goal**: OpenTelemetry, pino logs, RED metrics  
**Tasks**:

- [ ] Setup OTel HTTP/DB tracing
- [ ] Implement pino JSON logger
- [ ] Middleware for request/response logging
- [ ] RED metrics (Rate, Errors, Duration)

### Lane E: MongoDB Caching - TODO

**Goal**: Cache hot paths with org-scoped keys  
**Tasks**:

- [ ] MongoDB client setup
- [ ] Cached query wrapper with TTL
- [ ] Org-scoped cache keys
- [ ] Event-based invalidation

### Lane F: Halt-Fix-Verify Harness - TODO

**Goal**: Automated verification for every page × role  
**Tasks**:

- [ ] Create `verify-page.ts` script
- [ ] Playwright specs per page × role
- [ ] T0 + T0+10s screenshot capture
- [ ] Console/network error detection
- [ ] Artifact storage and reporting

### Lane G: Load & Security - TODO

**Goal**: k6 load tests, OWASP ZAP, Semgrep SAST  
**Tasks**:

- [ ] k6 smoke tests
- [ ] OWASP ZAP baseline scan
- [ ] Semgrep for SAST
- [ ] Performance budgets (p95 < 800ms)

### Lane H: PR Comment Blitz - TODO

**Goal**: Close 696 CodeRabbit comments by theme  
**Strategy**: Tag into buckets (Type/ESLint, Naming, Layout, Logic, Tests), apply codemods, reply en-masse

### Lane I: CI Gate - TODO

**Goal**: Block merges unless all gates pass  
**Tasks**:

- [ ] GitHub Actions workflow
- [ ] Typecheck + Lint + Style scan
- [ ] Unit + E2E tests
- [ ] Artifact upload

---

## 📊 ROLE MATRIX (Page × Role Verification)

| Module       | Super Admin | Admin | Corp Owner | Team | Tech | PM  | Tenant | Vendor | Guest |
| ------------ | ----------- | ----- | ---------- | ---- | ---- | --- | ------ | ------ | ----- |
| Landing      | 🟡          | 🟡    | 🟡         | 🟡   | 🟡   | 🟡  | 🟡     | 🟡     | 🟡    |
| Auth         | 🟡          | 🟡    | 🟡         | 🟡   | 🟡   | 🟡  | 🟡     | 🟡     | 🟡    |
| Layout Shell | 🟡          | 🟡    | 🟡         | 🟡   | 🟡   | 🟡  | 🟡     | 🟡     | 🟡    |
| Dashboard    | ⬜          | ⬜    | ⬜         | ⬜   | ⬜   | ⬜  | ⬜     | ⬜     | ⬜    |
| Work Orders  | ⬜          | ⬜    | ⬜         | ⬜   | ⬜   | ⬜  | ⬜     | ⬜     | ⬜    |
| Properties   | ⬜          | ⬜    | ⬜         | ⬜   | ⬜   | ⬜  | ⬜     | ⬜     | ⬜    |
| Finance      | ⬜          | ⬜    | ⬜         | ⬜   | ⬜   | ⬜  | ⬜     | ⬜     | ⬜    |
| HR/ATS       | ⬜          | ⬜    | ⬜         | ⬜   | ⬜   | ⬜  | ⬜     | ⬜     | ⬜    |
| Admin        | ⬜          | ⬜    | ⬜         | ⬜   | ⬜   | ⬜  | ⬜     | ⬜     | ⬜    |
| CRM          | ⬜          | ⬜    | ⬜         | ⬜   | ⬜   | ⬜  | ⬜     | ⬜     | ⬜    |
| Support      | ⬜          | ⬜    | ⬜         | ⬜   | ⬜   | ⬜  | ⬜     | ⬜     | ⬜    |
| Marketplace  | ⬜          | ⬜    | ⬜         | ⬜   | ⬜   | ⬜  | ⬜     | ⬜     | ⬜    |
| Compliance   | ⬜          | ⬜    | ⬜         | ⬜   | ⬜   | ⬜  | ⬜     | ⬜     | ⬜    |
| Reports      | ⬜          | ⬜    | ⬜         | ⬜   | ⬜   | ⬜  | ⬜     | ⬜     | ⬜    |
| System Mgmt  | ⬜          | ⬜    | ⬜         | ⬜   | ⬜   | ⬜  | ⬜     | ⬜     | ⬜    |

**Legend**:

- ⬜ TODO (not verified)
- 🟡 IN PROGRESS (has errors/warnings)
- ✅ CLEAN (verified, artifacts attached)

---

## ✅ "CLEAN" DEFINITION (Verification Checklist)

A page can ONLY be marked ✅ CLEAN if ALL criteria pass:

### 1. Build Quality

- [ ] TypeScript: 0 errors (`pnpm typecheck`)
- [ ] ESLint: 0 warnings (`pnpm lint`)
- [ ] Brand scan: 0 off-palette colors (`pnpm style:scan`)
- [ ] Production build: Success (`pnpm build`)

### 2. Runtime Quality

- [ ] Console: 0 red errors (T0 + T0+10s)
- [ ] Network: 0 failed 4xx/5xx requests
- [ ] Error boundaries: No hydration errors
- [ ] React: No key warnings, no prop errors

### 3. Layout & Branding

- [ ] Header: Exactly 1 present with Fixzit branding
- [ ] Sidebar: Present and functional
- [ ] Language selector: Visible (flags + native + ISO)
- [ ] Currency selector: Visible (icons)
- [ ] Footer: Present
- [ ] Back-to-Home: Functional link
- [ ] RTL: Arabic (ar_SA) renders correctly

### 4. Functionality

- [ ] Buttons: All linked and navigate correctly
- [ ] Dropdowns: Type-ahead works
- [ ] Forms: Validation works
- [ ] Google Maps: Renders where required
- [ ] Mock data: Present and displays correctly

### 5. Security & Access

- [ ] RBAC: Role-appropriate content displayed
- [ ] Tenant isolation: No cross-org data leaks
- [ ] Authentication: Protected routes enforce auth
- [ ] API: All queries scoped by orgId

### 6. Artifacts (Required for "Clean" Status)

- [ ] T0 screenshot (page load)
- [ ] T0+10s screenshot (after interactions)
- [ ] Console log export (0 errors)
- [ ] Network log export (0 failures)
- [ ] Build output summary
- [ ] Git commit SHA
- [ ] Root-cause note (what was fixed)

---

## 🔄 DAILY AGENT LOOP (Repeatable, Zero Guesswork)

```bash
# 1. Pick next failing page × role from matrix
export PAGE="dashboard" ROLE="admin"

# 2. Run verification to capture T0 artifacts → HALT on first failure
pnpm verify:page --module $PAGE --role $ROLE

# 3. Fix in smallest scope (prefer codemod/leaf change)
# - If TypeScript error: fix type
# - If ESLint warning: fix or suppress with justification
# - If brand violation: replace with token
# - If layout issue: adjust component props only

# 4. Verify no regressions
pnpm typecheck  # Must pass
pnpm lint       # Must pass
pnpm style:scan # Must pass

# 5. Re-run verification
pnpm verify:page --module $PAGE --role $ROLE

# 6. If green: attach artifacts, mark matrix cell ✅ CLEAN
# 7. If red: repeat from step 3
# 8. If regression elsewhere: HALT, fix immediately
```

---

## 🛡️ GUARDRAILS (Keep Speed High, Rework Low)

### 1. No Layout Edits for Fixes

- Use tokens, component props, or small CSS changes ONLY
- No moving/adding/removing DOM elements unless absolutely required
- **Rationale**: Layout freeze prevents scope creep

### 2. Whitelist Palette Only

- Scanner blocks rogue hex before commit
- Any color outside whitelist = automatic CI failure
- **Rationale**: Brand consistency is non-negotiable

### 3. Org-Scoped Everything

- Every DB query MUST include `orgId`
- Block unscoped operations at model layer
- Cache keys MUST include `orgId`
- **Rationale**: Multi-tenant security

### 4. Proof First, Claims Second

- Green harness → attach artifacts → mark "Clean"
- No "looks fixed" or "should work"
- **Rationale**: Objective verification prevents false confidence

---

## 📈 CURRENT STATUS

**TypeScript**: ✅ 0 errors (MAINTAINED)  
**ESLint**: ❌ 423 warnings

- 348 `any` types
- 68 unused variables
- 7 other (React hooks, escapes, etc.)

**Files Manually Edited**: 153  
**Commits This Session**: 3  
**Phase**: Lane A (Static Hygiene) - IN PROGRESS

---

## 🎯 NEXT IMMEDIATE ACTIONS

1. ✅ **Commit current state** (user's 153 file edits)
2. 🔄 **Fix remaining 68 unused variables** (quick win)
3. 🔄 **Fix 7 miscellaneous warnings** (React hooks, escapes)
4. 🔄 **Systematically fix 348 `any` types** (file-by-file)
5. 🔄 **Implement brand scanner** (`scan-hex.js`)
6. 🔄 **Create verification harness** (`verify-page.ts`)
7. 🔄 **Setup CI gate** (`.github/workflows/ci.yml`)

**Estimated Time to 0 Warnings**: 35-40 hours (with STRICT framework automation)

---

## 📋 REFERENCES

- STRICT v4 Framework
- Final Master Instruction
- Governance Rules
- Design System Spec
- Blueprint Architecture
- Verification Checklist

**Last Updated**: October 9, 2025  
**Framework Version**: 1.0.0  
**Compliance**: 100% STRICT governance
