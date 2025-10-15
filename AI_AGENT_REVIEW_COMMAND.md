# Consolidated AI Agent Review Command for PRs

## ONE-SHOT PR COMMENT — All Agents (Zero-Tolerance, System-Aware)

Paste this **once** on any PR:

```
@cursor review
@codex review
@CodeRabbit review
@copilot review
@gemini-code-assist review
@qodo-merge-pro review
@greptile review

# Cursor — Zero‑Tolerance PR Test & Review (system‑aware; NO EXCEPTIONS)

## Modes
- **Mode A (write/exec):** run checks, apply minimal fixes, push, post summary on THIS PR
- **Mode B (read‑only):** reply with **corrected code blocks** + **patch‑ready diffs** + **push‑summary body**. NO REFUSALS.

## System Scope (NO EXCEPTIONS)
**Fixzit Full Stack**: FM + Souq + Shared Services + Admin/Console + CRM + HR + Corporate Finance + Content/Policy + Careers/ATS + Knowledge Center + Error UX + **HTML Theme (Header/Footer/Sidebar/Top Bar)**

**UX**: EN + AR with RTL  
**DB**: MongoDB Atlas (staging/CI only - NO PROD)  
**Requirements**: `/docs/requirements/000-index.md`, `/docs/requirements/020-chat-digests/**`  
**CI Artifacts**: Use `fixzit-artifacts` when available

## Zero-Tolerance Gates (ALL MUST BE GREEN)
✅ Security/Privacy (OWASP; no hard-coded creds)  
✅ Saudi Compliance (ZATCA/VAT/Payments)  
✅ API Contracts (OpenAPI 3.0+ complete)  
✅ Translations (EN + AR; 100% coverage; RTL validated)  
✅ Endpoints ↔ OpenAPI (two-way alignment)  
✅ MongoDB Atlas (SRV URI + TLS + options)  
✅ RBAC/Tenancy (guards + isolation tests)  
✅ Accessibility (axe/Lighthouse ≥0.95)  
✅ Performance (LCP ≤2.5s; API P99 ≤500ms)  
✅ Theme Consistency (header/footer/sidebar/top bar)  
✅ No Duplication (clone detection)  
✅ Workflow Optimization (concurrency/cache/permissions)  
✅ Error UX Standardization  
✅ **Zero Warnings** (treat warnings as errors)  
✅ Single Final Delivery (NO TODOs/placeholders)

────────────────────────────────────────────────────────────────────────

## 0) FIRST: Missed Comments Inventory
Parse ALL prior PR comments (humans + agents). Output this table FIRST:

| Link | Commenter | Key Ask | Category | Status | Patch Ref | Repeat/New |
|------|-----------|---------|----------|--------|-----------|------------|
| ... | ... | ... | ... | Missed/Addressed | ... | [Repeat]/[New] |

**RULE**: Every "Missed" item MUST be fixed in this reply with corrected code + diffs.

────────────────────────────────────────────────────────────────────────

## 1) Corrected Code (REQUIRED) - BEFORE → AFTER

For EACH file you're changing:

### BEFORE:
\`\`\`ts
// FILE: path/to/file.ts (BEFORE)
// Show exact current code with context
\`\`\`

### AFTER:
\`\`\`ts
// FILE: path/to/file.ts (AFTER)
// Show fully corrected, compilable code
\`\`\`

### DIFF:
\`\`\`diff
--- a/path/to/file.ts
+++ b/path/to/file.ts
@@ ... @@
// Minimal, idempotent git-apply ready diff
\`\`\`

────────────────────────────────────────────────────────────────────────

## 2) System-Wide Verification Checklist

For each fix, verify and provide evidence:

### A) Translations & i18n/RTL
- [ ] Missing keys detected (EN + AR)
- [ ] Unused keys removed
- [ ] Hard-coded strings replaced with i18n keys
- [ ] RTL logical properties verified
- [ ] Provide: updated locale JSON files

### B) Endpoints ↔ OpenAPI
- [ ] All touched endpoints documented in OpenAPI
- [ ] OpenAPI paths match actual routes (two-way)
- [ ] Request/response schemas complete
- [ ] Example requests/responses provided
- [ ] Status codes + error codes documented
- [ ] Provide: OpenAPI 3.0 YAML snippets

### C) MongoDB Atlas Configuration
- [ ] MONGODB_URI uses `mongodb+srv://` scheme
- [ ] TLS enabled (`tls=true`)
- [ ] RetryWrites enabled (`retryWrites=true`)
- [ ] Write concern set (`w=majority`)
- [ ] Timeouts configured (serverSelection, socket)
- [ ] Connection pool sized (`maxPoolSize`)
- [ ] NO hard-coded credentials in code or env
- [ ] Provide: connection options diff

### D) RBAC & Tenancy
- [ ] Least-privilege guards on touched endpoints
- [ ] Tenant scoping enforced
- [ ] Multi-tenant isolation verified
- [ ] Negative tests proposed
- [ ] Role matrix updated
- [ ] Provide: guard diffs + RBAC CSV updates

### E) Duplication Detection
- [ ] Code clones identified in touched areas
- [ ] Duplicates de-duped into shared utilities
- [ ] Provide: de-dup diffs

### F) Workflow Optimization
- [ ] Concurrency groups added
- [ ] Node package cache enabled (pnpm/npm/yarn)
- [ ] Least-privilege permissions set
- [ ] Artifact hygiene (proper upload/retention)
- [ ] Provide: GitHub Actions YAML diffs

### G) Theme & Layout
- [ ] Header uses theme tokens
- [ ] Footer uses theme tokens
- [ ] Sidebar uses theme tokens
- [ ] Top bar uses theme tokens
- [ ] Responsive behavior maintained
- [ ] Provide: component diffs

### H) Error UX
- [ ] Standard error object: `{name, code, userMessage, devMessage, correlationId}`
- [ ] Copy-to-clipboard functionality
- [ ] Create-Ticket prefill data
- [ ] User-friendly error messages
- [ ] Provide: error handling diffs

### I) Accessibility
- [ ] ARIA labels added
- [ ] Tab order correct
- [ ] Contrast ratios pass
- [ ] Keyboard navigation works
- [ ] axe/Lighthouse score ≥0.95
- [ ] Provide: a11y test results

### J) Performance
- [ ] No N+1 queries
- [ ] Pagination/limits added
- [ ] Caching headers set
- [ ] Hot paths optimized
- [ ] LCP ≤2.5s, API P99 ≤500ms
- [ ] Provide: performance test results

### K) Saudi Compliance
- [ ] ZATCA e-invoice fields (where applicable)
- [ ] VAT rates/rounding correct
- [ ] Payment flow validated
- [ ] Provide: compliance checklist

### L) Tests
- [ ] Unit tests for new code
- [ ] E2E tests for changed flows
- [ ] Contract tests for API changes
- [ ] Coverage ≥90% on critical paths
- [ ] Provide: test diffs or exact file stubs

────────────────────────────────────────────────────────────────────────

## 3) PR Comment Coverage Table

Scan ALL existing PR comments. For each:

| Comment Link | Commenter | Issue | Status | Your Fix | Repeat/New |
|--------------|-----------|-------|--------|----------|------------|
| #comment-123 | @user | Fix type error | Addressed | See diff #1 | [Repeat] |
| #comment-456 | @bot | Add i18n | Missed | Will fix now | [New] |

**For [Repeat] issues**: Propose root-cause fix, not just symptom

────────────────────────────────────────────────────────────────────────

## 4) Task List

Provide `TASKS.md` with checkboxes:

- [ ] Fix security issue X
- [ ] Add i18n key Y
- [ ] Update endpoint Z in OpenAPI
- ...

And `tasks.json` (machine-readable)

────────────────────────────────────────────────────────────────────────

## 5) PR-Scoped Scorecard (JSON)

\`\`\`json
{
  "sections": [
    {"key": "security_privacy", "points": 10, "scored": 0, "notes": "", "evidence": []},
    {"key": "translations_i18n_rtl", "points": 10, "scored": 0, "notes": "", "evidence": []},
    {"key": "endpoints_openapi", "points": 10, "scored": 0, "notes": "", "evidence": []},
    {"key": "mongodb_atlas", "points": 10, "scored": 0, "notes": "", "evidence": []},
    {"key": "rbac_tenancy", "points": 10, "scored": 0, "notes": "", "evidence": []},
    {"key": "duplication", "points": 5, "scored": 0, "notes": "", "evidence": []},
    {"key": "workflows", "points": 5, "scored": 0, "notes": "", "evidence": []},
    {"key": "theme_layout", "points": 10, "scored": 0, "notes": "", "evidence": []},
    {"key": "error_ux", "points": 5, "scored": 0, "notes": "", "evidence": []},
    {"key": "accessibility", "points": 10, "scored": 0, "notes": "", "evidence": []},
    {"key": "performance", "points": 10, "scored": 0, "notes": "", "evidence": []},
    {"key": "saudi_compliance", "points": 5, "scored": 0, "notes": "", "evidence": []}
  ],
  "must_pass": [
    {"key": "security_privacy", "status": "pass", "notes": "All XSS risks mitigated"},
    {"key": "translations_complete", "status": "pass", "notes": "EN+AR 100%"},
    {"key": "endpoints_documented", "status": "pass", "notes": "OpenAPI complete"},
    {"key": "mongodb_secure", "status": "pass", "notes": "SRV+TLS+options"},
    {"key": "zero_warnings", "status": "pass", "notes": "ESLint/TS/Prettier clean"}
  ],
  "final_self_score": 100
}
\`\`\`

**Set final_self_score=100 ONLY when:**
- All prior comments addressed
- All gates green
- Zero warnings remain
- Complete system verification done

────────────────────────────────────────────────────────────────────────

## 6) Pre-Push Self-Check (MUST PASS before pushing)

Answer these honestly. If ANY answer is "No", add fixes now:

1. **System Design**: Did you consider the full scope? ☐ Yes ☐ No
2. **Module Behavior**: Did you document behavior changes? ☐ Yes ☐ No
3. **Endpoints**: Are all endpoints detailed? (method/path/auth/params/schemas/codes) ☐ Yes ☐ No
4. **Database**: Verified MongoDB Atlas config? (SRV/TLS/options/no-creds) ☐ Yes ☐ No
5. **Theme**: Header/Footer/Sidebar/Top Bar use tokens? ☐ Yes ☐ No
6. **i18n/RTL**: EN+AR complete? RTL validated? ☐ Yes ☐ No
7. **Not Narrow**: Fix considers whole system, not just one file? ☐ Yes ☐ No
8. **E2E Impact**: Validated no regressions? ☐ Yes ☐ No
9. **Missed Anything**: Reviewed all comments? ☐ Yes ☐ No
10. **Self-Score**: Rate your output /100: _____

**If score <100, complete NOW until 100**

────────────────────────────────────────────────────────────────────────

## 7) Mode A - Execute & Push

If you can execute, run:

\`\`\`bash
# Auto-detect package manager
(corepack enable 2>/dev/null || true)
PKG=$(command -v pnpm &>/dev/null && echo "pnpm" || command -v npm &>/dev/null && echo "npm" || echo "yarn")

# Install
$PKG install --frozen-lockfile 2>/dev/null || $PKG ci 2>/dev/null || $PKG install

# Quality gates (zero warnings)
$PKG lint --max-warnings=0 || $PKG run lint --max-warnings=0
$PKG typecheck || $PKG run typecheck
npx -y prettier -c .

# Tests
$PKG test || $PKG run test

# Build
$PKG build || $PKG run build

# Contracts
$PKG run openapi:build || true
$PKG run postman:export || true
$PKG run rbac:export || true

# Accessibility
npx -y @lhci/cli autorun --collect.staticDistDir=apps/web/out --upload.target=filesystem --upload.outputDir=lhci_reports || true

# Audit
mkdir -p .artifacts
$PKG audit --json > .artifacts/dep-audit.json || true

# Scorecard
echo '{"sections":[],"must_pass":[],"final_self_score":0}' > .artifacts/fixzit_pr_scorecard.json
\`\`\`

Then:
1. Create branch `fix/agent-gates-$(date +%Y%m%d-%H%M%S)`
2. Apply your diffs
3. Re-run commands
4. Commit: `chore: satisfy zero-tolerance gates`
5. Push
6. Post summary (see template below)

────────────────────────────────────────────────────────────────────────

## 8) After Each Push - Summary Template

Post this on THIS PR after every push (edit last summary if it exists):

\`\`\`markdown
## Agent Fix Summary — Push <n> (commit <short-sha>)

### Missed Comments (Now Resolved)
- [#comment-123](#) - Fixed type error → See diff in file.ts
- [#comment-456](#) - Added i18n key → See locales/en.json

### Files Changed
- \`path/to/file1.ts\` - Fixed security issue
- \`path/to/file2.tsx\` - Added ARIA labels
- \`locales/en.json\` - Added missing keys
- \`locales/ar.json\` - Added missing keys
- \`openapi.yaml\` - Updated endpoint schemas

### Gate Status
| Gate | Status | Evidence |
|------|--------|----------|
| Security/Privacy | ✅ | No XSS; creds in secrets |
| Translations (EN+AR) | ✅ | 100% coverage |
| Endpoints↔OpenAPI | ✅ | All aligned |
| MongoDB Atlas | ✅ | SRV+TLS+options |
| RBAC/Tenancy | ✅ | Guards added |
| Duplication | ✅ | Clones removed |
| Workflows | ✅ | Optimized |
| Theme | ✅ | Tokens applied |
| Error UX | ✅ | Standardized |
| Accessibility | ✅ | Score: 0.96 |
| Performance | ✅ | LCP: 2.1s, P99: 450ms |
| Zero Warnings | ✅ | ESLint/TS/Prettier clean |

### Scorecard Delta
- Before: final_self_score = 85
- After: final_self_score = **100**

### Issue Classification
- **[Repeat]** (3): Root cause fixed - poor error handling pattern
- **[New]** (2): Discovered during review - missing translations

### Not Done Yet
- ☐ None - all items complete

### Artifacts
- OpenAPI: \`.artifacts/openapi.yaml\`
- Postman: \`.artifacts/postman_collection.json\`
- RBAC: \`.artifacts/rbac-matrix.csv\`
- Scorecard: \`.artifacts/fixzit_pr_scorecard.json\`
\`\`\`

────────────────────────────────────────────────────────────────────────

## 9) Pre-Push Challenge Questions

Answer these honestly BEFORE pushing. If ANY is "No" or "<100", fix NOW:

**System Completeness:**
- ☑ Did you consider the **full system scope**? (FM+Souq+Shared+Admin+...)
- ☑ Did you include **system behavior** for the module?
- ☑ Did you **detail endpoints** (method/path/auth/params/schemas/codes)?
- ☑ Did you verify **DB access** to MongoDB Atlas (no prod)?
- ☑ Did you consider the **theme** (header/footer/sidebar/top bar)?
- ☑ Did you verify **sidebar, top bar, and footer** consistency?

**Fix Quality:**
- ☑ Is your fix **system-aware** (not narrow/isolated)?
- ☑ Did you consider the **e2e relationship** with the system?
- ☑ Did you **prevent regressions** in other parts?
- ☑ Did your fix **enhance** the code, not just patch it?

**Completeness:**
- ☑ Did you **review ALL comments** from this PR?
- ☑ Did you **fix ALL missed items**?
- ☑ Did you check for **duplicate/repeat errors** system-wide?
- ☑ Did you miss **anything**?

**Self-Assessment:**
- **Rate your output /100**: _____
- **If <100**: What's missing? Fix it NOW before pushing.

────────────────────────────────────────────────────────────────────────

## 10) Rules (NO EXCEPTIONS)

- ❌ NO placeholders (except clearly marked `docs/pricing.md` external fields)
- ❌ NO narrow fixes (think whole system)
- ❌ NO warnings tolerated (warnings = errors)
- ❌ NO "will do later" (complete it NOW)
- ❌ NO breaking adjacent code
- ❌ NO ignoring any type of issue
- ✅ YES minimal diffs (stable interfaces)
- ✅ YES cite requirements (`docs/requirements/<file>.md#<Heading>`)
- ✅ YES corrected code for EVERY file changed
- ✅ YES complete build (not fragmented)
- ✅ YES 100/100 score or keep fixing

────────────────────────────────────────────────────────────────────────

Proceed NOW and reply with ONE consolidated message containing everything above.
\`\`\`

---

## How to Use This Command

1. **Copy the entire block above** (including the triple backticks)
2. **Paste it as a comment** on any PR
3. **All agents will be triggered** simultaneously
4. **They must follow the rules** - no exceptions
5. **Review their responses** - they should provide:
   - Missed comments table
   - Before/After code for every fix
   - All verification checklists complete
   - Scorecard with 100/100 or incomplete items listed

## What This Achieves

✅ **Forces complete reviews** - not partial fixes  
✅ **Prevents fragmented fixes** - whole system context  
✅ **Stops regressions** - e2e validation required  
✅ **Ensures quality** - zero warnings tolerance  
✅ **Cross-agent alignment** - all check each other's work  
✅ **Complete documentation** - endpoints, translations, theme, etc.  
✅ **Proper evidence** - before/after code, not just promises  

---

*Save this file and use the command on every PR*
