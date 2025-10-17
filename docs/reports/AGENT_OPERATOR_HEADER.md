# AGENT OPERATOR HEADER

**Paste this at the top of every agent session**

---

## Mode Configuration

```
Mode: HARD_AUTO
Stall Timer: 30s
Progress Heartbeat: 20s
Disk Budget: ≥60% free
Verification: STRICT v4 + Governance V6
```

## Operating Pattern: S-P-M-V-S

**Search → Plan → Merge → Verify → Ship**

1. **SEARCH** entire repo + PR history before creating anything
2. **PLAN** scope: files touched, interfaces, tests, risks, rollback
3. **MERGE** duplicates into single canonical file (no archive)
4. **VERIFY** with STRICT gates: console/build/network/runtime = 0 errors
5. **SHIP** with RCA note, artifacts, and impact sweep

## Non-Negotiables

- ❌ **NO layout changes** (Header/Sidebar/Footer/RTL/Theme freeze)
- ❌ **NO workarounds** (fix root causes only)
- ❌ **NO bypassing errors** (HALT → diagnose → fix → rerun)
- ❌ **NO duplicates** (search first, merge then delete originals)
- ❌ **NO secrets in code** (GitHub Secrets only)
- ✅ **YES to evidence** (before/after +10s, logs, build, commit, RCA)

## Branding & Layout (STRICT)

- **Colors:** `#0061A8` Blue, `#00A859` Green, `#FFB400` Yellow
- **Languages:** English (en), العربية (ar), עברית (he) with RTL
- **Currency:** SAR (﷼), ILS (₪) - Unicode glyphs only
- **Layout:** Single global header + sidebar (Monday-style)
- **Modules:** Dashboard, Properties, Units, Work Orders, Finance, Reports, Marketplace, Settings, HR, CRM, Support, Compliance, System Management

## Duplicate Consolidation Rules

When duplicates exist:

1. **Search** repo + PRs for all instances
2. **Select** most complete implementation (tests, typing, edge cases)
3. **Merge** ALL functionality into canonical file
4. **Update** all imports/references
5. **Test** until 100% green
6. **Delete** original duplicates (no archive)

Example naming for splits:

- `payments/paytabs/core.ts` - gateway primitives
- `payments/paytabs/subscription.ts` - business flows
- Export via `payments/index.ts` for stable API

## Tool Failure Protocol

If any command fails or stalls:

1. **HALT** immediately (no retries)
2. **Capture** logs and environment state
3. **Diagnose** root cause (disk, cache, locks, ports, config)
4. **Fix** environment first
5. **Rerun** with clean evidence
6. **Never** work around failures

## Verification Gates (All Must Pass)

- [ ] TypeScript: 0 errors (`npm run typecheck`)
- [ ] ESLint: 0 warnings (`npm run lint`)
- [ ] Build: Success (`npm run build`)
- [ ] Console: 0 errors in browser
- [ ] Network: No 4xx/5xx responses
- [ ] Runtime: No hydration/boundary errors
- [ ] UI: Buttons wired, dropdowns type-ahead, Maps live
- [ ] Branding: Colors, RTL, lang/currency selectors intact
- [ ] Performance: Page ≤1.5s, List API ≤200ms, Item ≤100ms
- [ ] Artifacts: Screenshots +10s, logs, build summary, commit ref

## Evidence Requirements

Every fix must attach:

1. Before screenshot (T0)
2. After screenshot (T0+10s delayed)
3. Console logs (clean)
4. Network logs (no errors)
5. Build/TS summary (0 errors)
6. Test output (all green)
7. Commit reference
8. One-line RCA + fix note

## Cross-System Impact Sweep

After each fix:

1. **Identify** the bug pattern/smell
2. **Search** entire codebase for identical issues
3. **Apply** fix pattern globally
4. **Verify** across all affected pages × roles
5. **Document** in commit message

## Performance KPIs (Must Respect)

- Page load: ≤1.5s
- List API: ≤200ms
- Item API: ≤100ms
- Create/Update: ≤300ms
- DB simple select: <50ms
- DB complex joins: <200ms
- Search: <500ms

## Security Baseline

- All keys in GitHub Secrets / runner secrets
- Block committing .env values
- Rotate if any secrets exposed
- Multi-tenant isolation per RBAC
- Never widen scopes

## Disk Space Management

Before heavy operations (build/test):

1. Check: `df -h .` must show ≥60% free
2. If <60%, run: `bash scripts/cleanup_space.sh`
3. Verify space before proceeding
4. Keep minimal browsers (chromium only)

## Page × Role Verification

For each page and role (Super Admin, Admin, Corporate Owner, Team Member, Technician, Property Manager, Tenant, Vendor, Guest):

1. Navigate and execute all actions
2. Capture screenshots if errors
3. **HALT** on first error
4. Fix ALL errors on page
5. Re-test until clean
6. Attach evidence
7. Move to next page

## Progress Heartbeat

Update `docs/AGENT_LIVE_PROGRESS.md` every 20s:

```json
{
  "ts": "ISO8601",
  "phase": "SEARCH|PLAN|MERGE|VERIFY|SHIP",
  "scope": "path/glob",
  "status": "ok|blocked",
  "note": "short text"
}
```

## Commands (Use Auto-Approve Wrapper)

All shell commands via:

```bash
bash tools/agent-runner.sh "<command>"
# OR
bash .runner/auto-approve.sh "<command>"
```

## Token Strategy (Claude Sonnet 4.5)

- Work in phases per module (≤12-16k tokens)
- Summarize between phases
- No giant multi-module diffs
- Persist summaries in `/docs/inventory/*.md`

## Commit/PR Format

**Title:** `consolidation(<module>): <scope>`

**Body Must Include:**

- RCA (root cause analysis)
- Files touched
- Canonical target
- Duplicates removed
- Impact sweep completed
- STRICT artifacts links
- Performance metrics
- Test results

**Labels:** `governor`, `duplicate-merge`, `strict-v4-passed`

---

## Quick Reference: File Locations

- **Governance:** `GOVERNANCE.md`, `agent-governor.yaml`
- **Agent Gov Playbook:** `AGENT_GOVERNOR.md`
- **Inventory:** `docs/inventory/`
- **Progress:** `docs/AGENT_LIVE_PROGRESS.md`
- **Scripts:** `scripts/inventory.sh`, `scripts/cleanup_space.sh`
- **Runner:** `tools/agent-runner.sh`, `.runner/auto-approve.sh`
- **CI:** `.github/workflows/agent-governor.yml`
- **PR Template:** `.github/pull_request_template.md`

---

**This is your operating system. Follow it verbatim. No deviations.**
