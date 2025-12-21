# Fixzit - Agent Working Agreement v5.3 (Codex + VS Code + Claude Code)

Owner: Eng. Sultan Al Hassni  
System: Fixzit Facility-Management + Marketplace (Fixzit Souq) + Real Estate (Aqar)  
Stack: Next.js App Router + TypeScript + MongoDB Atlas/Mongoose + Tailwind/shadcn + Vitest (+ Playwright if enabled)

NON-NEGOTIABLE. Violations = AUTO-FAIL.

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
┌─────────────────────────────────────────────────────────────┐
│  AGENT POST-TASK PROTOCOL (Required for ALL agents)        │
├─────────────────────────────────────────────────────────────┤
│  1. □ Run: pnpm typecheck (must pass - 0 errors)            │
│  2. □ Run: pnpm lint (must pass - 0 warnings)               │
│  3. □ Run: pnpm vitest run --reporter=dot (tests green)     │
│  4. □ Check git status - commit all changes                 │
│  5. □ Create PR if not exists (or push to existing PR)      │
│  6. □ Clean up: remove any temp files, debug logs           │
│  7. □ Release lock: update /tmp/agent-assignments.json      │
│  8. □ Announce: "[AGENT-XXX-Y] Complete. PR: #XXX"          │
│  9. □ TRIGGER AUTO-REVIEW (see below) — WAIT for feedback   │
│ 10. □ DO NOT close task - only Eng. Sultan approves closure │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Auto-Review Protocol (MANDATORY AFTER EVERY TASK)

### Trigger Condition
After completing ANY task (code changes, fixes, features), the agent MUST trigger an automatic review request to Codex using the HIGH REASONING model.

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

### Wait for Review
- Agent MUST wait for Codex review response before announcing completion
- If review not received within 5 minutes, proceed with warning note
- All review feedback logged to PR comments

### Agent Lifecycle (ENFORCED)

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│  1. CLAIM  │ ──▶ │  2. WORK   │ ──▶ │  3. VERIFY │ ──▶ │ 4. REVIEW  │ ──▶ │ 5. CLEANUP │
│            │     │            │     │            │     │            │     │            │
│ Read JSON  │     │ Edit files │     │ typecheck  │     │ Trigger    │     │ Commit all │
│ Pick slot  │     │ Small cmts │     │ lint       │     │ Codex      │     │ Create PR  │
│ Lock files │     │ Test often │     │ tests      │     │ Wait resp  │     │ Release    │
│ Announce   │     │ No mess    │     │ git status │     │ Handle FB  │     │ Announce   │
└────────────┘     └────────────┘     └────────────┘     └────────────┘     └────────────┘
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

## SSOT Backlog Sync Protocol (AFTER EVERY CODE REVIEW)

### Single Source of Truth (NON-NEGOTIABLE)
- **MongoDB Issue Tracker** is the ONLY SSOT for all issues/tasks
- `docs/PENDING_MASTER.md` is a derived log/snapshot ONLY
- **NEVER** record a new issue ONLY in PENDING_MASTER.md — it MUST exist in MongoDB

### When to Execute This Protocol
Execute after EVERY code review session, fix session, or task completion.

### Step 1: Discovery
```bash
# Confirm Issue Tracker components exist:
- Issue model: server/models/Issue.ts
- Import endpoint: POST /api/issues/import
- Stats endpoint: GET /api/issues/stats
- CRUD endpoints: /api/issues and /api/issues/[id]
```

### Step 2: Backlog Audit (Extract from PENDING_MASTER.md)
Generate/update these artifacts:
- `docs/BACKLOG_AUDIT.json` (machine-ready)
- `docs/BACKLOG_AUDIT.md` (human checklist)

**Extraction Rules:**
- Only OPEN/PENDING/UNRESOLVED items
- Exclude ✅ 🟢 Done/Fixed/Resolved/Completed
- Every item MUST include: `sourceRef` + `evidenceSnippet`
- Key format: `externalId` if exists, else `normalize(title|category|location)`

### Step 3: DB Sync (Idempotent)
```bash
# Import into MongoDB:
POST /api/issues/import { issues: [...] }

# Capture results:
{ created: N, updated: N, skipped: N, errors: N }
```

### Step 4: Apply Today's Review Outcomes to DB

| Outcome | DB Action | Event Type |
|---------|-----------|------------|
| Issue FIXED | status → `resolved` | STATUS_CHANGED |
| Work started | status → `in_progress` | STATUS_CHANGED |
| Blocked | status → `blocked` + blocker reason | UPDATED |

**Every status change MUST include:**
- Timestamp (KSA timezone: Asia/Riyadh)
- Agent ID who made the change
- Reference to commit/PR if applicable

### Step 5: Create DB Issues for NEW Findings (EVIDENCE REQUIRED)
For new issues discovered during code review:

```json
{
  "title": "<descriptive title>",
  "category": "bug | logic | tests | security | refactor | ops",
  "priority": "P0 | P1 | P2 | P3",
  "location": "<file path>",
  "sourcePath": "code-review",
  "sourceRef": "code-review:<file>:<lineStart>-<lineEnd>",
  "evidenceSnippet": "<max 25 words exact code>",
  "createdBy": "[AGENT-XXX-Y]",
  "createdAt": "<ISO timestamp>"
}
```

**DEDUPE RULE:** Search DB for similar title/location BEFORE creating. Update existing if found.

### Step 6: Update docs/PENDING_MASTER.md (Derived Log)
Append changelog entry (do NOT rewrite entire file):

```markdown
### YYYY-MM-DD HH:mm (Asia/Riyadh) — Code Review Update
**Context:** <branch> | <commit> | <PR #>
**Agent:** [AGENT-XXX-Y]
**DB Sync:** created=N, updated=N, skipped=N, errors=N

**✅ Resolved Today (DB SSOT):**
- KEY1 — <title> (files: ...)

**🟠 In Progress:**
- KEY2 — <title>

**🔴 Blocked:**
- KEY3 — <title> — blocker: <reason>

**🆕 New Findings Added to DB (with evidence):**
- KEY4 — <title> — sourceRef: code-review:<file>:<lines>

**Next Steps (ONLY from DB items above):**
- KEY... — <action>
```

### Step 7: Verification
```bash
pnpm lint                    # Must pass
pnpm test                    # Must pass
curl /api/issues/stats       # Confirm 200 OK
# Confirm no duplicates in import result
```

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

## Manual chat prompt (when not using /fixzit-audit)
Audit the selected/open files and Problems panel items using the Fixzit Evidence Protocol:
1) Build an Issues Ledger (source + verbatim message + file+lines).
2) Quote exact triggering code for each item and classify: CONFIRMED (>=80%), FALSE POSITIVE, or NEEDS EVIDENCE.
3) Patch CONFIRMED items only using best-practice root fixes (config -> code -> narrow suppression with justification).
4) Output ONE Markdown report with unified diffs, full updated files (only changed), and validation commands (do not assume results).
End with "Merge-ready for Fixzit Phase 1 MVP."
