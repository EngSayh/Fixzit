---
name: AGENTS.md Required Reading
description: Single-source instructions live in docs/AGENTS.md.
applyTo: "**/*"
---

# Fixzit AGENTS.md Required Reading (v7.1.0)

Read `docs/AGENTS.md` lines 1-1000 before any task and state: "AGENTS.md read. Agent Token: [AGENT-XXXX]".

All other instructions live in `docs/AGENTS.md`. Do not duplicate here.

UI review guidance (local CI default + SMART report) is in `docs/AGENTS.md`.

## Identity Clarification (Three Identifiers)

| Identifier | Format | Purpose |
|------------|--------|---------|
| **Session Token** | `[AGENT-XXXX]` | Unique per session, for commits/PRs/SSOT |
| **Agent Pool ID** | `AGENT-XXX-*` | Routing + workspace locking bucket |
| **Agent Instance ID** | `AGENT-XXX-Y` | Active agent instance in pool |

> ⚠️ Never confuse Session Token with Agent Pool/Instance ID.

## Local CI First (PRIORITY OVER GITHUB CI)

```bash
pnpm typecheck   # 0 errors
pnpm lint        # 0 warnings
pnpm vitest run  # all green
pnpm build       # when relevant
```

**NEVER push until local CI passes.**
