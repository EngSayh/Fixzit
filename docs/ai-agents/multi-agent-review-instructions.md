# Multi-Agent PR Review Instructions

**Version**: 1.0  
**Last Updated**: 2025-11-24  
**Source**: Extracted from PR #323  
**Purpose**: Standardized instructions for coordinating multiple AI code review agents

---

## Overview

This document provides a comprehensive, production-grade PR review instruction template for coordinating multiple AI code review agents to ensure zero-error, zero-warning delivery across the Fixzit system.

## Target Agents

- @codex review
- @CodeRabbit review
- @copilot review
- @gemini-code-assist review
- @qodo-merge-pro review

## Usage

Copy the template below and paste it as a PR comment to invoke all agents with consistent, system-aware review criteria.

---

---

@codex review
@CodeRabbit review
@copilot review
@gemini-code-assist review
@qodo-merge-pro review

# System-Aware PR Review — ZERO-TOLERANCE (NO EXCEPTIONS)

## Capability Modes

**Mode A (write/exec permitted)**: You have repository write access and can execute commands, apply fixes, run tests, and push commits directly.

**Mode B (read-only/diff-only)**: You can read the codebase but cannot execute or push. You MUST still provide:
- Corrected code blocks (BEFORE → AFTER)
- Patch-ready unified diffs (```diff blocks)
- A complete push-summary body that the PR author can paste after manually applying your fixes

**In Mode B, you may NOT refuse to provide fixes.** Generate all corrected code, diffs, and artifacts as if you were pushing them yourself.

---

## 0) Missed Comments Inventory — LIST THESE FIRST

**Command (best-effort)**:
```bash
gh pr view --json comments,reviews --jq '.comments[],.reviews[].comments[]? | select(.author.login != "github-actions") | {id: .id, author: .author.login, body: .body, url: .url}'
```

**Top-of-reply table** (populate with actual data from the PR):

| Link | Commenter | Key Ask | Category | Status | Patch Ref / Evidence | Repeat/New |
|------|-----------|---------|----------|--------|---------------------|------------|
| [#comment-1](URL) | username | description | i18n/accessibility/etc | Missed/Addressed | file.ts:L42 or "see diff below" | Repeat |
| [#comment-2](URL) | username | description | category | Missed/Addressed | evidence | New |

**Hard rule**: Every item marked **Missed** MUST be fixed in THIS reply with corrected code + diffs below.

---

## 1) Corrected Code (REQUIRED) — BEFORE → AFTER + Diff

For **each fix** (missed comment, gate violation, or quality issue):

### Fix 1: [Brief Description]
**File**: `path/to/file.ext`

**BEFORE** (exact code with surrounding context):
```typescript
// exact original code block
// include 2-3 lines of context before and after
// so the patch location is unambiguous
```

**AFTER** (full corrected code of the same scope):
```typescript
// complete corrected code block
// same scope as BEFORE
// all fixes applied
```

**DIFF**:
```diff
--- a/path/to/file.ext
+++ b/path/to/file.ext
@@ -10,3 +10,3 @@
-  const oldCode = 'remove';
+  const newCode = 'add';
```

**OPTIONAL REFACTOR DIFF** (only if absolutely necessary for maintainability):
```diff
--- a/path/to/another-file.ext
+++ b/path/to/another-file.ext
...
```

Repeat this block for **every fix**.

---

## 2) Zero-Tolerance System Gates (ALL must be GREEN)

Provide evidence + code/diffs for each relevant gate. If you cannot run commands, return text artifacts and ready-to-apply diffs.

### A) Translations & RTL (EN + AR)

**Missing i18n Keys**:
- List keys used in code but missing from `locales/en.json` and `locales/ar.json`.
- Provide diffs adding EN/AR entries.

**Unused i18n Keys**:
- List keys in locale files never referenced in code.
- Provide diffs removing them.

**Hard-coded Strings**:
- List all hard-coded user-facing strings in touched files.
- Provide diffs replacing with `t('key.path')` and corresponding locale file diffs.

**RTL Logic**:
- For UI changes, verify `dir="rtl"` conditional rendering, `start`/`end` instead of `left`/`right`, mirrored icons.
- Provide code diffs fixing RTL issues.

**Evidence**:
```bash
# Example commands to run
rg -n "['\"](Hello|Welcome|Submit|Error)" --type=tsx --type=ts
rg -n "t\(['\"]([a-zA-Z0-9_.]+)" -o | sort | uniq
```

---

### B) Endpoints ↔ OpenAPI (two-way drift)

**For every touched API handler** (routes, controllers):

1. **OpenAPI 3.0 YAML snippet** for the endpoint:
```yaml
paths:
  /api/v1/resource:
    post:
      summary: Create resource
      security:
        - bearerAuth: []
      parameters:
        - in: header
          name: X-Tenant-ID
          required: true
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ResourceCreateRequest'
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Resource'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
```

2. **Example request/response**:
```json
// Request
POST /api/v1/resource
Headers: { "Authorization": "Bearer <token>", "X-Tenant-ID": "tenant123" }
Body: { "name": "Example", "type": "standard" }

// Response 201
{ "id": "res_123", "name": "Example", "type": "standard", "createdAt": "2025-11-23T10:00:00Z" }
```

3. **Drift Fixes**:
   - **Route in code not in spec**: Provide OpenAPI diff adding the path.
   - **Spec path not implemented**: Provide code diff implementing the handler.

---

### C) MongoDB Atlas (non-prod only)

**Validate** `MONGODB_URI` and connection options:
- Must use `mongodb+srv://`
- TLS enabled
- `retryWrites=true`
- Timeouts (`serverSelectionTimeoutMS`, `socketTimeoutMS`)
- Connection pool config (`maxPoolSize`, `minPoolSize`)
- **No hard-coded credentials** in code or `.env` committed to repo

**If weak/missing**, provide:

**ENV diff** (`.env.example` or docs):
```diff
--- a/.env.example
+++ b/.env.example
@@ -1,1 +1,1 @@
-MONGODB_URI=mongodb://localhost:27017/fixzit
+MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/fixzit?retryWrites=true&w=majority&tls=true&serverSelectionTimeoutMS=5000&socketTimeoutMS=60000&maxPoolSize=50&minPoolSize=10
```

**Connection options diff** (e.g., `lib/mongodb.ts`):
```diff
--- a/lib/mongodb.ts
+++ b/lib/mongodb.ts
@@ -5,0 +6,8 @@
+const options: MongoClientOptions = {
+  maxPoolSize: 50,
+  minPoolSize: 10,
+  serverSelectionTimeoutMS: 5000,
+  socketTimeoutMS: 60000,
+  retryWrites: true,
+  tls: true,
+};
```

---

### D) RBAC & Tenancy

**Least-privilege guards**:
- Every protected route MUST verify user permissions (`hasPermission(user, 'resource:action')`).
- Every multi-tenant resource MUST scope queries by `tenantId`.

**Inline diffs** for:
1. Missing permission checks in handlers.
2. Missing tenant scoping in DB queries.

**Negative test suggestion** (≥1):
```typescript
// Test: User without permission should get 403
it('should reject user without resource:create permission', async () => {
  const response = await request(app)
    .post('/api/v1/resource')
    .set('Authorization', `Bearer ${unprivilegedToken}`)
    .send({ name: 'Test' });
  expect(response.status).toBe(403);
});

// Test: User should not see resources from other tenants
it('should not return resources from other tenants', async () => {
  const response = await request(app)
    .get('/api/v1/resources')
    .set('Authorization', `Bearer ${tenant1Token}`);
  expect(response.body.every(r => r.tenantId === 'tenant1')).toBe(true);
});
```

---

### E) Duplication & Code Health

**Detect clones**:
- Identify repeated blocks (>5 lines) within or across files in the PR.
- Propose de-duplication: extract to shared function/utility.

**De-dup diff**:
```diff
--- a/utils/helpers.ts
+++ b/utils/helpers.ts
@@ -0,0 +1,5 @@
+export function formatCurrency(amount: number, currency: string = 'SAR'): string {
+  return new Intl.NumberFormat('ar-SA', { style: 'currency', currency }).format(amount);
+}

--- a/pages/invoice.tsx
+++ b/pages/invoice.tsx
@@ -10,3 +10,1 @@
-  const formatted = new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(amount);
+  const formatted = formatCurrency(amount);
```

**Zero warnings**:
- Run `lint`, `typecheck`, `prettier check` with `--max-warnings=0`.
- Provide diffs fixing ALL lint/type/format issues.

**Complexity**:
- If cyclomatic complexity >10, refactor and provide diff.

---

### F) Workflow Optimization (CI)

For `.github/workflows/**` files, ensure:

1. **Concurrency group** (cancel in-progress runs):
```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

2. **Node package cache** (pnpm/npm/yarn):
```yaml
- name: Setup Node
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'pnpm'  # or 'npm' or 'yarn'
```

3. **Least-privilege permissions**:
```yaml
permissions:
  contents: read
  pull-requests: write  # only if needed
```

4. **Artifact hygiene** (retention, paths):
```yaml
- name: Upload artifacts
  uses: actions/upload-artifact@v4
  with:
    name: build-output
    path: dist/
    retention-days: 7
```

**Provide YAML diffs** for any missing optimizations.

---

### G) Error UX, Accessibility, Performance, Theme

#### Error UX

**Standardize error object** across all API responses:
```typescript
interface StandardError {
  name: string;           // e.g., 'ValidationError'
  code: string;           // e.g., 'INVALID_EMAIL'
  userMessage: string;    // EN/AR translated message for end-users
  devMessage: string;     // Technical details for developers
  correlationId: string;  // For support tracing
}
```

**UI enhancements** (for client errors):
- Copy-to-clipboard button for error details.
- "Create Support Ticket" button (if applicable).

**Provide diffs** for handlers and UI components.

#### Accessibility

**Fix**:
- Missing ARIA labels (`aria-label`, `aria-labelledby`, `aria-describedby`).
- Tab order issues (`tabIndex`).
- Color contrast fails (WCAG AA: ≥4.5:1 for text, ≥3:1 for UI components).

**Evidence** (paste summary or commands + expected results):
```bash
# Run axe-core on affected pages
npm run test:a11y -- --url=http://localhost:3000/page

# Expected: 0 violations, Lighthouse accessibility score ≥ 95
```

**Provide diffs** fixing violations.

#### Performance

**Eliminate N+1 queries**:
- Batch DB queries, use aggregation pipelines.
- Add `select` projections to reduce payload.

**Pagination/limits**:
- All list endpoints MUST support `?page=1&limit=50`.
- Default limit ≤ 100.

**Caching** (for hot paths):
- Add in-memory cache for frequently accessed data (plan a centralized cache if multi-node scale is required).

**Provide diffs** for optimizations.

#### Theme

**Ensure consistency**:
- Header, footer, sidebar, top bar use project design tokens.
- Brand colors: `#0061A8` (primary), `#00A859` (success), `#FFB400` (warning).
- Layout freeze: single header/sidebar baseline.

**Provide code diffs** aligning with theme standards.

---

### H) Saudi Compliance (where applicable)

For finance/invoicing features, ensure:

**ZATCA e-invoice**:
- Required fields: seller/buyer info, invoice number, date, line items, VAT breakdown, total.
- QR code generation (TLV format).
- Invoice archival (7 years).

**VAT**:
- Rates: 15% standard (verify edge cases: 0% exports, exempt categories).
- Rounding rules (2 decimals, half-up).
- Credit notes (reverse VAT).

**Settlement/refund/receipt checklist**:
- Settlement: payment method, date, reference.
- Refund: original invoice reference, reason, VAT reversal.
- Receipt: customer copy with all ZATCA fields.

**Provide evidence** (code diffs, validation logic, test cases).

---

## 3) Tests (impacted only)

**List** all test files impacted by this PR's changes.

**For each**:
- If test file exists in PR: provide diffs.
- If test file does NOT exist in PR: provide **exact file path** + **test name** + **assertions**.

**Example** (new test file):
```typescript
// tests/api/resource.test.ts
import request from 'supertest';
import app from '@/app';

describe('POST /api/v1/resource', () => {
  it('should create resource with valid data', async () => {
    const response = await request(app)
      .post('/api/v1/resource')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Tenant-ID', 'tenant123')
      .send({ name: 'Test Resource', type: 'standard' });
    
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Test Resource');
  });

  it('should reject creation without permission', async () => {
    const response = await request(app)
      .post('/api/v1/resource')
      .set('Authorization', `Bearer ${readOnlyToken}`)
      .send({ name: 'Test' });
    
    expect(response.status).toBe(403);
  });
});
```

**Unit tests**: Cover new functions, edge cases, error paths.  
**E2E tests**: Cover critical user journeys (login → action → verify).  
**Contract tests**: For API changes, verify OpenAPI spec compliance.

---

## 4) PR-Scoped Scorecard (JSON)

```json
{
  "fixzit_pr_scorecard": {
    "sections": {
      "security_privacy": {
        "points": 100,
        "scored": 100,
        "notes": "No secrets in code, RBAC enforced, tenant scoping verified.",
        "evidence": ["lib/auth.ts#L45", "api/resources/create.ts#L12"]
      },
      "api_contracts": {
        "points": 100,
        "scored": 100,
        "notes": "All endpoints documented in OpenAPI, no drift detected.",
        "evidence": ["docs/openapi.yaml#L120-L150"]
      },
      "tenancy_rbac": {
        "points": 100,
        "scored": 100,
        "notes": "All queries scoped by tenantId, permission checks in place.",
        "evidence": ["api/resources/list.ts#L8", "middleware/auth.ts#L23"]
      },
      "i18n_rtl": {
        "points": 100,
        "scored": 95,
        "notes": "1 hard-coded string replaced, RTL verified. 5 points deducted for missing AR translation key 'error.validation'.",
        "evidence": ["locales/en.json#L45", "components/Form.tsx#L12"]
      },
      "accessibility": {
        "points": 100,
        "scored": 100,
        "notes": "All ARIA labels added, contrast verified, Lighthouse score 98.",
        "evidence": ["components/Button.tsx#L5", "lighthouse-report.json"]
      },
      "performance": {
        "points": 100,
        "scored": 100,
        "notes": "N+1 eliminated, pagination added, caching implemented.",
        "evidence": ["api/resources/list.ts#L15-L20"]
      },
      "error_ux": {
        "points": 100,
        "scored": 100,
        "notes": "Standard error format applied, copy-to-clipboard added.",
        "evidence": ["lib/errors.ts#L10", "components/ErrorDisplay.tsx#L8"]
      },
      "theme": {
        "points": 100,
        "scored": 100,
        "notes": "Brand tokens used, layout baseline maintained.",
        "evidence": ["components/Header.tsx#L3", "styles/theme.ts#L5"]
      },
      "code_health": {
        "points": 100,
        "scored": 100,
        "notes": "Duplication removed, zero lint/type warnings, complexity <10.",
        "evidence": ["utils/helpers.ts#L1", "lint-report.txt"]
      },
      "testing": {
        "points": 100,
        "scored": 100,
        "notes": "Unit, E2E, and contract tests added. Coverage >80%.",
        "evidence": ["tests/api/resource.test.ts", "coverage-summary.json"]
      },
      "docs_contracts": {
        "points": 100,
        "scored": 100,
        "notes": "Requirements cited correctly, no conflicts.",
        "evidence": ["docs/requirements/000-index.md#Architecture"]
      },
      "ux_consistency": {
        "points": 100,
        "scored": 100,
        "notes": "Layout freeze respected, EN+AR verified.",
        "evidence": ["pages/dashboard.tsx#L10"]
      }
    },
    "must_pass": {
      "security_privacy": {
        "status": "pass",
        "notes": "All security checks green."
      },
      "saudi_compliance": {
        "status": "pass",
        "notes": "ZATCA fields verified, VAT logic correct."
      },
      "api_contracts": {
        "status": "pass",
        "notes": "OpenAPI drift resolved."
      },
      "i18n_rtl": {
        "status": "fail",
        "notes": "Missing AR key 'error.validation'. FIX: Added in locales/ar.json#L45."
      },
      "accessibility": {
        "status": "pass",
        "notes": "All ARIA/contrast issues resolved."
      },
      "single_final_delivery": {
        "status": "pass",
        "notes": "All fixes provided in this reply with diffs."
      }
    },
    "final_self_score": 95,
    "blockers": [
      "locales/ar.json:45 — Missing translation key 'error.validation' (FIXED in this reply)"
    ],
    "notes": "Score is 95/100 due to 1 missing AR translation key. After applying the provided diff, score will be 100/100. All prior comments addressed. Zero warnings in lint/type/format checks."
  }
}
```

**Rule**: `final_self_score = 100` ONLY when:
1. All prior PR comments are addressed (see section 0).
2. All gates are GREEN with **ZERO WARNINGS**.
3. All fixes provided in THIS reply with corrected code + diffs.

If score <100, list precise blockers with `file:line` and state how they are fixed in this reply.

---

## 5) Mode A — Execute, Push, and Post Summary on THIS PR

### Command Matrix (monorepo-safe, auto-detect package manager)

```bash
#!/bin/bash
set -e

# Detect package manager
if [ -f "pnpm-lock.yaml" ]; then
  PKG_MGR="pnpm"
  INSTALL="pnpm install --frozen-lockfile"
  RUN="pnpm run"
elif [ -f "yarn.lock" ]; then
  PKG_MGR="yarn"
  INSTALL="yarn install --frozen-lockfile"
  RUN="yarn"
elif [ -f "package-lock.json" ]; then
  PKG_MGR="npm"
  INSTALL="npm ci"
  RUN="npm run"
else
  echo "No lock file found, defaulting to npm"
  PKG_MGR="npm"
  INSTALL="npm install"
  RUN="npm run"
fi

echo "Using package manager: $PKG_MGR"

# 1. Install dependencies
$INSTALL

# 2. Lint (max-warnings=0)
$RUN lint -- --max-warnings=0

# 3. Typecheck
$RUN typecheck

# 4. Format check
$RUN prettier:check

# 5. Tests
$RUN test

# 6. Build Next.js (if applicable)
if [ -f "next.config.js" ] || [ -f "next.config.mjs" ]; then
  $RUN build
  # Optional: export static
  # $RUN export
fi

# 7. OpenAPI export (if script exists)
if grep -q '"openapi:export"' package.json; then
  $RUN openapi:export
fi

# 8. Postman collection export (if script exists)
if grep -q '"postman:export"' package.json; then
  $RUN postman:export
fi

# 9. RBAC export (if script exists)
if grep -q '"rbac:export"' package.json; then
  $RUN rbac:export
fi

# 10. Lighthouse CI (if configured)
if [ -f "lighthouserc.json" ]; then
  npx lhci autorun
fi

# 11. Dependency audit
$PKG_MGR audit --audit-level=moderate

echo "✅ All checks passed"
```

### After Push: Post PR Summary

**Title**: `Agent Fix Summary — Push <n> (commit <sha>)`

**Body**:
```markdown
## Agent Fix Summary — Push 1 (commit abc1234)

### Missed Comments Resolved
- [#comment-1](URL): Added AR translation key `error.validation` → `locales/ar.json:45`
- [#comment-2](URL): Fixed RTL icon mirroring → `components/Icon.tsx:12`

### Files Changed
- `locales/ar.json` (+2 lines)
- `components/Icon.tsx` (+5, -3 lines)
- `api/resources/create.ts` (+10, -5 lines)
- `tests/api/resource.test.ts` (new file, +45 lines)

### Gate Status
✅ Security & Privacy  
✅ API Contracts  
✅ Tenancy & RBAC  
✅ i18n & RTL (was ⚠️, now fixed)  
✅ Accessibility  
✅ Performance  
✅ Error UX  
✅ Theme  
✅ Code Health  
✅ Testing  
✅ Saudi Compliance  

### Scorecard Delta
- **Before**: 95/100 (missing AR key)
- **After**: 100/100 (all gates green, zero warnings)

### Repeat vs New Classification
- **Repeat issues**: 0
- **New issues found & fixed**: 2 (AR key, RTL icon)

### Not Done Yet
- None. All items addressed in this push.

---
Self-score: **100/100** ✅
```

---

## 6) Final Challenge — Pre-Push Self-Check (MUST PASS)

Before marking complete, re-review against:

1. **Full system design & scope**: Does this change fit within Fixzit's architecture (FM, Souq, Shared, Admin, CRM, HR, Finance, Content, Careers, Knowledge Center, Error UX, Theme)?
2. **Module behavior**: Are all touched modules tested and integrated correctly?
3. **Endpoints detail**: Are all API changes documented in OpenAPI with examples?
4. **Atlas config**: Is MongoDB connection production-grade (non-prod)?
5. **Theme**: Do all UI changes use project tokens and respect layout freeze?
6. **i18n/RTL**: Are all user-facing strings translated to EN+AR with RTL support?
7. **E2E impact**: Are critical user journeys still functional?
8. **Duplication removal**: Are all clones extracted to shared utilities?
9. **Workflow optimization**: Are CI workflows optimized (concurrency, cache, permissions)?
10. **Zero-warning quality gates**: Do lint, typecheck, prettier, tests, build ALL pass with zero warnings?

**Self-score**:
- If ALL items above are verified and ALL prior comments are addressed: **100/100** ✅
- If ANY item is incomplete: **<100** and ADD CORRECTED CODE + DIFFS NOW until 100/100.

**Blockers** (if <100):
- List each blocker as `file:line — description (STATUS: fixed/in-progress)`

**Repeat until self-score = 100/100.**

---

## Global Rules

1. **No placeholders**: Only clearly marked external competitor fields in `docs/pricing.md` are allowed.
2. **Minimal diffs**: Make surgical changes; avoid rewriting unrelated code.
3. **Stable interfaces**: Do not break existing APIs unless absolutely necessary (and document breaking changes).
4. **Cite requirements**: Reference as `docs/requirements/<file>.md#<Heading>`.
5. **Conflicts**: If requirements conflict, include ONE doc diff (prefer `docs/requirements/000-index.md`) with rationale.

---

**END OF INSTRUCTION**

---

This is your copy-pasteable consolidated PR comment. Post it on any Fixzit PR to instruct the 5 agents to perform a comprehensive, zero-tolerance review.
