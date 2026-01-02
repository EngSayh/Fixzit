---
name: AGENTS.md Required Reading
description: Enforces reading docs/AGENTS.md before any task. This is the FIRST instruction file loaded.
applyTo: "**/*"
---

# ⛔ STOP - READ AGENTS.md FIRST

Before proceeding with ANY task, you MUST:

1. **Read `docs/AGENTS.md`** - The complete file (~500 lines)
2. **Confirm understanding** of:
   - Agent Token protocol (e.g., `[AGENT-001-A]`)
   - SSOT claim workflow
   - Pre-claim validation (`git fetch`, not behind origin/main)
   - CI gate requirements
   - Commit message format

## If You Haven't Read AGENTS.md

```
Use read_file tool: docs/AGENTS.md, lines 1-600
```

## Key Protocols from AGENTS.md

| Protocol | Requirement |
|----------|-------------|
| Agent Token | Include `[AGENT-XXX-X]` in all commits, claims, PRs |
| Pre-claim | `git fetch origin && git rev-list --left-right --count origin/main...HEAD` |
| SSOT | MongoDB Issue Tracker is source of truth (not PENDING_MASTER.md) |
| Verification | Run `pnpm typecheck && pnpm lint` before any claim |
| Handoff | Include "Final Output" box for user |

## Non-Negotiable Rules

- ❌ No `@ts-ignore` without ticket
- ❌ No `as any` casts
- ❌ No hardcoded IDs or hex colors
- ❌ No force merges
- ❌ No silent error swallowing
- ✅ All queries must include `org_id`/`tenantId`
- ✅ All commits must pass CI gates
- ✅ All PRs must address ALL comments before merge
