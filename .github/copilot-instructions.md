# Fixzit Copilot Instructions (Aligned to AGENTS.md v7.0)

## 🚨 HARD GATE - NO EXCEPTIONS

# ⛔ YOU MUST READ docs/AGENTS.md BEFORE ANY WORK

**This is NON-NEGOTIABLE. Failure to read AGENTS.md = ALL work rejected by user.**

### FIRST ACTION IN EVERY SESSION:

```
Execute: read_file tool on docs/AGENTS.md, lines 1-1000
Then state: "AGENTS.md read. Agent Token: [AGENT-001-A]"
```

### If You Skip This Step:
- ❌ User WILL reject all your work
- ❌ All commits will be reverted
- ❌ You will waste the user's time and money

---

## 🔒 MANDATORY ENFORCEMENT CHECKLIST

Before ANY code change, file edit, or terminal command:

| # | Action | Command | Required |
|---|--------|---------|----------|
| 1 | **Read AGENTS.md** | `read_file: docs/AGENTS.md, lines 1-1000` | ✅ MANDATORY |
| 2 | **State Agent Token** | "Agent Token: [AGENT-001-A]" | ✅ MANDATORY |
| 3 | **Git Preflight** | `git fetch origin && git rev-list --left-right --count origin/main...HEAD` | ✅ MANDATORY |
| 4 | **Verify not behind** | If behind > 0, STOP and pull | ✅ MANDATORY |
| 5 | **Run LOCAL CI** | `pnpm typecheck && pnpm lint && pnpm vitest run && pnpm build` | ✅ MANDATORY |
| 6 | **LOG TO SSOT** | Log every issue to MongoDB Issue Tracker BEFORE fixing | ✅ MANDATORY |

**SKIP ANY STEP = USER REJECTS ALL WORK**

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
   - Agent Token `[AGENT-XXX-X]`
   - Priority (P0/P1/P2/P3)
   - Category (BUG/FEAT/REFACTOR/INFRA)
4. **Get Issue ID** before starting fix
5. **Reference Issue ID** in all commits: `[ISSUE-XXX]`

### Forbidden:
- ❌ Fixing code without SSOT entry
- ❌ "Silent fixes" with no tracking
- ❌ Claiming "it was already logged" without verification
- ❌ Logging after the fix is complete (log BEFORE)

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

### Terminal Cleanup (Run at task end):
```powershell
# Windows: Kill orphaned PowerShell terminals (keeps current)
Get-Process powershell | Where-Object { $_.Id -ne $PID } | Stop-Process -Force
```

### Forbidden:
- ❌ Reusing terminals from other sessions
- ❌ Leaving orphaned terminals after task completion
- ❌ Running commands in another agent's terminal
- ❌ Killing the Dev Server terminal

See docs/AGENTS.md Section 5.8 for the full Terminal Management Protocol.
