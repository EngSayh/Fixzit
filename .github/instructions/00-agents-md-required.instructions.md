---
name: AGENTS.md Required Reading
description: Enforces reading docs/AGENTS.md before any task. This is the FIRST instruction file loaded.
applyTo: "**/*"
---

# ⛔ HARD GATE - NO WORK UNTIL AGENTS.md IS READ

## 🚨 MANDATORY ENFORCEMENT PROTOCOL

**DO NOT proceed with ANY task, fix, or response until you have:**

1. **Called `read_file` on `docs/AGENTS.md` lines 1-1000** in THIS session
2. **Obtained UNIQUE session token from SSOT** (query `db.agent_sessions` for next number)
3. **Confirmed reading** by stating: "AGENTS.md read. Agent Token: [AGENT-XXXX]" (where XXXX is YOUR unique session number)

### If You Have NOT Read AGENTS.md This Session:

```
STOP. Execute this FIRST:
read_file: docs/AGENTS.md, lines 1-1000
```

**Failure to read AGENTS.md = AUTO-FAIL. User will reject all work.**

---

## 🔒 ENFORCEMENT CHECKLIST (Every Session)

Before ANY code change, file edit, or terminal command:

| Step | Action | Required |
|------|--------|----------|
| 1 | Read `docs/AGENTS.md` lines 1-1000 | ✅ MANDATORY |
| 2 | **Query SSOT for next session number** | ✅ MANDATORY |
| 3 | State UNIQUE Agent Token: `[AGENT-XXXX]` | ✅ MANDATORY |
| 4 | Run `git fetch origin` | ✅ MANDATORY |
| 5 | Verify not behind origin/main | ✅ MANDATORY |
| 6 | Run `pnpm typecheck && pnpm lint` | ✅ MANDATORY |
| 7 | **LOG ISSUE TO SSOT BEFORE ANY FIX** | ✅ MANDATORY |

⚠️ **CRITICAL: Token `[AGENT-001-A]` is FORBIDDEN** — this was the old format.
Each session MUST have a unique sequential number from SSOT.

**If ANY step is skipped → User WILL reject ALL work**

---

## 📋 SSOT LOGGING PROTOCOL (MANDATORY)

**⚠️ BEFORE fixing ANY issue, you MUST log it to the MongoDB Issue Tracker (SSOT).**

### Why This Matters:
- User cannot track what was fixed without SSOT entries
- Changes without SSOT logging are untraceable
- Prevents "ghost fixes" that get lost or regress

### SSOT Logging Steps:

1. **Identify the issue** clearly (what, where, why)
2. **Log to SSOT FIRST** before any code change:
   ```bash
   # Use the issue tracker API or direct MongoDB entry
   # Example: POST /api/issues with issue details
   ```
3. **Include in log**:
   - Issue title and description
   - Affected files/components
   - Root cause analysis
   - Agent Token `[AGENT-XXXX]` (YOUR unique session number)
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

### At Task End (MANDATORY):
```powershell
# Windows: Kill orphans
Get-Process powershell | Where-Object { $_.Id -ne $PID } | Stop-Process -Force
```

See **docs/AGENTS.md Section 5.8** for the complete Terminal Management Protocol.
