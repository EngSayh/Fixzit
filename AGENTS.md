# ⛔ STOP - AGENTS.md REQUIRED READING

**The full AGENTS.md file is located at: [`docs/AGENTS.md`](docs/AGENTS.md)**

---

## 🚨 MANDATORY ENFORCEMENT

**ALL AI agents (Copilot, Claude, Codex, Cursor, etc.) MUST:**

1. **Read `docs/AGENTS.md` lines 1-1000** BEFORE any task
2. **State**: "AGENTS.md read. Agent Token: [AGENT-XXX-X]"
3. **Run git preflight**: `git fetch origin && git rev-list --left-right --count origin/main...HEAD`
4. **Verify**: `pnpm typecheck && pnpm lint`

### ❌ If You Skip This:
- User will REJECT all your work
- All commits will be reverted
- You will waste time and money

---

## Quick Reference

Before any task, execute:
```
read_file: docs/AGENTS.md, lines 1-1000
```

This pointer file exists because some tools look for AGENTS.md at the repository root.
