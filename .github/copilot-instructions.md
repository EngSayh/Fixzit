# Fixzit Copilot Instructions (Aligned to AGENTS.md v7.0)

## ⛔ STOP - READ THIS FIRST - HARD GATE

# 🚨 YOUR FIRST MESSAGE MUST BE:

```
AGENTS.md read. Agent Token: [AGENT-XXXX]

Session Details:
- Token obtained from: SSOT db.agent_sessions  
- Current session number: XXXX
- Branch: [current branch]
- Behind origin/main: 0
```

**If your first response does NOT include this → USER WILL IMMEDIATELY REJECT ALL WORK**

---

## ⛔ TECHNICAL ENFORCEMENT (GIT HOOKS WILL BLOCK YOU)

The following git hooks WILL REJECT your commits/pushes:

### `.husky/commit-msg` — Blocks commits without:
- ❌ Missing `[AGENT-XXXX]` token → **COMMIT REJECTED**
- ❌ Old format `[AGENT-001-A]` → **COMMIT REJECTED**
- ❌ Token `[AGENT-0000]` → **COMMIT REJECTED**

### `.husky/pre-push` — Blocks pushes without:
- ❌ Any commit missing Agent Token → **PUSH REJECTED**
- ❌ Old format tokens detected → **PUSH REJECTED**
- ❌ TypeScript errors → **PUSH REJECTED**

**You CANNOT bypass these hooks. They are technical enforcement.**

---

## 🔒 MANDATORY FIRST ACTIONS (IN ORDER)

| # | Action | You MUST Do This | If You Skip |
|---|--------|------------------|-------------|
| 1 | **Read AGENTS.md** | `read_file: docs/AGENTS.md, lines 1-500` | ❌ REJECTED |
| 2 | **State Token** | "Agent Token: [AGENT-XXXX]" in FIRST response | ❌ REJECTED |
| 3 | **Git Preflight** | `git fetch origin && git status` | ❌ REJECTED |
| 4 | **Verify not behind** | If behind > 0, PULL first | ❌ REJECTED |
| 5 | **Run LOCAL CI** | `pnpm typecheck && pnpm lint` | ❌ REJECTED |

⚠️ **Token Format:** `[AGENT-0001]` through `[AGENT-9999]` (4-digit sequential)
❌ **FORBIDDEN:** `[AGENT-001-A]`, `[AGENT-0000]`, any non-4-digit format

---

## 📋 SSOT LOGGING PROTOCOL (MANDATORY)

**⚠️ BEFORE fixing ANY issue, you MUST log it to the MongoDB Issue Tracker (SSOT).**

### Why This Matters:
- User cannot track what was fixed without SSOT entries
- Changes without SSOT logging are untraceable
- Prevents "ghost fixes" that get lost or regress

### SSOT Logging Steps:

1. **Identify the issue** clearly (what, where, why)
2. **Log to SSOT FIRST** before any code change
3. **Include in log**:
   - Issue title and description
   - Affected files/components
   - Root cause analysis
   - Agent Token `[AGENT-XXXX]` (YOUR unique sequential number)
   - Priority (P0/P1/P2/P3)
   - Category (BUG/FEAT/REFACTOR/INFRA)
4. **Get Issue ID** before starting fix
5. **Reference Issue ID** in all commits: `[ISSUE-XXX]`

### Forbidden:
- ❌ Fixing code without SSOT entry
- ❌ "Silent fixes" with no tracking
- ❌ Claiming "it was already logged" without verification
- ❌ Logging after the fix is complete (log BEFORE)
- ❌ Using `[AGENT-001-A]` or any hardcoded default token

---

## 🏠 LOCAL CI FIRST (PRIORITY OVER GITHUB CI)

**NEVER rely on GitHub CI to catch errors. Run ALL checks locally FIRST.**

```bash
# MANDATORY Local CI Loop (run before ANY push)
pnpm install
pnpm typecheck        # 0 errors required
pnpm lint             # 0 errors required  
pnpm vitest run       # All tests must pass
pnpm build            # Must complete successfully
```

| Priority | Check | Requirement |
|----------|-------|-------------|
| 1 | **Local TypeCheck** | Run `pnpm typecheck` - 0 errors |
| 2 | **Local Lint** | Run `pnpm lint` - 0 errors |
| 3 | **Local Tests** | Run `pnpm vitest run` - All pass |
| 4 | **Local Build** | Run `pnpm build` - Success |
| 5 | GitHub CI | Only after local passes |

**If local CI fails → FIX BEFORE PUSH. Do NOT push and wait for GitHub CI.**

---

AGENTS.md is the single source of truth. If anything here conflicts with AGENTS.md, AGENTS.md wins.

Core rules (non-negotiable):
- SSOT: MongoDB Issue Tracker only; docs/PENDING_MASTER.md is derived.
- Agent Token required in claims, commits, PRs, and SSOT events.
- Pre-claim: run git preflight and SSOT validation; do not work if behind origin/main.
- No silent errors, no @ts-ignore without ticket, no as any, no hardcoded IDs.
- Multi-tenant scoping required on all queries (org_id/tenantId).
- No hardcoded hex colors; use tokens; RTL logical classes only.
- Do not edit build outputs; no force merge.
- Verification: run required checks in AGENTS.md and report evidence.

## 🖥️ TERMINAL MANAGEMENT (MANDATORY)

**These rules are NON-NEGOTIABLE for all Copilot agents:**

1. **ALWAYS create a NEW terminal** — Never reuse existing terminals
2. **NEVER use shared terminals** — Other agents/extensions may own them
3. **KILL orphaned terminals on task completion** — Default behavior, not optional
4. **PRESERVE the Dev Server terminal** — Never kill `Dev: Start Server`
5. **MAX 3 terminals per agent session** — Prevent resource exhaustion

### 🔒 Dev Server Protection (CRITICAL)

**The dev server on localhost:3000 MUST ALWAYS be running.**

- **Auto-starts** when VS Code opens the workspace
- **Single instance only** — no duplicates
- **NEVER kill** the dev server terminal
- **Verify at session start**: `Test-NetConnection localhost -Port 3000`

**If dev server is down:** Run VS Code task `Dev: Restart Server`

### Terminal Cleanup (Run at task end):
```powershell
# Windows: Kill orphaned PowerShell terminals (keeps current AND dev server)
$devPID = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess
Get-Process powershell | Where-Object { $_.Id -ne $PID -and $_.Id -ne $devPID } | Stop-Process -Force
```

### Forbidden:
- ❌ Reusing terminals from other sessions
- ❌ Leaving orphaned terminals after task completion
- ❌ Running commands in another agent's terminal
- ❌ Killing the Dev Server terminal

See docs/AGENTS.md Section 5.8 for the full Terminal Management Protocol.
