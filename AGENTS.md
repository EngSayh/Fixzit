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
│  9. □ DO NOT close task - only Eng. Sultan approves closure │
└─────────────────────────────────────────────────────────────┘
```

### Agent Lifecycle (ENFORCED)

```
┌────────────┐     ┌────────────┐     ┌────────────┐     ┌────────────┐
│  1. CLAIM  │ ──▶ │  2. WORK   │ ──▶ │  3. VERIFY │ ──▶ │ 4. CLEANUP │
│            │     │            │     │            │     │            │
│ Read JSON  │     │ Edit files │     │ typecheck  │     │ Commit all │
│ Pick slot  │     │ Small cmts │     │ lint       │     │ Create PR  │
│ Lock files │     │ Test often │     │ tests      │     │ Release    │
│ Announce   │     │ No mess    │     │ git status │     │ Announce   │
└────────────┘     └────────────┘     └────────────┘     └────────────┘
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

## Manual chat prompt (when not using /fixzit-audit)
Audit the selected/open files and Problems panel items using the Fixzit Evidence Protocol:
1) Build an Issues Ledger (source + verbatim message + file+lines).
2) Quote exact triggering code for each item and classify: CONFIRMED (>=80%), FALSE POSITIVE, or NEEDS EVIDENCE.
3) Patch CONFIRMED items only using best-practice root fixes (config -> code -> narrow suppression with justification).
4) Output ONE Markdown report with unified diffs, full updated files (only changed), and validation commands (do not assume results).
End with "Merge-ready for Fixzit Phase 1 MVP."
