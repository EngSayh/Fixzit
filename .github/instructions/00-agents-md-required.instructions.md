---
name: AGENTS.md Required Reading
description: Enforces reading docs/AGENTS.md before any task. This is the FIRST instruction file loaded.
applyTo: "**/*"
---

# ⛔ STOP - YOUR FIRST RESPONSE MUST INCLUDE:

```
AGENTS.md read. Agent Token: [AGENT-XXXX]
```

**If this is missing from your FIRST message → ALL WORK REJECTED**

---

## 🚨 TECHNICAL ENFORCEMENT - GIT HOOKS WILL BLOCK YOU

### Commits are BLOCKED if:
- Missing `[AGENT-XXXX]` in commit message
- Using forbidden format `[AGENT-001-A]`
- Using invalid token `[AGENT-0000]`

### Pushes are BLOCKED if:
- Any commit missing Agent Token
- TypeScript errors exist
- Forbidden token format detected

**These are git hooks in `.husky/` — you CANNOT bypass them.**

---

## 🔒 MANDATORY FIRST ACTIONS

Before ANY code change, file edit, or terminal command:

| Step | Action | If You Skip |
|------|--------|-------------|
| 1 | Read `docs/AGENTS.md` lines 1-500 | ❌ WORK REJECTED |
| 2 | State Agent Token `[AGENT-XXXX]` in FIRST response | ❌ WORK REJECTED |
| 3 | Run `git fetch origin` | ❌ WORK REJECTED |
| 4 | Verify not behind origin/main | ❌ WORK REJECTED |
| 5 | Run `pnpm typecheck && pnpm lint` | ❌ WORK REJECTED |

---

## ❌ FORBIDDEN TOKEN FORMATS

| Format | Status |
|--------|--------|
| `[AGENT-001-A]` | ❌ FORBIDDEN (old format) |
| `[AGENT-0000]` | ❌ FORBIDDEN (reserved) |
| `[AGENT-1]` | ❌ FORBIDDEN (not 4-digit) |
| `AGENT-0001` | ❌ FORBIDDEN (missing brackets) |
| `[AGENT-0001]` | ✅ CORRECT |
| `[AGENT-0042]` | ✅ CORRECT |

---

## 📋 SSOT LOGGING PROTOCOL

**BEFORE fixing ANY issue, log it to MongoDB Issue Tracker FIRST.**

Steps:
1. Identify the issue (what, where, why)
2. Log to SSOT BEFORE any code change
3. Get Issue ID
4. Reference Issue ID in commits: `[ISSUE-XXX]`

### Forbidden:
- ❌ Fixing code without SSOT entry
- ❌ "Silent fixes" with no tracking
- ❌ Logging AFTER the fix is complete

---

## Key Protocols from AGENTS.md

| Protocol | Requirement |
|----------|-------------|
| Agent Token | **UNIQUE per session** `[AGENT-XXXX]` from SSOT auto-increment |
| Token Format | `[AGENT-0001]`, `[AGENT-0002]`, etc. (sequential) |
| Pre-claim | `git fetch origin && git rev-list --left-right --count origin/main...HEAD` |
| SSOT | MongoDB Issue Tracker is source of truth (not PENDING_MASTER.md) |
| Verification | Run `pnpm typecheck && pnpm lint` before any claim |
| Handoff | Include "Final Output" box for user |

⚠️ **OLD FORMAT FORBIDDEN:** `[AGENT-001-A]`, `[AGENT-002-B]`, etc. are NO LONGER VALID.

## Non-Negotiable Rules

- ❌ No `@ts-ignore` without ticket
- ❌ No `as any` casts
- ❌ No hardcoded IDs or hex colors
- ❌ No force merges
- ❌ No silent error swallowing
- ✅ All queries must include `org_id`/`tenantId`
- ✅ All commits must pass CI gates
- ✅ All PRs must address ALL comments before merge

## 🖥️ Terminal Management (MANDATORY)

**ALWAYS follow these terminal rules:**

| Rule | Requirement |
|------|-------------|
| **Create New** | ALWAYS create a NEW terminal for your work |
| **Never Reuse** | NEVER use existing/shared terminals |
| **Kill Orphans** | ALWAYS kill orphaned terminals at task completion |
| **Preserve Dev Server** | NEVER kill the `Dev: Start Server` terminal |
| **Limit 3** | MAX 3 concurrent terminals per session |

### 🔒 Dev Server Protection (NON-NEGOTIABLE)

**The dev server on localhost:3000 MUST be running at ALL times.**

| Requirement | Details |
|-------------|---------|
| **Auto-Start** | Dev server starts automatically when workspace opens |
| **Single Instance** | Only ONE dev server terminal allowed |
| **NEVER Kill** | Agents MUST NEVER kill the dev server terminal |
| **Verify at Start** | Check port 3000 is alive before any work |

**At session start, verify dev server:**
```powershell
(Test-NetConnection -ComputerName localhost -Port 3000).TcpTestSucceeded
# If FALSE → Run VS Code task "Dev: Start Server"
```

### At Task End (MANDATORY):
```powershell
# Windows: Kill orphans BUT PROTECT dev server on port 3000
$devPID = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess
Get-Process powershell | Where-Object { $_.Id -ne $PID -and $_.Id -ne $devPID } | Stop-Process -Force
```

See **docs/AGENTS.md Section 5.8** for the complete Terminal Management Protocol.
