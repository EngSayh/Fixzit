# Fixzit Copilot Instructions (Pointer Only)

Single source of truth: `docs/AGENTS.md`. Read lines 1-1000 before any task.

Required first response:
AGENTS.md read. Agent Token: [AGENT-XXXX]

Mandatory preflight:
- git fetch origin
- git rev-list --left-right --count origin/main...HEAD
- pnpm typecheck
- pnpm lint

For UI review: follow the UI Review Addendum and UI Review Standards in `docs/AGENTS.md` (local CI default + SMART report). Resolve merge conflicts before merging.

If anything here conflicts with `docs/AGENTS.md`, `docs/AGENTS.md` wins.
