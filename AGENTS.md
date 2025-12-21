# Fixzit - Agent Working Agreement v5.5 (Codex + VS Code + Claude Code)

Owner: Eng. Sultan Al Hassni  
System: Fixzit Facility-Management + Marketplace (Fixzit Souq) + Real Estate (Aqar)  
Stack: Next.js App Router + TypeScript + MongoDB Atlas/Mongoose + Tailwind/shadcn + Vitest (+ Playwright if enabled)

NON-NEGOTIABLE. Violations = AUTO-FAIL.

---

## 📚 Table of Contents

1. [Agent Claim Protocol](#-mandatory-agent-claim-protocol-enforced-by-default)
2. [Auto-Review Protocol](#-auto-review-protocol-mandatory-after-every-task)
3. [Deep-Dive & Fix-Once Protocol](#-deep-dive--fix-once-protocol-mandatory)
4. [System Stability](#system-stability-auto-triggered)
5. [Sources of Truth (SoT)](#0-sources-of-truth-sot--no-guessing)
6. [Absolute Global Rules](#1-absolute-global-rules-auto-fail)
7. [Environment Variable Verification](#-environment-variable-verification-protocol-mandatory)
8. [Error Handling Standards](#-error-handling-standards-mandatory)
9. [Layout & UI Rules](#2-layout-freeze-universal-shell)
10. [Multi-Tenancy](#4-multi-tenancy-zero-tolerance-auto-fail)
11. [Testing Protocol](#5-testing-protocol-vitest)
12. [HFV Execution Loop](#6-haltfixverify-hfv-execution-loop-strict-v4)
13. [Anti-False-Positive Protocol](#7-anti-false-positive-protocol)
14. [Fixzit Domain Invariants](#8-fixzit-domain-invariants)
15. [Multi-Agent Coordination](#multi-agent-coordination-protocol-critical)
16. [PR & Cleanup Protocol](#pr--cleanup-protocol-mandatory)
17. [PR Review Protocol](#-pr-review-protocol-mandatory--zero-force-merge-tolerance)
18. [Code Quality Standards](#-code-quality-standards-system-aware--mandatory)
19. [CI/CD Build Protocol](#-cicd-build-protocol-zero-error-tolerance)
20. [Autonomous PR Review](#-autonomous-pr-review--fix-protocol-vs-code-copilot)
21. [SSOT Chat History + Backlog Sync](#-ssot-chat-history-analysis--backlog-sync-protocol-v20)
22. [Improvement Analysis Protocol](#improvement-analysis-protocol-periodic-review)
23. [Agent Task Handoff Protocol](#-agent-task-handoff-protocol-mandatory-for-cross-agent-work)
24. [Pending Backlog Extractor v2.5](#-pending-backlog-extractor-protocol-v25-ssot-integrated)
25. [Quick Reference: Agent Token Format](#-quick-reference-agent-token-format)

---

## ⚠️ MANDATORY: Agent Claim Protocol (ENFORCED BY DEFAULT)

**NO AGENT MAY WORK WITHOUT A VALID CLAIM. This is non-negotiable.**

### Pre-Start Checklist (BEFORE ANY WORK)
Every agent MUST complete these steps BEFORE touching any code:

```
┌─────────────────────────────────────────────────────────────┐
│  AGENT PRE-START PROTOCOL (Required for ALL agents)        │
├─────────────────────────────────────────────────────────────┤
│  1. □ Read /tmp/agent-assignments.json                      │
│  2. □ Claim available slot: [AGENT-XXX-Y]                   │
│  3. □ List EXACT files to modify (no wildcards)             │
│  4. □ Check git status - must be clean                      │
│  5. □ Check for stale worktrees: git worktree list          │
│  6. □ Run: pnpm typecheck (must pass)                       │
│  7. □ Run: pnpm lint (must pass)                            │
│  8. □ Announce: "[AGENT-XXX-Y] Claimed. Files: <list>"      │
└─────────────────────────────────────────────────────────────┘
```

### Post-Task Checklist (BEFORE CLOSING ANY TASK)
Every agent MUST complete these steps BEFORE marking task complete:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  AGENT POST-TASK PROTOCOL (Required for ALL agents)                    │
├─────────────────────────────────────────────────────────────────────────┤
│  1. □ Run: pnpm typecheck (must pass - 0 errors)                        │
│  2. □ Run: pnpm lint (must pass - 0 warnings)                           │
│  3. □ Run: pnpm vitest run --reporter=dot (tests green)                 │
│  4. □ Check git status - commit all changes                             │
│  5. □ Create PR if not exists (or push to existing PR)                  │
│  6. □ Clean up: remove any temp files, debug logs                       │
│  7. □ Release lock: update /tmp/agent-assignments.json                  │
│  8. □ TRIGGER AUTO-REVIEW (see below) — WAIT for Codex feedback         │
│  9. □ RUN SSOT SYNC PROTOCOL — Extract findings, sync to MongoDB        │
│ 10. □ UPDATE docs/PENDING_MASTER.md with session changelog              │
│ 11. □ Announce: "[AGENT-XXX-Y] Complete. PR: #XXX"                      │
│ 12. □ NOTIFY Eng. Sultan with FINAL OUTPUT box                          │
│ 13. □ DO NOT close task - only Eng. Sultan approves closure             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Auto-Review Protocol (MANDATORY AFTER EVERY TASK)

### VS Code Copilot ↔ Codex Integration (ENFORCED)
- **VS Code Copilot** agents MUST work WITH **Codex** for final review
- Codex is installed in VS Code AND GitHub — use BOTH
- Final solution MUST be **100% perfect** before PR merge
- **Eng. Sultan MUST be notified** of final output from agent

### Trigger Condition
After completing ANY task (code changes, fixes, features), the agent MUST trigger an automatic review request to Codex using the HIGH REASONING model.

### How to Trigger Codex Review (VS Code)
```
1. Open Codex panel in VS Code (or use @codex in chat)
2. Paste the review request template below
3. Wait for Codex response
4. Handle response per the table below
5. Report final status to Eng. Sultan
```

### How to Trigger Codex Review (GitHub)
```
1. Create/update PR with all changes
2. Add comment: @codex review this PR
3. Or use GitHub Actions Codex workflow if configured
4. Wait for Codex review comment on PR
```

### Review Request Format
Submit the following to Codex for review:

```
# FIXIZIT — TARGETED CODE REVIEW & VERIFICATION
## Role: Senior Code Reviewer + QA Gatekeeper

Review the following TARGET CODE SET and provide:
1. Correctness verification (logic, types, edge cases)
2. Multi-tenancy compliance (org_id scope on all DB queries)
3. Security review (input validation, auth checks, XSS/injection)
4. Similar issue scan (find same pattern across entire codebase)
5. Test coverage assessment
6. Conflict-safe action plan

## MULTI-AGENT COORDINATION CHECK
Before any recommendations, verify:
- git status --porcelain (clean?)
- git diff --name-only origin/main..HEAD
- Check /tmp/agent-assignments.json for conflicts

## TARGET CODE SET
Agent: [AGENT-XXX-Y]
Task: <task summary>
PR: #<number>
Files Modified:
- <file1.ts>
- <file2.ts>

## CODE CHANGES (paste diffs or key snippets)
<paste relevant code here>

## REVIEW CHECKLIST
- [ ] Types correct (no `any`, proper generics)
- [ ] Tenant isolation enforced (org_id on all queries)
- [ ] Error handling complete (try-catch, error boundaries)
- [ ] Input validation present (Zod schemas)
- [ ] Auth/RBAC enforced (session checks, role guards)
- [ ] No console.log in production code
- [ ] i18n used for all user-facing strings
- [ ] Tests cover happy path + error cases
- [ ] Similar patterns fixed across codebase (Deep-Dive)

## OUTPUT REQUIRED
1. ✅ APPROVED — Ready to merge
2. 🔴 BLOCKED — List specific issues with file:line references
3. 🟡 SUGGESTIONS — Non-blocking improvements
4. 📋 SIMILAR ISSUES — Other files needing same fix
```

### Review Response Handling

| Review Result | Agent Action |
|---------------|--------------|
| ✅ APPROVED | Proceed to close announcement |
| 🔴 BLOCKED | Fix ALL blockers, re-run post-task checklist, re-trigger review |
| 🟡 SUGGESTIONS | Log to PENDING_MASTER.md as P3, proceed to close |
| 📋 SIMILAR ISSUES | Create issues in MongoDB + PENDING_MASTER.md, proceed to close |

### Final Output Notification to Eng. Sultan (MANDATORY)

After Codex review, agent MUST provide final summary:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔔 FINAL OUTPUT — AGENT TASK COMPLETE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Agent: [AGENT-XXX-Y]                                                   │
│  Task: <summary>                                                        │
│  PR: #<number> — <link>                                                 │
│                                                                         │
│  ✅ Codex Review: APPROVED / 🔴 BLOCKED / 🟡 SUGGESTIONS                │
│                                                                         │
│  Files Modified: <N>                                                    │
│  - file1.ts (lines X-Y)                                                 │
│  - file2.ts (lines A-B)                                                 │
│                                                                         │
│  Verification:                                                          │
│  - pnpm typecheck: ✅ 0 errors                                          │
│  - pnpm lint: ✅ 0 warnings                                             │
│  - pnpm vitest: ✅ all passing                                          │
│                                                                         │
│  Deep-Dive: <N> similar issues found and fixed across codebase          │
│                                                                         │
│  Status: READY FOR ENG. SULTAN REVIEW                                   │
│  Next: Awaiting approval to merge PR #<number>                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Wait for Review
- Agent MUST wait for Codex review response before announcing completion
- If review not received within 5 minutes, proceed with warning note
- All review feedback logged to PR comments
- **ALWAYS notify Eng. Sultan with final output box above**

### Agent Lifecycle (ENFORCED)

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│  1. CLAIM  │ ──▶ │  2. WORK   │ ──▶ │  3. VERIFY │ ──▶ │ 4. REVIEW  │ ──▶ │ 5. SSOT    │ ──▶ │ 6. CLEANUP │
│            │     │            │     │            │     │            │     │            │     │            │
│ Read JSON  │     │ Edit files │     │ typecheck  │     │ Trigger    │     │ Extract    │     │ Commit all │
│ Pick slot  │     │ Small cmts │     │ lint       │     │ Codex      │     │ findings   │     │ Create PR  │
│ Lock files │     │ Test often │     │ tests      │     │ Wait resp  │     │ Sync to DB │     │ Release    │
│ Announce   │     │ No mess    │     │ git status │     │ Handle FB  │     │ Update MD  │     │ Announce   │
└────────────┘     └────────────┘     └────────────┘     └────────────┘     └────────────┘     └────────────┘
```

---

## 🔍 Deep-Dive & Fix-Once Protocol (MANDATORY)

### Problem: Same issue appears in multiple files, agents fix one and miss others
This wastes time and creates technical debt. **FIX ONCE, FIX EVERYWHERE.**

### Before Fixing ANY Issue, Agent MUST:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  DEEP-DIVE SCAN PROTOCOL (Required before ANY fix)                     │
├─────────────────────────────────────────────────────────────────────────┤
│  1. □ Check SSOT first: Read docs/PENDING_MASTER.md + query MongoDB    │
│  2. □ Is another agent already working on this? → SKIP, pick next task │
│  3. □ Scan for SIMILAR issues across entire codebase:                  │
│       grep -rn "<pattern>" app lib services components tests           │
│  4. □ List ALL occurrences (file + line number)                        │
│  5. □ Fix ALL occurrences in ONE session (not just the first one)      │
│  6. □ Update SSOT immediately so other agents see it's being handled   │
│  7. □ Commit with full list of files fixed                             │
└─────────────────────────────────────────────────────────────────────────┘
```

### Deep-Dive Scan Commands (Run BEFORE fixing)

```bash
# Example: Found a missing tenant scope issue
grep -rn "findById\|findOne" app/api --include="*.ts" | grep -v "org_id\|orgId" | wc -l

# Example: Found a console.log that should be removed
grep -rn "console\.log" app lib services --include="*.ts" --include="*.tsx" | wc -l

# Example: Found a hardcoded string that should be i18n
grep -rn "\"Error:\|\"Success:\|\"Loading" app components --include="*.tsx" | wc -l

# Example: Found unsafe JSON.parse
grep -rn "JSON\.parse" app lib services --include="*.ts" | grep -v "try" | wc -l
```

### Issue Classification for Deep-Dive

| Issue Type | Scan Pattern | Fix Scope |
|------------|--------------|-----------|
| Missing tenant scope | `findById\|findOne` without `org_id` | All API routes |
| Unsafe JSON parse | `JSON.parse` without try-catch | All files using JSON.parse |
| Console logs in prod | `console.log` in app/lib/services | Remove or replace with logger |
| Hardcoded strings | String literals in JSX | Replace with t() i18n |
| Missing .lean() | Mongoose queries without .lean() | All read-only queries |
| Missing error handling | await without try-catch | All async operations |
| Type safety | `as any` or `// @ts-ignore` | Replace with proper types |

### SSOT Check Protocol (Prevent Duplicate Work)

**BEFORE starting any fix:**
```bash
# 1. Check if issue exists in SSOT
grep -i "<issue-keyword>" docs/PENDING_MASTER.md

# 2. Check if another agent claimed it
cat /tmp/agent-assignments.json | grep -i "<issue-keyword>"

# 3. If not claimed, register immediately:
# Update PENDING_MASTER.md with:
# - Issue ID
# - Your agent ID [AGENT-XXX-Y]
# - Status: IN_PROGRESS
# - Files being fixed (full list)
```

### Fix-Once Commit Template

```bash
git commit -m "fix(<scope>): <issue-description> across <N> files

[AGENT-XXX-Y] Deep-dive fix for <ISSUE-ID>

Files fixed (<N> total):
- app/api/finance/accounts/route.ts
- app/api/souq/orders/route.ts
- app/api/hr/employees/route.ts
... (list all)

Pattern fixed: <description of what was wrong>
Solution applied: <description of fix>

Scanned: grep -rn '<pattern>' <paths>
Total occurrences before: N
Total occurrences after: 0"
```

### Deep-Dive Summary in PENDING_MASTER.md

After completing a deep-dive fix, append:

```markdown
### YYYY-MM-DD HH:mm (Asia/Riyadh) — Deep-Dive Fix
**Agent:** [AGENT-XXX-Y]
**Issue:** <ISSUE-ID> — <title>
**Pattern:** <what was scanned>
**Scope:** <N> files across <modules>

**Files Fixed:**
1. path/to/file1.ts (line X)
2. path/to/file2.ts (line Y)
... 

**Verification:**
- Before: `grep -rn '<pattern>' → N matches`
- After: `grep -rn '<pattern>' → 0 matches`
- Tests: ✅ All passing

**Similar Issues to Watch:**
- <related pattern 1>
- <related pattern 2>
```

---

## System Stability (AUTO-TRIGGERED)
A background daemon runs every 2 minutes to prevent VS Code Code 5 crashes:
- LaunchAgent: `com.fixzit.agent-preflight`
- Logs: `/tmp/agent-preflight.log`
- Manual run: `./tools/vscode-optimizer.sh`

---

## Mission
Eliminate false positives. Ship best-practice, evidence-backed fixes only.

---

## 0) Sources of Truth (SoT) — No Guessing
Use these as authoritative:
- STRICT v4 (HFV loop, proof packs, language/currency/footer, no bypass, no build-output edits)
- Fixzit Blueprint/SDD: Multi-tenancy (org_id/property_owner_id), RBAC, Golden workflows
- Verification log patterns: missing language selector/flags, missing currency, missing universal sidebar/footer, logo regressions, social login buttons missing
- CI/Quality Gates: `.github/workflows/fixzit-quality-gates.yml` and `.github/workflows/build-sourcemaps.yml` must be reviewed when any task touches builds, tests, or release workflows.

If any SoT is missing/unreadable → STOP and report CRITICAL.

---

## 1) Absolute Global Rules (AUTO-FAIL)
- Do NOT change layout, features, workflows, or remove modules to "fix" bugs.
- Do NOT bypass, suppress, mute, or hide errors (no band-aids, no silent catches, no ts-ignore).
- Do NOT edit build outputs (.next, dist, manifests) to hide problems.
- Do NOT claim "fixed" unless you provide evidence (commands + raw outputs, tests, screenshots where applicable).
- Do NOT close tasks/PRs/issues. Only Eng. Sultan approves closure.
- Do NOT take shortcuts or workarounds — ALWAYS fix the root cause.
- Do NOT ignore issues — every finding MUST be reported to MongoDB SSOT.
- Do NOT blame "missing env vars" without verifying in BOTH GitHub AND Vercel.

### ⛔ NO SHORTCUTS / NO WORKAROUNDS POLICY (STRICTLY ENFORCED)
```
┌─────────────────────────────────────────────────────────────────────────┐
│  FORBIDDEN ACTIONS (AUTO-FAIL)                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  ❌ Commenting out failing tests instead of fixing them                 │
│  ❌ Adding // @ts-ignore or // eslint-disable without justification     │
│  ❌ Wrapping errors in try-catch that swallows them silently            │
│  ❌ Using `as any` to bypass type errors                                │
│  ❌ Hardcoding values instead of fixing the real data source            │
│  ❌ Deleting code to "fix" a bug instead of understanding root cause   │
│  ❌ Skipping SSOT update when issues are found                          │
│  ❌ Saying "works on my machine" without evidence                       │
│  ❌ Deferring issues without logging them to MongoDB                    │
│  ❌ Claiming "out of scope" without creating a tracked issue            │
│  ❌ Blaming "env var missing" without checking GitHub + Vercel          │
└─────────────────────────────────────────────────────────────────────────┘

REQUIRED INSTEAD:
- Investigate and identify the ROOT CAUSE of every issue
- Fix the root cause, not the symptom
- If fix is complex/blocked, create issue in MongoDB SSOT with:
  - Full evidence (file + lines + snippet)
  - Root cause analysis
  - Blocker reason if applicable
  - Proposed solution
- Update docs/PENDING_MASTER.md with the issue reference
- Notify Eng. Sultan if P0/P1 blocker found
```

---

### 🔑 Environment Variable Verification Protocol (MANDATORY)

**BEFORE blaming "missing env var", agents MUST verify in BOTH platforms:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ENV VAR VERIFICATION CHECKLIST                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  1. □ Check GitHub Repository Secrets:                                  │
│       Settings → Secrets and variables → Actions                        │
│       - Repository secrets                                              │
│       - Environment secrets (production, preview, development)          │
│                                                                         │
│  2. □ Check Vercel Environment Variables:                               │
│       Project Settings → Environment Variables                          │
│       - Production                                                       │
│       - Preview                                                          │
│       - Development                                                      │
│                                                                         │
│  3. □ Check local .env files (for development):                         │
│       - .env.local                                                       │
│       - .env.development.local                                           │
│       - .env (committed defaults only)                                   │
│                                                                         │
│  4. □ Verify .env.example is up to date with ALL required keys          │
└─────────────────────────────────────────────────────────────────────────┘
```

**If env var is ACTUALLY missing, notify Eng. Sultan with:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔴 MISSING ENV VAR NOTIFICATION                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  Variable Name: <ENV_VAR_NAME>                                          │
│  Required By: <file:line or module>                                     │
│  Purpose: <what this variable is used for>                              │
│                                                                         │
│  Status by Platform:                                                    │
│  ├─ GitHub Actions: ❌ MISSING / ✅ Present                             │
│  ├─ Vercel Production: ❌ MISSING / ✅ Present                          │
│  ├─ Vercel Preview: ❌ MISSING / ✅ Present                             │
│  ├─ Vercel Development: ❌ MISSING / ✅ Present                         │
│  └─ .env.example: ❌ NOT DOCUMENTED / ✅ Documented                     │
│                                                                         │
│  Action Required: Add to <platform(s)> with value from <source>         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Commands to Check (use these before blaming):**
```bash
# Check what env vars code expects
grep -rn "process.env\." app lib services --include="*.ts" | grep -v node_modules | sort -u

# Check .env.example for documented vars
cat .env.example | grep -v "^#" | grep "="

# List all unique env var names used in codebase
grep -roh "process\.env\.[A-Z_0-9]*" app lib services --include="*.ts" | sort -u
```

---

### 📋 Error Handling Standards (MANDATORY)

**All error handling MUST include clear, traceable error codes:**

```typescript
// ❌ BAD - No context, hard to trace
throw new Error('Something went wrong');
catch (e) { console.log(e); }

// ✅ GOOD - Clear error code, context, and traceability
throw new Error('[FIXZIT-AUTH-001] Failed to validate session: ' + reason);
throw new Error('[FIXZIT-DB-002] MongoDB connection failed: ' + error.message);
throw new Error('[FIXZIT-API-003] Rate limit exceeded for org: ' + orgId);
```

**Error Code Format:**
```
[FIXZIT-<MODULE>-<NUMBER>] <Human-readable message>: <technical details>

Modules:
- AUTH: Authentication/Authorization
- DB: Database operations
- API: API route handlers
- TENANT: Multi-tenancy violations
- PAY: Payment/Billing
- SOUQ: Marketplace
- AQAR: Real Estate
- HR: Human Resources
- FM: Facility Management
- ENV: Environment/Config
- I18N: Internationalization
- FILE: File operations
```

**Required Error Response Structure:**
```typescript
// API error responses MUST include:
return NextResponse.json({
  error: {
    code: 'FIXZIT-API-001',           // Unique traceable code
    message: 'Unauthorized access',    // User-friendly message
    details: 'Session expired',        // Technical details (dev only)
    path: '/api/finance/accounts',     // Which endpoint
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID(),    // For log correlation
  }
}, { status: 401 });
```

**Env Var Error Pattern:**
```typescript
// ❌ BAD - Silent failure or generic error
const apiKey = process.env.STRIPE_KEY || '';
if (!apiKey) throw new Error('Missing key');

// ✅ GOOD - Clear identification of what's missing
const apiKey = process.env.STRIPE_SECRET_KEY;
if (!apiKey) {
  throw new Error(
    '[FIXZIT-ENV-001] Missing required environment variable: STRIPE_SECRET_KEY. ' +
    'Check Vercel (Production/Preview) and GitHub Secrets. ' +
    'See .env.example for documentation.'
  );
}
```

**Logging with Error Codes:**
```typescript
import { logger } from '@/lib/logger';

// Always include error code in logs
logger.error('[FIXZIT-DB-005] Failed to fetch user', {
  errorCode: 'FIXZIT-DB-005',
  userId,
  orgId,
  error: err.message,
  stack: err.stack,
});
```

---

## 2) Layout Freeze (Universal Shell)
Global shell must be consistent: Header (Top Bar) + Sidebar + Content + Footer.
- No duplicate headers, no nested layout conflicts, no "header disappears" regressions.
- Footer must be universal and match Landing footer structure (company logo + copyright).
- Sidebar must be universal across all internal modules (not missing in Work Orders/Properties/etc.).

---

## 3) UI/Branding/RTL Hard Rules (Regression Hotspots)
The following must never regress:
- Language selector is ONE dropdown (not two buttons) with flags and clickable switching.
- Arabic must work on Landing page (RTL direction switches, translations load).
- Currency selector exists on ALL pages and is stored in user preferences.
- Fixzit logo must appear before text in header; do not replace it with a generic placeholder.
- Clicking Fixzit logo must route to Landing by default.
- Login page must include Google + Apple sign-in buttons under the main sign-in button.
- Sidebar: collapsed mode must show hover tooltips (missing hover is a bug).

Brand tokens (enforced): #0061A8 Blue, #00A859 Green, #FFB400 Yellow
RTL-first: Prefer logical Tailwind classes (ps/pe/ms/me/start/end).

---

## 4) Multi-Tenancy Zero Tolerance (AUTO-FAIL)
No database query may execute without tenant scope:
- Corporate scope: MUST include `{ org_id: session.user.orgId }`.
- Owner scope: MUST include `{ property_owner_id: session.user.id }` where applicable.
- Super Admin bypass must be explicit and audited.

Any missing tenant filter = SECURITY BUG.

---

## 5) Testing Protocol (Vitest)
### 5.1 Mock Hygiene (CRITICAL)
Every test file MUST include in beforeEach:
- `vi.clearAllMocks()`
- reset default mocked returns (rate limit, auth/session, env)

If a test fails: STOP, fix root cause, re-run. Never comment out tests.

### 5.2 Route Logic Verification Rule
Before writing any rate-limit test:
- Confirm the handler method (GET/POST/DELETE) actually applies enforceRateLimit.
- Do NOT test 429 on GET unless GET implements rate limiting.

### 5.3 Isolation
- Prefer beforeAll/afterAll for MongoMemoryServer.
- Prefer deleteMany({}) cleanup (drop() can fail or remove indexes).

---

## 6) Halt–Fix–Verify (HFV) Execution Loop (STRICT v4)
For EACH page × role:
1) Navigate and run all visible actions.
2) If error/warning → capture evidence (screenshot T0 + T0+10s OR Playwright screenshots).
3) HALT.
4) Fix all errors (console/runtime/network/build).
5) Re-test twice; still clean after 10s.
6) Only then move to next page/role.

Proof pack required:
- Before/After screenshots (or Playwright artifacts)
- Console + Network evidence
- Build output (0 TS errors)
- Commit hash + root-cause + fix summary

---

## 7) Anti-False-Positive Protocol
- Do not hallucinate: never invent files/symbols/configs/results.
- Every issue must cite exact code (file + line range) OR tool output.
- Classify each item: CONFIRMED (>=80%), FALSE POSITIVE, NEEDS EVIDENCE.
- For NEEDS EVIDENCE: stop for that item and list exact commands/outputs required.

## Fix order (best practice)
1) Fix config/resolution first (TS project, ESLint working directory, workspace root, stale servers).
2) Then fix code analyzability/correctness (types/guards/tenant scope/RBAC).
3) Last resort: narrow single-line suppression with justification + TODO. Never blanket-disable.

---

## 8) Fixzit Domain Invariants
- Tenant isolation: org_id scope (+ property_owner_id where applicable)
- RBAC: fixed 14 roles only (no invented roles)
- Finance: Decimal128 storage; precision-safe calculations; compliance only when implementation exists
- UI: design tokens + RTL/i18n consistency

---

## Output
Single Markdown report with unified diffs + validation commands (do not assume results).
End every response with QA Gate Checklist:
- [ ] Tests green
- [ ] Build 0 TS errors
- [ ] No console/runtime/hydration issues
- [ ] Tenancy filters enforced
- [ ] Branding/RTL verified
- [ ] Evidence pack attached

End with: "Merge-ready for Fixzit Phase 1 MVP."

---

## Multi-Agent Coordination Protocol (CRITICAL)

### Problem: Multiple agents cause VS Code Exit Code 5 crashes
When multiple agents work simultaneously, each creates worktrees/processes that consume memory.
7 worktrees = ~4-6GB RAM overhead → OOM → VS Code crashes.

### Solution: Agent Assignment System

**Before starting work, each agent MUST:**
1. Check `/tmp/agent-assignments.json` for current file locks
2. Register their assignment with a unique agent ID
3. Work ONLY on assigned files
4. Release locks when done

### Assignment File Format (`/tmp/agent-assignments.json`)
```json
{
  "agents": {
    "AGENT-001": {
      "name": "VS Code Copilot",
      "assigned": ["app/api/finance/**", "lib/finance/**"],
      "started": "2025-12-21T10:00:00Z",
      "status": "active"
    },
    "AGENT-002": {
      "name": "Claude Code",
      "assigned": ["app/api/souq/**", "services/souq/**"],
      "started": "2025-12-21T10:05:00Z",
      "status": "active"
    }
  },
  "locked_paths": [
    "app/api/finance/**",
    "lib/finance/**",
    "app/api/souq/**",
    "services/souq/**"
  ]
}
```

### Agent ID Assignment (Use your designated ID):
| Agent ID | Type | Default Domain |
|----------|------|----------------|
| AGENT-001 | VS Code Copilot | Core/Auth/Middleware |
| AGENT-002 | Claude Code | Finance/Billing |
| AGENT-003 | Codex | Souq/Marketplace |
| AGENT-004 | Cursor | Aqar/Real Estate |
| AGENT-005 | Windsurf | HR/Payroll |
| AGENT-006 | Reserved | Tests/Scripts |

### Multiple Agent Instances (ALL AGENT TYPES)
When running multiple instances of ANY agent type, each MUST claim a unique sub-ID:

| Pattern | Examples | Description |
|---------|----------|-------------|
| AGENT-001-A/B/C | VS Code Copilot #1, #2, #3 | Multiple Copilot windows |
| AGENT-002-A/B/C | Claude Code #1, #2, #3 | Multiple Claude sessions |
| AGENT-003-A/B/C | Codex #1, #2, #3 | Multiple Codex instances |
| AGENT-004-A/B/C | Cursor #1, #2, #3 | Multiple Cursor windows |
| AGENT-005-A/B/C | Windsurf #1, #2, #3 | Multiple Windsurf sessions |
| AGENT-006-A/B/C | Reserved #1, #2, #3 | Tests/Scripts runners |

**On session start, EVERY agent MUST:**
1. Read `/tmp/agent-assignments.json`
2. Find the first available sub-ID for your agent type (A, B, C...)
3. Register with assigned files and set status to "active"
4. Start FIRST response with: `[AGENT-XXX-Y] Claimed. Working on: <paths>`
5. If all slots taken → WAIT or ask user to release a slot

**Example claims:**
```
[AGENT-001-A] Claimed. Working on: app/api/auth/**, middleware.ts
[AGENT-002-B] Claimed. Working on: app/api/finance/**, lib/finance/**
[AGENT-003-A] Claimed. Working on: app/api/souq/**, services/souq/**
```

### Rules:
1. **NO WORKTREES** — All agents work on main branch only
2. **CHECK LOCKS FIRST** — If path is locked by another agent, SKIP or WAIT
3. **SMALL COMMITS** — Commit after each file to avoid merge conflicts
4. **ANNOUNCE INTENT** — Start response with: `[AGENT-XXX] Working on: <file paths>`
5. **RELEASE ON DONE** — Update assignment file when task complete

### Memory Budget:
- Max 2 agents active simultaneously
- Each agent limited to 1 worktree (main only)
- If memory < 500MB free, pause and wait for cleanup

### Conflict Resolution:
- First agent to lock wins
- If conflict detected: agent with LOWER ID keeps lock
- Disputed files → escalate to Eng. Sultan

---

## PR & Cleanup Protocol (MANDATORY)

### Every Agent MUST Create/Update PRs
```bash
# If no PR exists for your changes:
git checkout -b fix/<agent-id>-<task-summary>
git add <changed-files>
git commit -m "<type>(<scope>): <description>

[AGENT-XXX-Y] <task summary>
Files: <list of files modified>"
git push origin HEAD
gh pr create --title "<type>(<scope>): <description>" --body "## Agent: AGENT-XXX-Y
## Files Modified:
- file1.ts
- file2.ts

## Verification:
- [ ] pnpm typecheck passes
- [ ] pnpm lint passes
- [ ] pnpm vitest run passes"
```

### Cleanup Responsibilities (ENFORCED)
Each agent is responsible for cleaning up its own mess:

| Cleanup Item | When | Command |
|--------------|------|---------|
| Uncommitted changes | Before start + after task | `git status` must be clean |
| Stale worktrees | Before start | `git worktree list` → remove if >1 |
| Debug console.logs | Before commit | Remove all debug statements |
| Temp files | Before commit | Remove any .tmp, .bak, debug files |
| Broken tests | Before PR | Fix or document why skipped |
| TypeScript errors | Before PR | 0 errors required |
| ESLint warnings | Before PR | 0 warnings required |

### Agent Self-Cleanup Commands
```bash
# Run these BEFORE closing any task:
git status                           # Must be clean
git worktree list                    # Must show only main
pnpm typecheck                       # Must pass (0 errors)
pnpm lint                            # Must pass (0 warnings)
pnpm vitest run --reporter=dot       # Must pass (all green)
git log --oneline -3                 # Verify your commits
gh pr list --author @me              # Verify PR created
```

---

## � PR Review Protocol (MANDATORY — ZERO FORCE MERGE TOLERANCE)

### ⛔ NEVER Force Merge (AUTO-FAIL)
```
┌─────────────────────────────────────────────────────────────────────────┐
│  FORBIDDEN PR ACTIONS (AUTO-FAIL — IMMEDIATE ESCALATION)               │
├─────────────────────────────────────────────────────────────────────────┤
│  ❌ Force merging with unresolved comments                              │
│  ❌ Dismissing review comments without addressing them                  │
│  ❌ Merging with failing CI checks                                      │
│  ❌ Merging with "skip" or "fixme" comments unresolved                  │
│  ❌ Merging without waiting for required reviewers                      │
│  ❌ Bypassing branch protection rules                                   │
│  ❌ Using admin override to merge blocked PRs                           │
│  ❌ Closing and reopening PR to clear review state                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### PR Review Checklist (BEFORE Merge)
```
┌─────────────────────────────────────────────────────────────────────────┐
│  PR MERGE GATE CHECKLIST (ALL items MUST be ✅)                        │
├─────────────────────────────────────────────────────────────────────────┤
│  1. □ ALL review comments addressed (replied or resolved)               │
│  2. □ ALL conversations marked as resolved                              │
│  3. □ ALL requested changes implemented                                 │
│  4. □ CI/CD pipeline passes (ALL checks green)                          │
│  5. □ No "Changes requested" reviews pending                            │
│  6. □ Required approvals received                                       │
│  7. □ No merge conflicts                                                │
│  8. □ Branch is up to date with main                                    │
│  9. □ All linked issues updated                                         │
│ 10. □ SSOT sync completed (MongoDB + PENDING_MASTER.md)                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### Comment Resolution Protocol
**For EVERY PR comment, agent MUST:**
1. **READ** the comment carefully
2. **UNDERSTAND** what is being requested
3. **IMPLEMENT** the requested change (or provide justification why not)
4. **REPLY** to the comment explaining what was done
5. **MARK** as resolved only after reviewer confirms

**If you disagree with a comment:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  DO NOT ignore or dismiss — instead:                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Reply with your reasoning                                           │
│  2. Cite documentation, standards, or evidence                          │
│  3. Propose alternative solution if applicable                          │
│  4. Wait for reviewer response                                          │
│  5. Escalate to Eng. Sultan if no consensus after 2 exchanges           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Code Quality Standards (SYSTEM-AWARE — MANDATORY)

### Fixzit System Context (AGENTS MUST KNOW THIS)
```
┌─────────────────────────────────────────────────────────────────────────┐
│  🏢 FIXZIT ECOSYSTEM — AGENT MUST BE AWARE                             │
├─────────────────────────────────────────────────────────────────────────┤
│  Modules:                                                               │
│  ├─ Fixzit FM (Facility Management) — Work orders, properties, teams   │
│  ├─ Fixzit Souq (Marketplace) — Products, orders, vendors              │
│  ├─ Aqar (Real Estate) — Listings, packages, valuations                │
│  ├─ Finance — Invoices, billing, ZATCA compliance                      │
│  ├─ HR/Payroll — Employees, attendance, payroll                        │
│  └─ System — Auth, orgs, users, settings                               │
│                                                                         │
│  Tech Stack:                                                            │
│  ├─ Next.js 14+ App Router (NOT pages router)                          │
│  ├─ TypeScript (strict mode)                                           │
│  ├─ MongoDB Atlas + Mongoose                                           │
│  ├─ Tailwind CSS + shadcn/ui                                           │
│  ├─ next-intl (i18n) — RTL-first                                       │
│  └─ Vitest + Playwright (testing)                                      │
│                                                                         │
│  Brand Tokens (ONLY these colors):                                      │
│  ├─ Blue: #0061A8 (primary)                                            │
│  ├─ Green: #00A859 (success)                                           │
│  └─ Yellow: #FFB400 (warning)                                          │
│                                                                         │
│  Saudi Compliance:                                                      │
│  ├─ ZATCA Phase 2 (e-invoicing)                                        │
│  ├─ VAT 15% (standard rate)                                            │
│  └─ Decimal128 for all money fields                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Code Quality Gates (CHECK BEFORE EVERY COMMIT)

| Gate | Rule | Check Command |
|------|------|---------------|
| **Null Safety** | Every `?.` chain must have fallback or guard | `rg '\?\.' --type ts \| grep -v '?? \||| \|if ('` |
| **RTL Support** | No hardcoded `left/right/ml-/mr-/pl-/pr-` | See RTL Class Mapping below |
| **Theme Tokens** | No hardcoded hex colors outside token files | `rg '#[0-9a-fA-F]{6}' --type tsx \| grep -v 'tailwind\|tokens'` |
| **Multi-Tenancy** | All queries scoped by `org_id` | `rg 'find\|findOne\|aggregate' app/api \| grep -v 'org_id\|orgId'` |
| **Client Directive** | Hooks (useState/useEffect) need `'use client'` | `rg 'useState\|useEffect' app \| xargs grep -L "'use client'"` |
| **Error Boundaries** | Try-catch for all async operations | `rg 'await ' --type ts \| grep -v 'try\|catch'` |

### RTL Class Mapping (BANNED → REQUIRED)

| ❌ BANNED (LTR-only) | ✅ REQUIRED (Logical) | Why |
|---------------------|----------------------|-----|
| `left-*` | `start-*` | RTL flips |
| `right-*` | `end-*` | RTL flips |
| `ml-*` | `ms-*` | Margin start |
| `mr-*` | `me-*` | Margin end |
| `pl-*` | `ps-*` | Padding start |
| `pr-*` | `pe-*` | Padding end |
| `text-left` | `text-start` | Text alignment |
| `text-right` | `text-end` | Text alignment |
| `float-left` | `float-start` | Float direction |
| `float-right` | `float-end` | Float direction |
| `border-l-*` | `border-s-*` | Border start |
| `border-r-*` | `border-e-*` | Border end |
| `rounded-l-*` | `rounded-s-*` | Rounded start |
| `rounded-r-*` | `rounded-e-*` | Rounded end |

**Scan for RTL violations:**
```bash
rg 'ml-|mr-|pl-|pr-|left-|right-|text-left|text-right|float-left|float-right' \
   --type tsx --type ts -g '!*.test.*' -g '!node_modules' | wc -l
```

### System-Wide Pattern Scan (RUN BEFORE PR)

```bash
# 1. RTL violations (must be 0)
echo "=== RTL Violations ===" && \
rg '(ml|mr|pl|pr)-[0-9]|left-[0-9]|right-[0-9]|text-left|text-right' \
   app components --type tsx -c 2>/dev/null | grep -v ':0$'

# 2. Missing org_id scope (must be 0 for app/api)
echo "=== Missing Tenant Scope ===" && \
rg 'find\(|findOne\(|findById\(' app/api --type ts | grep -v 'org_id\|orgId' | head -10

# 3. Hardcoded colors (must be 0 outside token files)
echo "=== Hardcoded Colors ===" && \
rg '#[0-9a-fA-F]{6}' app components --type tsx | grep -v 'tokens\|tailwind\.config' | head -10

# 4. Missing 'use client' with hooks
echo "=== Missing use client ===" && \
for f in $(rg -l 'useState|useEffect|useContext' app components --type tsx); do
  grep -L "'use client'" "$f" 2>/dev/null
done | head -10

# 5. Console.log in production code
echo "=== Console.log ===" && \
rg 'console\.log' app lib services --type ts -c 2>/dev/null | grep -v ':0$' | head -10
```

### PR Scorecard (100 Points — Minimum 85 to Merge)

| Category | Points | Criteria |
|----------|--------|----------|
| **TypeScript** | 15 | 0 errors, 0 `any`, 0 `@ts-ignore` |
| **ESLint** | 10 | 0 errors, 0 warnings |
| **Tests** | 15 | All pass, coverage maintained |
| **Tenant Scope** | 15 | All queries have `org_id` |
| **RTL Support** | 10 | No banned classes |
| **Theme Tokens** | 5 | No hardcoded colors |
| **Error Handling** | 10 | Try-catch on all async, error codes |
| **i18n** | 5 | No hardcoded user-facing strings |
| **Security** | 10 | Input validation, XSS prevention |
| **Documentation** | 5 | Comments for complex logic, JSDoc |
| **TOTAL** | **100** | **≥85 required** |

### Governance Invariants (MUST PRESERVE)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔒 UI GOVERNANCE (NEVER CHANGE WITHOUT APPROVAL)                      │
├─────────────────────────────────────────────────────────────────────────┤
│  Header:                                                                │
│  ├─ Logo MUST be Fixzit logo (not placeholder)                         │
│  ├─ Language selector: ONE dropdown with flags                         │
│  ├─ Currency selector: Present on ALL pages                            │
│  └─ Theme toggle: Light/Dark mode                                      │
│                                                                         │
│  Sidebar:                                                               │
│  ├─ Universal across ALL modules                                        │
│  ├─ Collapsed mode MUST show hover tooltips                            │
│  └─ Role-based menu filtering                                          │
│                                                                         │
│  Footer:                                                                │
│  ├─ Universal across ALL pages                                         │
│  ├─ Company logo + copyright                                           │
│  └─ Matches Landing footer structure                                   │
│                                                                         │
│  Auth:                                                                  │
│  ├─ Login page: Email + Password + Google + Apple buttons              │
│  └─ Session: Always check orgId before any operation                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Saudi Compliance Checks (MANDATORY FOR FINANCE)

| Check | Rule | Evidence Required |
|-------|------|-------------------|
| **ZATCA QR** | All invoices have ZATCA QR code | Screenshot of invoice with QR |
| **VAT 15%** | Tax calculated at 15% | Test case showing calculation |
| **Decimal128** | Money fields use Decimal128 | Schema inspection |
| **Arabic Date** | Hijri calendar support | RTL date picker screenshot |
| **SAR Currency** | Default currency is SAR | Settings verification |

---

## 🔧 CI/CD Build Protocol (ZERO ERROR TOLERANCE)

### ⛔ CI Failure Handling (MANDATORY)
```
┌─────────────────────────────────────────────────────────────────────────┐
│  CI BUILD RULES (NON-NEGOTIABLE)                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  ✅ ALL tests must pass — 100% green, no exceptions                    │
│  ✅ Zero skipped tests — every skip MUST be removed or justified       │
│  ✅ Zero TypeScript errors — not even 1 is acceptable                  │
│  ✅ Zero ESLint warnings — warnings are treated as errors              │
│  ✅ Build must complete successfully                                    │
│  ❌ NO merging with failing CI — not even "flaky" tests                │
│  ❌ NO skipping tests to make CI pass                                  │
│  ❌ NO ignoring "billing" or quota errors — they MUST be fixed         │
└─────────────────────────────────────────────────────────────────────────┘
```

### GitHub Billing/Quota Issues Protocol
**If GitHub Actions fails due to billing or quota issues:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔴 GITHUB BILLING/QUOTA FAILURE PROTOCOL                              │
├─────────────────────────────────────────────────────────────────────────┤
│  DO NOT:                                                                │
│  ❌ Skip CI and merge anyway                                            │
│  ❌ Assume tests pass without running them                              │
│  ❌ Claim "CI was green before"                                         │
│                                                                         │
│  MUST DO INSTEAD:                                                       │
│  1. □ Run ALL tests locally: pnpm vitest run --reporter=verbose         │
│  2. □ Run typecheck locally: pnpm typecheck                             │
│  3. □ Run lint locally: pnpm lint                                       │
│  4. □ Run build locally: pnpm build                                     │
│  5. □ Capture FULL output as evidence                                   │
│  6. □ Only proceed if 100% pass locally (0 errors, 0 skips)             │
│  7. □ Add evidence to PR description:                                   │
│       "Local CI verification (GitHub quota exceeded):                   │
│        - vitest: ✅ X/X passed, 0 skipped                               │
│        - typecheck: ✅ 0 errors                                         │
│        - lint: ✅ 0 warnings                                            │
│        - build: ✅ success"                                             │
│  8. □ Notify Eng. Sultan about GitHub billing status                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Local CI Verification Commands
```bash
# Run BEFORE merging if GitHub CI is unavailable:
echo "=== VITEST ===" && pnpm vitest run --reporter=verbose 2>&1 | tee /tmp/ci-vitest.log
echo "=== TYPECHECK ===" && pnpm typecheck 2>&1 | tee /tmp/ci-typecheck.log
echo "=== LINT ===" && pnpm lint 2>&1 | tee /tmp/ci-lint.log
echo "=== BUILD ===" && pnpm build 2>&1 | tee /tmp/ci-build.log

# Verify all passed:
grep -E "FAIL|ERROR|error|failed" /tmp/ci-*.log && echo "❌ FAILURES FOUND" || echo "✅ ALL PASSED"

# Count test results:
grep -E "Tests:" /tmp/ci-vitest.log
```

### Test Failure Recovery Protocol
**If ANY test fails:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  TEST FAILURE PROTOCOL (MANDATORY)                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  1. □ STOP — Do not proceed with merge                                  │
│  2. □ ANALYZE — Read the full error message and stack trace             │
│  3. □ IDENTIFY — Find root cause in code (not test)                     │
│  4. □ FIX — Fix the actual code bug (not the test assertion)            │
│  5. □ RUN — Re-run ALL tests (not just the fixed one)                   │
│  6. □ VERIFY — Confirm 100% pass rate                                   │
│  7. □ COMMIT — Include fix in PR with explanation                       │
│                                                                         │
│  DO NOT:                                                                │
│  ❌ Skip the failing test                                               │
│  ❌ Add .skip() to make it pass                                         │
│  ❌ Modify test assertion to match wrong behavior                       │
│  ❌ Delete the test                                                     │
│  ❌ Claim "test is flaky" without evidence                              │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🤖 Autonomous PR Review & Fix Protocol (VS Code Copilot)

### Purpose
When reviewing PRs or performing code quality checks, VS Code Copilot MUST autonomously execute a comprehensive review process without human intervention.

### Execution Trigger
This protocol runs automatically when:
- Agent receives a PR review task
- Agent completes code changes before creating PR
- Agent is explicitly asked to review code quality

### Phase 1: Initial Scan (AUTOMATED)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  AUTONOMOUS SCAN SEQUENCE                                              │
├─────────────────────────────────────────────────────────────────────────┤
│  1. □ Run: pnpm typecheck 2>&1 | tee /tmp/typecheck.log                │
│  2. □ Run: pnpm lint 2>&1 | tee /tmp/lint.log                          │
│  3. □ Run: pnpm vitest run --reporter=verbose 2>&1 | tee /tmp/test.log │
│  4. □ Parse all outputs for errors/warnings                            │
│  5. □ Collect file:line references for each issue                      │
└─────────────────────────────────────────────────────────────────────────┘
```

### Phase 2: Deep Code Review (PER FILE)

For each modified file, agent MUST check:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  FILE-LEVEL REVIEW CHECKLIST                                           │
├─────────────────────────────────────────────────────────────────────────┤
│  Security:                                                              │
│  □ No XSS vulnerabilities (innerHTML without sanitization)             │
│  □ No SQL/NoSQL injection (unsanitized user input in queries)          │
│  □ No hardcoded secrets or API keys                                    │
│  □ Input validation on all user-provided data                          │
│                                                                         │
│  Multi-Tenancy (API routes):                                           │
│  □ All find/findOne/aggregate queries include org_id                   │
│  □ Session check before any data access                                │
│  □ RBAC enforcement where required                                     │
│                                                                         │
│  Error Handling:                                                        │
│  □ All await calls wrapped in try-catch                                │
│  □ Error responses include [FIXZIT-XXX-NNN] codes                      │
│  □ No silent failures (catch blocks that swallow errors)               │
│                                                                         │
│  TypeScript:                                                            │
│  □ No `any` types (use proper generics)                                │
│  □ No `@ts-ignore` without justification comment                       │
│  □ Proper null safety (?.  with fallbacks)                             │
│                                                                         │
│  UI/UX (Components):                                                    │
│  □ RTL-safe classes (ms/me/ps/pe instead of ml/mr/pl/pr)               │
│  □ Brand tokens only (no hardcoded colors)                             │
│  □ i18n for all user-facing strings (no hardcoded text)                │
│  □ 'use client' directive if using hooks                               │
│                                                                         │
│  Performance:                                                           │
│  □ .lean() on read-only Mongoose queries                               │
│  □ Proper indexing on frequently queried fields                        │
│  □ No N+1 query patterns                                               │
└─────────────────────────────────────────────────────────────────────────┘
```

### Phase 3: Auto-Fix (WHEN POSSIBLE)

Agent MUST attempt to fix these issues automatically:

| Issue Type | Auto-Fix Action |
|------------|-----------------|
| Missing try-catch | Wrap await in try-catch with proper error code |
| Missing org_id | Add `org_id: session.user.orgId` to query |
| RTL violations | Replace ml/mr/pl/pr with ms/me/ps/pe |
| Missing 'use client' | Add directive to file with hooks |
| console.log in prod | Remove or replace with logger |
| Hardcoded strings | Wrap in `t()` i18n function |

### Phase 4: Generate Report

After review, agent MUST output:

```markdown
## 🔍 Autonomous PR Review Report

**Agent:** [AGENT-XXX-Y]
**Files Reviewed:** N
**Timestamp:** YYYY-MM-DD HH:mm:ss (Asia/Riyadh)

### ✅ Verification Results
- TypeScript: X errors → Y errors (fixed: Z)
- ESLint: X warnings → Y warnings (fixed: Z)
- Tests: X/Y passing

### 🔧 Auto-Fixed Issues
| File | Line | Issue | Fix Applied |
|------|------|-------|-------------|
| path/file.ts | 42 | Missing try-catch | Added error boundary |

### ⚠️ Manual Attention Required
| File | Line | Issue | Recommendation |
|------|------|-------|----------------|
| path/file.ts | 100 | Complex logic | Needs refactoring |

### 📊 PR Scorecard
| Category | Score | Notes |
|----------|-------|-------|
| TypeScript | 15/15 | ✅ |
| Tenant Scope | 15/15 | ✅ |
| ... | ... | ... |
| **TOTAL** | **XX/100** | ≥85 required |

### 🎯 Verdict
- [ ] ✅ APPROVED — Ready to merge
- [ ] 🔴 BLOCKED — X critical issues must be fixed
- [ ] 🟡 NEEDS WORK — Non-critical improvements suggested
```

### Phase 5: Iterate Until Clean

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ITERATION LOOP (MANDATORY)                                            │
├─────────────────────────────────────────────────────────────────────────┤
│  WHILE (score < 85 OR critical_issues > 0):                            │
│    1. Apply fixes for highest-priority issues                          │
│    2. Re-run: pnpm typecheck && pnpm lint && pnpm vitest run           │
│    3. Update scorecard                                                  │
│    4. IF (5 iterations without progress) → escalate to Eng. Sultan     │
│  END WHILE                                                              │
│                                                                         │
│  ON SUCCESS:                                                            │
│    □ Commit all fixes with proper message                               │
│    □ Push to PR branch                                                  │
│    □ Add review report as PR comment                                    │
│    □ Request Codex final review                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Forbidden During Review
```
❌ NEVER skip a file because it's "too complex"
❌ NEVER claim "looks good" without running checks
❌ NEVER approve with score < 85
❌ NEVER approve with ANY security issues
❌ NEVER approve without tenant scope verification on API routes
```

---

## 📋 SSOT Chat History Analysis + Backlog Sync Protocol (v2.0)

### SSOT RULE (NON-NEGOTIABLE)
- **MongoDB Issue Tracker** = ONLY Single Source of Truth (SSOT)
- `docs/PENDING_MASTER.md` = derived log/snapshot ONLY
- **NEVER** record a new issue ONLY in PENDING_MASTER.md — it MUST exist in MongoDB first
- If it's real → MUST be created/updated in MongoDB first

### When to Execute This Protocol
Execute after EVERY:
- Code review session
- Fix session or task completion
- VSCode Copilot chat session with findings

---

### PHASE 0: CHAT HISTORY EXTRACTION (Required for each session)

**A) Extract Chat Session Metadata:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  SESSION METADATA (Required at session start)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  **Session Timestamp:** YYYY-MM-DD HH:mm:ss (Asia/Riyadh)              │
│  **Session Duration:** <start> to <end>                                 │
│  **Session Summary:** <1-2 sentence overview of what was discussed>    │
│  **Agent ID:** [AGENT-XXX-Y]                                            │
│  **Branch:** <current branch>                                           │
│  **Commit:** <latest commit hash>                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

**B) Build Findings Table from Chat History:**

| Timestamp | Finding Type | File Path | Issue Description | Status | Evidence/Snippet | Key/ID |
|-----------|--------------|-----------|-------------------|--------|------------------|--------|
| HH:mm:ss | Bug/Logic/Test/Refactor/Security/Ops | path/to/file.ts:L10-15 | Brief description | Fixed/In Progress/Blocked/New | `code snippet ≤25 words` | BUG-XXX or generated key |

**Finding Types:**
- `Bug` — Runtime errors, crashes, incorrect behavior
- `Logic` — Flawed algorithms, incorrect business logic
- `Test` — Missing/failing tests
- `Refactor` — Code quality, tech debt
- `Security` — Vulnerabilities, unsafe practices
- `Ops` — Infrastructure, deployment, config issues

**C) For Each Finding, Extract:**
- **Timestamp:** HH:mm:ss when discussed
- **File(s) modified:** Exact paths with line numbers
- **What changed:** Before/after logic summary
- **Commands executed:** Terminal commands run
- **Status outcome:** Fixed/In Progress/Blocked/New
- **Evidence:** Code snippet (≤25 words) or exact line reference

---

### PHASE 1: DISCOVERY (Run First)

**A) Locate Canonical Files:**
```bash
# Search for PENDING_MASTER.md → confirm canonical path: docs/PENDING_MASTER.md
find . -name "PENDING_MASTER.md" -type f 2>/dev/null

# If duplicates exist:
# - Choose ONE canonical (prefer /docs)
# - Mark others: "DEPRECATED: SSOT is MongoDB; see docs/PENDING_MASTER.md"
```

**B) Verify Issue Tracker Components:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  ISSUE TRACKER HEALTH CHECK                                            │
├─────────────────────────────────────────────────────────────────────────┤
│  □ Issue model: server/models/Issue.ts                                  │
│  □ Import endpoint: POST /api/issues/import                             │
│  □ Stats endpoint: GET /api/issues/stats                                │
│  □ CRUD endpoints: /api/issues and /api/issues/[id]                     │
│  If missing → log as BLOCKED issue in MongoDB with evidence             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### PHASE 2: BACKLOG AUDIT (PENDING_MASTER → JSON)

**Generate Artifacts:**
1. `BACKLOG_AUDIT.json` (machine-readable)
2. `BACKLOG_AUDIT.md` (human checklist)

**Extraction Rules:**
- Only: OPEN/PENDING/UNRESOLVED items
- Exclude: ✅ 🟢 Done/Fixed/Resolved/Completed
- Dedupe: Latest wins
- Every item MUST include: `sourceRef` + `evidenceSnippet`

**Key Generation:**
- If `externalId` exists (BUG-xxx/LOGIC-xxx) → `key = externalId`
- Else → `key = normalize(title + "|" + category + "|" + location)`

---

### PHASE 3: DB SYNC (Idempotent)

**Import BACKLOG_AUDIT.json to MongoDB:**
```bash
# Endpoint:
POST /api/issues/import
Body: { issues: [...] }

# Capture results:
{ created: N, updated: N, skipped: N, errors: N }

# For each issue: Write audit event SYNCED with timestamp
```

---

### PHASE 4: APPLY CHAT HISTORY FINDINGS TO DB

From chat history findings table, update MongoDB:

| Finding Status | DB Action | Event Type |
|----------------|-----------|------------|
| **Fixed** | status → `resolved`, add resolution note (commit/PR + files + timestamp) | STATUS_CHANGED |
| **In Progress** | status → `in_progress` | STATUS_CHANGED |
| **Blocked** | status → `blocked`, add blocker reason + unblock requirements | UPDATED |
| **New** | CREATE with full evidence (see below) | CREATED |

**For NEW Findings (EVIDENCE REQUIRED):**
```json
{
  "title": "<descriptive title>",
  "category": "bug | logic | tests | security | refactor | ops",
  "priority": "P0 | P1 | P2 | P3 | unspecified",
  "status": "open",
  "location": "<file path from chat>",
  "sourcePath": "vscode-copilot-chat",
  "sourceRef": "vscode-copilot-chat:<file>:<lineStart>-<lineEnd>",
  "evidenceSnippet": "<≤25 words exact from chat>",
  "chatTimestamp": "<when discovered in chat session>",
  "createdBy": "[AGENT-XXX-Y]",
  "createdAt": "<ISO timestamp>",
  "events": [
    { "type": "CREATED", "timestamp": "<ISO>", "by": "[AGENT-XXX-Y]" }
  ]
}
```

**DEDUPE BEFORE CREATING (MANDATORY):**
1. Search DB by `externalId`/`key` + similarity check of `title`/`location`
2. If exists → UPDATE + increment `mentionCount` + add UPDATED event
3. If new → CREATE with all evidence

---

### PHASE 5: UPDATE docs/PENDING_MASTER.md (Derived Log)

**A) Add Header if Missing:**
```markdown
> **NOTE:** SSOT is MongoDB Issue Tracker. This file is a derived log/snapshot.
> Do not create tasks here without also creating/updating DB issues.
```

**B) Append Changelog Entry (DO NOT rewrite entire file):**

```markdown
---
## 📅 YYYY-MM-DD HH:mm:ss (Asia/Riyadh) — VSCode Copilot Session Update

**Session Summary:** <1-2 sentence summary from chat>
**Context:** <branch> | <commit> | <PR link if exists>
**Agent:** [AGENT-XXX-Y]
**DB Sync:** created=<n>, updated=<n>, skipped=<n>, errors=<n>

### 📊 Chat History Findings Table

| Timestamp | Type | File | Description | Status | Key/ID |
|-----------|------|------|-------------|--------|--------|
| HH:mm:ss | Bug | path/to/file.ts:10-15 | Issue desc | Fixed | BUG-001 |
| HH:mm:ss | Logic | path/to/other.ts:45 | Logic flaw | In Progress | LOGIC-002 |

### ✅ Resolved Today (DB SSOT)
- **BUG-001** — <title> (files: path/to/file.ts) — Fixed at HH:mm:ss
- **BUG-002** — <title> ...

### 🟠 In Progress
- **LOGIC-003** — <title> — Work started at HH:mm:ss

### 🔴 Blocked
- **TEST-004** — <title> — Blocker: <reason>

### 🆕 New Findings Added to DB (with evidence)
- **BUG-005** — <title> — sourceRef: vscode-copilot-chat:<file>:<lines> — Found at HH:mm:ss

### 📁 Files Modified in Session
- `path/to/file1.ts` — <what changed>
- `path/to/file2.ts` — <what changed>

### ⚡ Commands Executed
\`\`\`bash
pnpm lint
pnpm test
git commit -m "fix: resolved BUG-001"
\`\`\`

### 🎯 Next Steps (ONLY from DB items above)
- [ ] BUG-005 — Complete implementation and add tests
- [ ] LOGIC-003 — Refactor algorithm in utils.ts
```

**C) If Active Checklist/Table Exists:**
- Mark resolved items with ✅
- Move to "✅ Resolved (Archive)" section at bottom

---

### PHASE 6: VERIFICATION

**Run and Report:**
```bash
pnpm lint                              # Must pass
pnpm test                              # Must pass
curl http://localhost:3000/api/issues/stats   # Confirm 200 OK + correct counts
# Confirm no duplicate issues created
```

---

### FINAL OUTPUT FORMAT (In Chat)

After completing all phases, output this summary:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔧 Fixzit SSOT Update Report                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  📅 Session Info                                                        │
│  Timestamp: YYYY-MM-DD HH:mm:ss (Asia/Riyadh)                           │
│  Duration: HH:mm - HH:mm                                                │
│  Summary: <1-2 sentences>                                               │
│  Agent: [AGENT-XXX-Y]                                                   │
│                                                                         │
│  📊 DB Summary                                                          │
│  - Imported: <n> created, <n> updated, <n> skipped, <n> errors          │
│  - Status Changes: <n> resolved, <n> in-progress, <n> blocked           │
│                                                                         │
│  🎯 Key Updates                                                         │
│  ✅ Resolved: KEY1, KEY2, KEY3                                          │
│  🟠 In Progress: KEY4, KEY5                                             │
│  🔴 Blocked: KEY6                                                       │
│  🆕 New: KEY7, KEY8                                                     │
│                                                                         │
│  📁 Files Changed                                                       │
│  - path/to/file1.ts                                                     │
│  - path/to/file2.ts                                                     │
│                                                                         │
│  ⚡ Commands Run                                                        │
│  pnpm lint ✅ Passed                                                    │
│  pnpm test ✅ 15/15 passed                                              │
│  curl /api/issues/stats ✅ 200 OK                                       │
│                                                                         │
│  ⚠️ Failures (if any)                                                   │
│  <exact error + location>                                               │
│                                                                         │
│  📄 Updated Files                                                       │
│  ✅ docs/PENDING_MASTER.md                                              │
│  ✅ BACKLOG_AUDIT.json                                                  │
│  ✅ BACKLOG_AUDIT.md                                                    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### HARD CONSTRAINTS (CRITICAL — AUTO-FAIL IF VIOLATED)

| Constraint | Rule |
|------------|------|
| ❌ NO INVENTION | Only add items from PENDING_MASTER.md OR NEW findings from chat WITH code evidence |
| ✅ EVIDENCE REQUIRED | Every new finding needs: file path + line range, `evidenceSnippet` (≤25 words), `sourceRef` format, chat timestamp |
| 🔍 DEDUPE MANDATORY | Search by `externalId`/`key` + similarity before creating. If exists → UPDATE instead of duplicate |
| 📏 OUTPUT BREVITY | No large code blocks in chat. Apply changes in repo. Provide: changed files + commands + results only |
| 🕐 TIMEZONE | All timestamps in Asia/Riyadh (KSA) |
| 🎯 FOCUS | Focus exclusively on actual chat history — do not speculate or add information beyond what was actually discussed |

---

## Improvement Analysis Protocol (PERIODIC REVIEW)

### When to Execute
- After completing a major feature or fix cycle
- Weekly during active development
- Before any major release

### Analysis Categories (All findings go to MongoDB Issue Tracker)

#### 1. Areas for Improvement
| Check | Action |
|-------|--------|
| UX friction points | Log as `category: refactor`, `priority: P2-P3` |
| Missing features (user-requested) | Log as `category: feature`, with evidence of request |
| Industry trend alignment | Log as `category: enhancement`, `priority: P3` |

#### 2. Process Efficiency
| Check | Action |
|-------|--------|
| Workflow bottlenecks | Log as `category: ops`, include time impact |
| Manual steps to automate | Log as `category: automation`, include effort estimate |
| Slow CI/CD steps | Log as `category: ops`, include benchmark data |

#### 3. Bugs and Errors
| Check | Action |
|-------|--------|
| Known bugs | Log as `category: bug`, with severity + user impact |
| Error rates | Log as `category: bug`, include error counts/metrics |
| Debugging gaps | Log as `category: tests`, suggest debugging strategy |

#### 4. Logic Errors
| Check | Action |
|-------|--------|
| Algorithm flaws | Log as `category: logic`, with code evidence |
| Decision accuracy issues | Log as `category: logic`, include test case that fails |
| Edge cases not handled | Log as `category: logic`, with reproduction steps |

#### 5. Testing Recommendations
| Check | Action |
|-------|--------|
| Coverage gaps | Log as `category: tests`, list specific files/functions |
| Missing test types | Log as `category: tests`, specify unit/integration/e2e |
| Flaky tests | Log as `category: tests`, with failure frequency |

#### 6. Optional Enhancements
| Check | Action |
|-------|--------|
| Nice-to-have features | Log as `category: enhancement`, `priority: P3` |
| Performance optimizations | Log as `category: performance`, with benchmark |
| Code quality improvements | Log as `category: refactor`, `priority: P3` |

### DB Issue Format for All Findings
```json
{
  "title": "<clear descriptive title>",
  "category": "<bug|logic|tests|security|refactor|ops|enhancement|feature|automation|performance>",
  "priority": "<P0|P1|P2|P3>",
  "status": "open",
  "location": "<file:line or module>",
  "description": "<detailed description>",
  "evidenceSnippet": "<code or data evidence>",
  "sourceRef": "<analysis-type>:<date>:<agent-id>",
  "impact": "<user/system impact description>",
  "effort": "<low|medium|high>",
  "createdBy": "[AGENT-XXX-Y]",
  "createdAt": "<ISO timestamp>",
  "events": [
    { "type": "CREATED", "timestamp": "<ISO>", "by": "[AGENT-XXX-Y]" }
  ]
}
```

### Issue Lifecycle Tracking (ALL STATUS CHANGES LOGGED)
```
┌──────────┐    ┌─────────────┐    ┌──────────┐    ┌──────────┐
│  OPEN    │ →  │ IN_PROGRESS │ →  │ RESOLVED │ →  │ VERIFIED │
└──────────┘    └─────────────┘    └──────────┘    └──────────┘
     │                │                  │
     └────────────────┴──────────────────┘
                      ↓
               ┌──────────┐
               │ BLOCKED  │ (with blocker reason)
               └──────────┘
```

**Every transition MUST include:**
- `timestamp`: ISO format with KSA timezone
- `by`: Agent ID `[AGENT-XXX-Y]`
- `from`: Previous status
- `to`: New status
- `note`: Reason for change (commit, PR, blocker, etc.)

### Improvement Report Format (Append to PENDING_MASTER.md)
```markdown
### YYYY-MM-DD HH:mm (Asia/Riyadh) — Improvement Analysis
**Agent:** [AGENT-XXX-Y]
**Scope:** <module/feature analyzed>
**DB Issues Created/Updated:** N

**📊 Summary by Category:**
| Category | New | Updated | Total Open |
|----------|-----|---------|------------|
| Bugs | N | N | N |
| Logic | N | N | N |
| Tests | N | N | N |
| Refactor | N | N | N |
| Enhancement | N | N | N |

**🔴 P0/P1 Items (Immediate Action):**
- KEY — <title> — <action required>

**🟡 P2 Items (This Sprint):**
- KEY — <title>

**🟢 P3 Items (Backlog):**
- KEY — <title>
```

---

## 🔀 Agent Task Handoff Protocol (MANDATORY FOR CROSS-AGENT WORK)

### Purpose
When an agent discovers work that belongs to another agent's domain or finds issues that require delegation, the task MUST be formally handed off using this protocol.

### When to Handoff (REQUIRED)
```
┌─────────────────────────────────────────────────────────────────────────┐
│  HANDOFF TRIGGERS (Agent MUST delegate)                                │
├─────────────────────────────────────────────────────────────────────────┤
│  1. Issue is in another agent's locked file path                       │
│  2. Task requires domain expertise outside your assignment             │
│  3. Fix would impact multiple modules (needs coordination)             │
│  4. Issue is a P0/P1 security finding in critical path                │
│  5. Task is blocked by another agent's in-progress work                │
│  6. Deep-dive reveals issues in paths you don't own                    │
└─────────────────────────────────────────────────────────────────────────┘
```

### Handoff Process (STEP BY STEP)

**Step 1: Create Handoff Record in MongoDB SSOT**
```json
{
  "type": "handoff",
  "title": "<descriptive title>",
  "category": "bug|logic|tests|security|refactor|ops",
  "priority": "P0|P1|P2|P3",
  "status": "pending_handoff",
  "fromAgent": "[AGENT-XXX-Y]",
  "toAgent": "[AGENT-NNN-Z] | unassigned",
  "targetDomain": "<module/path>",
  "location": "<file:line>",
  "evidenceSnippet": "<≤25 words>",
  "sourceRef": "<handoff-source>",
  "reason": "<why this needs handoff>",
  "deadline": "<if P0/P1, specify urgency>",
  "dependencies": ["<list any blocking issues>"],
  "createdAt": "<ISO timestamp>",
  "events": [
    { "type": "HANDOFF_CREATED", "timestamp": "<ISO>", "by": "[AGENT-XXX-Y]" }
  ]
}
```

**Step 2: Update Assignment File**
```bash
# Add to /tmp/agent-assignments.json under "handoffs":
{
  "handoffs": {
    "HANDOFF-001": {
      "from": "AGENT-001-A",
      "to": "AGENT-002-A",
      "issue": "BUG-123",
      "status": "pending",
      "created": "2025-12-21T10:30:00Z"
    }
  }
}
```

**Step 3: Notify Target Agent (Format)**
```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔀 TASK HANDOFF NOTIFICATION                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  From: [AGENT-XXX-Y]                                                    │
│  To: [AGENT-NNN-Z]                                                      │
│  Handoff ID: HANDOFF-###                                                │
│                                                                         │
│  Issue: <ISSUE-ID> — <title>                                            │
│  Priority: P# — <urgency level>                                         │
│  Location: <file:line>                                                  │
│                                                                         │
│  Reason for Handoff:                                                    │
│  <why this belongs to target agent>                                     │
│                                                                         │
│  Context Provided:                                                      │
│  - Evidence: <snippet>                                                  │
│  - Related files: <list>                                                │
│  - Attempted fixes: <if any>                                            │
│                                                                         │
│  Expected Action:                                                       │
│  <what the receiving agent should do>                                   │
│                                                                         │
│  Deadline: <if P0/P1>                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

**Step 4: Update PENDING_MASTER.md**
```markdown
### YYYY-MM-DD HH:mm (Asia/Riyadh) — Handoff Created
**From:** [AGENT-XXX-Y]
**To:** [AGENT-NNN-Z]
**Issue:** <ISSUE-ID> — <title>
**Status:** Pending Pickup
```

### Receiving Agent Protocol (MANDATORY)
When an agent receives a handoff:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HANDOFF ACCEPTANCE CHECKLIST                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  1. □ Acknowledge receipt: Update MongoDB status → "accepted"           │
│  2. □ Claim the task: Add to your agent assignment                      │
│  3. □ Verify evidence: Check if sufficient context provided             │
│  4. □ If missing info: Request from source agent (don't block)          │
│  5. □ Start work: Follow standard Pre-Start Checklist                   │
│  6. □ On completion: Update handoff status → "completed"                │
│  7. □ Notify source agent: Send completion confirmation                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### Handoff Status Lifecycle
```
PENDING_HANDOFF → ACCEPTED → IN_PROGRESS → COMPLETED
       │              │           │
       └──────────────┴───────────┘
                      ↓
                 REJECTED (with reason)
                      ↓
                 ESCALATED (to Eng. Sultan)
```

### Agent Domain Mapping (Reference for Handoffs)

| Agent ID | Primary Domain | Handoff TO for: |
|----------|----------------|-----------------|
| AGENT-001 | Core/Auth/Middleware | Auth bugs, session issues, middleware |
| AGENT-002 | Finance/Billing | Payment bugs, ZATCA, invoicing |
| AGENT-003 | Souq/Marketplace | Product catalog, orders, vendors |
| AGENT-004 | Aqar/Real Estate | Listings, packages, valuations |
| AGENT-005 | HR/Payroll | Employee data, attendance, payroll |
| AGENT-006 | Tests/Scripts | Test infrastructure, tooling |

---

## 🎯 Pending Backlog Extractor Protocol v2.5 (SSOT-Integrated)

### Purpose
This protocol enables any agent to parse `PENDING_MASTER.md` and produce a deduplicated backlog of unresolved items, ready for sprint planning and MongoDB SSOT import.

### HARD CONSTRAINTS (VIOLATION = FAILURE)
```
┌─────────────────────────────────────────────────────────────────────────┐
│  EXTRACTOR RULES (NON-NEGOTIABLE)                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  1. ❌ NO INVENTION — Extract ONLY what exists in source text           │
│  2. ❌ NO COMPLETED — Exclude ✅/🟢 or Fixed/Done/Resolved/Closed       │
│  3. ❌ NO NEW WORK — Triage only; no proposing new tasks                │
│  4. ✅ SOURCE TRACEABILITY — Every item needs:                          │
│       - Source Ref (section/date heading)                               │
│       - file:lines OR Doc-only                                          │
│       - Evidence Snippet (≤25 words exact from source)                  │
│  5. ✅ AGENT ID REQUIRED — Every extraction tagged with [AGENT-XXX-Y]   │
└─────────────────────────────────────────────────────────────────────────┘
```

### INPUT REQUIREMENT
If `PENDING_MASTER.md` content is not present:
```
"Please paste the full contents of PENDING_MASTER.md so I can extract pending items."
```
Then STOP. Do not proceed without source content.

### OPTIONAL FLAGS (Apply AFTER extraction + dedupe)
```
--format=markdown|json|both       (default: both)
--priority=P0,P1,P2,P3           (filter by priority)
--category=bugs,logic,tests,efficiency,next_steps
--quick-wins-only                (Effort ≤ S AND Priority P0–P2)
--stale-only=7                   (only if dates exist)
--limit=50                       (limits DISPLAY only; JSON has ALL)
--query="file:<text> priority:P0 tag:SECURITY text:'orgId'"
--sync                           (if import endpoint documented)
--agent=[AGENT-XXX-Y]            (tag extraction with agent ID)
```

### WHAT TO EXTRACT (INCLUDE)
Extract items that are:
- Marked: 🔲, 🟡, ⏳, ⚠️, 🟠, 🔴
- Keywords: TODO, Pending, Open, Investigate, In Progress, Needs, Missing, Gap
- Unchecked tasks: `- [ ] ...`
- Items under: "Next Steps", "Planned Next Steps" (if not marked done)

### WHAT TO SKIP (EXCLUDE)
Skip items marked/stated: ✅, 🟢, Fixed, Done, Completed, Resolved, Landed, Added, Closed
**Exception:** Include if later explicitly reopened ("reopened", "still failing", "regressed")

### REQUIRED FIELDS PER ITEM

| Field | Description |
|-------|-------------|
| `key` | Stable identifier (externalId OR normalized hash) |
| `externalId` | BUG-XXX, LOGIC-XXX, SEC-XXX if exists; else null |
| `displayRef` | externalId OR generated REF-### |
| `title` | From source |
| `issue` | Issue description from source |
| `action` | Action from source OR "Not specified in source" |
| `location` | file:lines OR "Doc-only" |
| `sourceRef` | Section/date heading |
| `evidenceSnippet` | ≤25 words exact from source |
| `status` | pending, in_progress, blocked, unknown |
| `category` | Bugs, Logic Errors, Missing Tests, Efficiency, Next Steps |
| `priority` | P0, P1, P2, P3 (using rules below) |
| `riskTags` | SECURITY, MULTI-TENANT, FINANCIAL, TEST-GAP, PERF, INTEGRATION, DATA |
| `effort` | XS, S, M, L, XL, or ? |
| `impact` | 1-10 (computed) |
| `impactBasis` | Why impact was computed |
| `sprintBucket` | This Sprint, Next Sprint, Backlog |
| `extractedBy` | [AGENT-XXX-Y] |

### DEDUPLICATION RULES (DETERMINISTIC)
Merge order:
1. Same explicit ID (BUG-XXXX, LOGIC-XXX, SEC-XXX, etc.)
2. Same `file + line range`
3. Same `file + normalized issue text`

For merged items track:
- `firstSeen` (earliest date header or "First seen unknown")
- `lastSeen` (latest date header or "Last seen unknown")
- `mentions` (count merged)

### KEY + REF GENERATION
```
IF externalId exists:
  key = externalId
  displayRef = externalId
ELSE:
  externalId = null
  key = sha256(normalize(title + "|" + category + "|" + location))[:12]
  displayRef = "REF-###" (sequential by first appearance)
```

### PRIORITY RULES (DETERMINISTIC)
Use explicit P0/P1/P2/P3 if present; else infer from keywords:
- **P0 (🔴):** security, data leak, cross-tenant, RBAC bypass, privilege escalation, fail-open
- **P1 (🟠):** authorization/ownership correctness, compliance, logic errors affecting correctness
- **P2 (🟡):** missing tests, performance, validation gaps
- **P3 (🟢):** refactor, cleanup, docs, nice-to-have

### IMPACT SCORE (1-10, Deterministic)
```
Base by priority: P0=9, P1=7, P2=5, P3=3
Modifiers:
  +2 if SECURITY
  +2 if MULTI-TENANT
  +1 if FINANCIAL
  +1 if DATA
  +2 if "production down" / "outage" / "cannot login"
Cap at 10.
```

### EFFORT ESTIMATION
```
XS: one-liner/config
S:  single-file change
M:  multi-file OR add new test file
L:  cross-module
XL: architectural/migration
?:  scope unclear (add to Open Questions)
```

### SPRINT BUCKETS
```
This Sprint: P0–P1 AND Effort ≤ M (or Effort unknown but Priority P0)
Next Sprint: P2 AND Effort ≤ L
Backlog:     P3 OR Effort > L OR status=blocked OR unknown
```

### OUTPUT FORMAT

**A) BACKLOG_AUDIT.json (Machine-readable)**
```json
{
  "extracted_at": "YYYY-MM-DD HH:mm (Asia/Riyadh)",
  "extracted_by": "[AGENT-XXX-Y]",
  "source_file": "PENDING_MASTER.md",
  "applied_flags": {},
  "counts": {
    "total": 0,
    "by_priority": {"P0": 0, "P1": 0, "P2": 0, "P3": 0},
    "by_category": {},
    "quick_wins": 0,
    "anomalies": 0
  },
  "anomalies": [],
  "file_heat_map": [],
  "issues": [],
  "open_questions": []
}
```

**B) BACKLOG_AUDIT.md (Human Report)**
```markdown
# Backlog Audit Report

**Extracted At:** YYYY-MM-DD HH:mm (Asia/Riyadh)
**Extracted By:** [AGENT-XXX-Y]
**Source:** PENDING_MASTER.md

## 1) Executive Summary
- Total Pending Items: N
- By Priority: P0: X / P1: Y / P2: Z / P3: W
- Avg Impact: X.X
- Quick Wins Count: N
- Anomalies Count: N

## 2) Category Breakdown
| Category | P0 | P1 | P2 | P3 | Total | Avg Impact |
|----------|----|----|----|----|-------|------------|

## 3) File Heat Map (Top 10)
| Rank | File Path | Bugs | Logic | Tests | Total | Anomaly? |
|------|-----------|------|-------|-------|-------|----------|

## 4) Sprint Buckets
- This Sprint: N
- Next Sprint: N
- Backlog: N

## 5) Tables by Category

### Bugs
| ID/Ref | Key | Location | Issue | Priority | Effort | Risk Tags | Impact | Status |

### Logic Errors
(same columns)

### Missing Tests
| ID/Ref | Key | Area | Gap | Location | Priority | Effort | Risk Tags | Impact |

### Efficiency
| ID/Ref | Key | Location | Issue | Priority | Effort | Risk Tags | Impact |

### Next Steps
| # | ID/Ref | Key | Task | Priority | Effort | Dependencies | Status | DoD |

## 6) Quick Wins
| ID/Ref | Key | Task | Effort | Priority | Impact | Immediate Action |

## 7) Open Questions
| Key | Missing Fields | Information Needed |
```

### POST-EXTRACTION: SYNC TO MONGODB SSOT

After generating BACKLOG_AUDIT.json:
```
1. Call: POST /api/issues/import
   Body: { issues: [...], extractedBy: "[AGENT-XXX-Y]" }

2. Capture results:
   { created: N, updated: N, skipped: N, errors: N }

3. Update PENDING_MASTER.md with sync status

4. Output sync report in final summary
```

### ANOMALY DETECTION (ANNOTATE ONLY)
Flag patterns but do NOT create new tasks:
- `Anomaly: Repeated file` — ≥3 pending items share same file path
- `Anomaly: Repeated theme` — ≥3 items share normalized keyword (e.g., "org scoping", "fail-open")

---

## Manual chat prompt (when not using /fixzit-audit)
Audit the selected/open files and Problems panel items using the Fixzit Evidence Protocol:
1) Build an Issues Ledger (source + verbatim message + file+lines).
2) Quote exact triggering code for each item and classify: CONFIRMED (>=80%), FALSE POSITIVE, or NEEDS EVIDENCE.
3) Patch CONFIRMED items only using best-practice root fixes (config -> code -> narrow suppression with justification).
4) Output ONE Markdown report with unified diffs, full updated files (only changed), and validation commands (do not assume results).
End with "Merge-ready for Fixzit Phase 1 MVP."

---

## 📌 Quick Reference: Agent Token Format

Throughout this document, the agent token format is:
```
[AGENT-XXX-Y]

Where:
  XXX = Agent type number (001-006)
  Y   = Instance letter (A, B, C, ...)

Examples:
  [AGENT-001-A] = VS Code Copilot, instance A
  [AGENT-002-B] = Claude Code, instance B
  [AGENT-003-A] = Codex, instance A
```

**Always use this format in:**
- SSOT records (MongoDB + PENDING_MASTER.md)
- Commit messages
- PR descriptions
- Handoff notifications
- Extraction reports
- Any agent output or log

---

END OF AGENTS.md v5.5
