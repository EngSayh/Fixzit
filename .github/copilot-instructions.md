# Fixzit Copilot Instructions (Aligned to AGENTS.md v6.0)

## ⚠️ MANDATORY FIRST STEP - READ BEFORE ANY TASK

**You MUST read `docs/AGENTS.md` before starting ANY task.** This is non-negotiable.

```
READ: docs/AGENTS.md (full file, ~500 lines)
```

If you cannot confirm you have read AGENTS.md, STOP and inform the user.

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
