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

See docs/AGENTS.md for the full protocol (Agent Token, SSOT claim, handoff, extractor, CI gates).
