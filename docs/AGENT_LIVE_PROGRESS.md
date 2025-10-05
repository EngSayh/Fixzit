# Agent Live Progress Tracker

**Last Updated:** Not started

## Current Phase: IDLE

### Progress Log

No activity yet. Agent will update this file every 20 seconds during operations.

---

## Status Format
```json
{
  "ts": "ISO8601 timestamp",
  "phase": "SEARCH|PLAN|MERGE|VERIFY|SHIP",
  "scope": "files or paths being worked on",
  "status": "ok|blocked|halted",
  "note": "brief status message"
}
```

## Phase Definitions
- **SEARCH**: Scanning repo for duplicates, existing implementations, prior PRs
- **PLAN**: Creating task plan with scope, risks, rollback strategy
- **MERGE**: Consolidating duplicates into canonical files
- **VERIFY**: Running STRICT gates (console, build, network, runtime, tests)
- **SHIP**: Committing with RCA, opening PR with evidence

## Heartbeat Requirement
Agent must update this file at least every 20 seconds during active work.

## Stall Detection
If no update for >30 seconds:
1. HALT current operation
2. Diagnose root cause
3. Fix environment/tool issue
4. Resume with clean state

---

**Monitor this file to track agent progress in real-time.**
