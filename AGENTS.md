# Fixzit — Agent Working Agreement v6.0

> **SSOT Declaration:** MongoDB Issue Tracker is the ONLY Single Source of Truth.
> `docs/PENDING_MASTER.md` is a derived log/snapshot ONLY. Never create tasks there without MongoDB first.
> All timestamps: Asia/Riyadh (UTC+03:00)

---

## 📑 Table of Contents

1. [Mission & Non-Negotiables](#1-mission--non-negotiables)
2. [Definitions](#2-definitions)
3. [Agent Token Protocol (MANDATORY)](#3-agent-token-protocol-mandatory)
4. [Agent Lifecycle](#4-agent-lifecycle)
5. [Multi-Agent Coordination](#5-multi-agent-coordination)
6. [Pre-Claim SSOT Validation (MANDATORY)](#6-pre-claim-ssot-validation-mandatory)
7. [Deep-Dive & Fix-Once Protocol](#7-deep-dive--fix-once-protocol)
8. [Scope Expansion & Delegation Protocol](#8-scope-expansion--delegation-protocol)
9. [Task Handoff & Delegation Protocol](#9-task-handoff--delegation-protocol)
10. [PR Protocol & CI/CD Standards](#10-pr-protocol--cicd-standards)
11. [Code Quality Standards](#11-code-quality-standards)
12. [Error Handling Standards](#12-error-handling-standards)
13. [SSOT Sync Protocol](#13-ssot-sync-protocol)
14. [Auto-Review Protocol](#14-auto-review-protocol)
15. [Prompts Library](#15-prompts-library)
16. [Appendix A: MongoDB Issue Schema](#appendix-a-mongodb-issue-schema)
17. [Appendix B: Agent Routing Configuration](#appendix-b-agent-routing-configuration)
18. [Changelog](#changelog)

---

## 1. Mission & Non-Negotiables

### 1.1 Mission Statement

Maintain the Fixzit multi-tenant SaaS platform with zero tolerance for shortcuts, ensuring every fix addresses root causes and all work is traceable through MongoDB SSOT.

### 1.2 Absolute Non-Negotiables (AUTO-FAIL if violated)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ❌ FORBIDDEN ACTIONS — ANY VIOLATION = IMMEDIATE TASK FAILURE          │
├─────────────────────────────────────────────────────────────────────────┤
│  • Commenting out failing tests                                         │
│  • Adding @ts-ignore without JIRA ticket + justification                │
│  • Swallowing errors silently (try-catch that ignores)                  │
│  • Using `as any` to bypass types                                       │
│  • Hardcoding values instead of fixing data source                      │
│  • Deleting code instead of fixing root cause                           │
│  • Skipping SSOT update after any finding                               │
│  • "Works on my machine" without evidence                               │
│  • Deferring without logging to MongoDB                                 │
│  • Claiming "out of scope" without tracked issue                        │
│  • Blaming "env var missing" without checking GitHub + Vercel           │
│  • Force merging PRs with unresolved comments                           │
│  • Bypassing Codex review gate                                          │
│  • Editing files outside locked paths without Scope Expansion           │
│  • Missing Agent Token in commits, PRs, or SSOT events                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Definitions

Owner Override (Session): If SDD is missing/unreadable, proceed using available SoT files
(`docs/FIXZIT_ONBOARDING_VERIFICATION_BLUEPRINT_V7.md`, `docs/UI_UX_ENHANCEMENT_BLUEPRINT_V1.md`,
`docs/guides/GOVERNANCE.md`) and log the gap in the report. Do not halt solely for missing SDD.

| Term | Definition |
|------|------------|
| **SSOT** | Single Source of Truth — MongoDB Issue Tracker ONLY |
| **Derived Log** | `docs/PENDING_MASTER.md` — snapshot of SSOT, never authoritative |
| **Agent Token** | Unique identifier `[AGENT-XXX-Y]` for attribution (e.g., `[AGENT-001-A]`) |
| **Lock** | Exclusive file path claim in `.fixzit/agent-assignments.json` |
| **Claim** | Atomic MongoDB operation reserving an issue for an agent |
| **Handoff** | Formal transfer of issue ownership between agents via SSOT |
| **Deep-Dive** | Repo-wide scan for similar issues before fixing |
| **Scope Expansion** | Protocol to extend locked paths when deep-dive finds related issues |
| **TTL** | Time-To-Live — claim expiration (default: 60 minutes) |
| **OCC** | Optimistic Concurrency Control — version-based conflict prevention |

---

## 3. Agent Token Protocol (MANDATORY)

### 3.1 Agent Token Format

```
[AGENT-XXX-Y]

Where:
  XXX = Agent type (001-006)
  Y   = Instance identifier (A, B, or C)
```

### 3.2 Agent ID Assignment Table

| Agent ID | Agent Type | Primary Domain | File Path Patterns |
|----------|------------|----------------|-------------------|
| AGENT-001-A/B/C | VS Code Copilot | Core/Auth/Middleware | `app/api/core/**`, `middleware/**`, `lib/auth/**`, `lib/session/**`, `lib/jwt/**`, `lib/errors/**`, `lib/logging/**`, `components/**` |
| AGENT-002-A/B/C | Claude Code | Finance/Billing | `app/api/finance/**`, `app/api/billing/**`, `lib/payments/**`, `lib/invoices/**`, `lib/tax/**`, `lib/currency/**` |
| AGENT-003-A/B/C | Codex | Souq/Marketplace | `app/api/souq/**`, `app/api/marketplace/**`, `lib/products/**`, `lib/orders/**`, `lib/cart/**`, `lib/shipping/**` |
| AGENT-004-A/B/C | Cursor | Aqar/Real Estate | `app/api/aqar/**`, `app/api/properties/**`, `lib/listings/**`, `lib/bookings/**`, `lib/contracts/**` |
| AGENT-005-A/B/C | Windsurf | HR/Payroll | `app/api/hr/**`, `app/api/payroll/**`, `lib/attendance/**`, `lib/leaves/**`, `lib/salaries/**` |
| AGENT-006-A/B/C | Reserved | Tests/Scripts | `tests/**`, `__tests__/**`, `scripts/**`, `cypress/**`, `.github/workflows/**` |

### 3.3 Required Agent Token Placements (NON-NEGOTIABLE)

Every action MUST be attributable to an Agent Token:

1. **Task Claim Announcement** — MUST start with Agent Token
2. **Every Commit Message** — MUST include Agent Token
3. **Every PENDING_MASTER Entry** — MUST include Agent Token in header
4. **Every MongoDB Issue Event** — MUST include Agent Token in `by` field
5. **Every PR Description** — MUST include Agent Token and Target Code Set

**If Agent Token is missing in any of the above → AUTO-FAIL**

### 3.4 Commit Message Format

```
<type>(<scope>): <description> [AGENT-XXX-Y] [ISSUE-KEY]

Examples:
fix(api): enforce org_id on orders [AGENT-003-A] [BUG-214]
feat(auth): add RBAC middleware [AGENT-001-B] [CORE-045]
test(finance): add invoice validation tests [AGENT-002-A] [FM-089]
```

---

## 4. Agent Lifecycle

### 4.1 Lifecycle Phases

```
CLAIM → WORK → VERIFY → REVIEW → SSOT → CLEANUP
```

### 4.2 Pre-Start Checklist (9 items — MANDATORY)

Before starting ANY task:

```
□ 1. Run git preflight (Section 5.4) - repo up to date with origin/main
□ 2. Read .fixzit/agent-assignments.json - check for conflicts
□ 3. Execute Pre-Claim SSOT Validation (Section 6)
□ 4. Claim slot with Agent Token: [AGENT-XXX-Y]
□ 5. List EXACT files to modify (no wildcards)
□ 6. Verify git status is clean
□ 7. Verify worktrees: `git worktree list` (must be single worktree only)
□ 8. Run: `pnpm typecheck` (must pass)
□ 9. Run: `pnpm lint` (must pass)
```

**Announce:** `[AGENT-XXX-Y] Claimed. Files: <list>`

### 4.3 Post-Task Checklist (13 items — MANDATORY)

After completing ANY task:

```
□ 1.  pnpm typecheck (0 errors)
□ 2.  pnpm lint (0 warnings)
□ 3.  pnpm vitest run (all green)
□ 4.  git status — commit all changes with Agent Token
□ 5.  Create PR or push to existing
□ 6.  Clean up temp files, debug logs
□ 7.  Release lock in .fixzit/agent-assignments.json
□ 8.  TRIGGER AUTO-REVIEW — Wait for Codex feedback (NO TIMEOUT BYPASS)
□ 9.  RUN SSOT SYNC PROTOCOL — Extract findings, sync to MongoDB
□ 10. UPDATE docs/PENDING_MASTER.md with session changelog
□ 11. Announce: "[AGENT-XXX-Y] Complete. PR: #XXX"
□ 12. NOTIFY Eng. Sultan with FINAL OUTPUT box
□ 13. DO NOT mark "Ready to Merge" until Codex returns APPROVED
```

---

## 5. Multi-Agent Coordination

### 5.1 Resource Limits

| Resource | Limit | Rationale |
|----------|-------|-----------|
| Max concurrent agents per workspace | 2 | Prevents VS Code Exit Code 5 crashes |
| Max worktrees | 1 (single worktree only) | Memory overhead reduction |
| Max concurrent issues per agent | 3 | Workload management |
| Claim TTL | 60 minutes | Auto-release for crashed agents |

### 5.2 Assignment File Structure

Location: `.fixzit/agent-assignments.json` (gitignored)

```json
{
  "version": "6.0.0",
  "lastUpdated": "2025-12-21T14:30:00+03:00",
  "activeAgents": [
    {
      "agentId": "AGENT-001-A",
      "agentType": "Copilot",
      "status": "active",
      "claimedAt": "2025-12-21T14:00:00+03:00",
      "claimExpiresAt": "2025-12-21T15:00:00+03:00",
      "lockedPaths": [
        "lib/auth/**",
        "middleware/**"
      ],
      "currentIssue": "CORE-00123"
    }
  ],
  "pathLocks": {
    "lib/auth/**": "AGENT-001-A",
    "middleware/**": "AGENT-001-A"
  }
}
```

### 5.3 Conflict Resolution Rules

1. **First to lock wins** — Atomic claim in MongoDB
2. **Lower ID keeps lock on conflict** — AGENT-001 > AGENT-002 > ... > AGENT-006
3. **Expired claims auto-release** — Heartbeat monitor every 30 seconds
4. **Multi-domain issues** → AGENT-001 acts as coordinator

### 5.4 Cross-Device Git Sync Protocol (MANDATORY)

**Goal:** Prevent stale work when switching devices (macOS + Windows).
**Rule:** No agent may claim or modify files until the local repo is fresh vs `origin/main`.

#### Pre-Work Git Freshness Gate (Required)

Run BEFORE any SSOT claim:

```bash
git fetch --prune origin
git status -sb
git rev-list --left-right --count origin/main...HEAD
```

Interpretation:
- If behind > 0: STOP. Run `git pull --rebase origin main`, then re-run.
- If ahead > 0: OK only on a feature branch; push before switching devices.

#### Mandatory Branch Discipline (2-device safe)

- Never work directly on `main`.
- Branch format: `agent/<AGENT-TOKEN>/<ISSUE-KEY>/<short-slug>`.
- One active branch per device per issue (avoid parallel edits of same files).

#### Conflict Rule (Non-negotiable)

1. Resolve conflicts properly; no shortcuts.
2. Run full verification; update SSOT with the conflict note.
3. If conflict touches out-of-domain files: handoff via SSOT.

#### Automation (Preferred)

If available:
```bash
node scripts/git-preflight.mjs --require-clean --base origin/main
```

Failing this script = failing pre-claim validation.

### 5.5 Repo Portability Protocol (MANDATORY)

**Goal:** Keep the repo usable on macOS, Windows, and Linux CI.

#### Naming Rules

- Use ASCII only for file/folder names.
- Use kebab-case for filenames.
- Avoid reserved characters: < > : " / \\ | ? * and control chars.
- Avoid reserved names: CON, PRN, AUX, NUL, COM1..COM9, LPT1..LPT9.
- Avoid trailing spaces or trailing periods in names.
- Keep path length under 240 characters (safety margin across tooling).
- Never introduce case-collision paths (File.ts vs file.ts).

#### Verification Gate

Run before PR / merge:
```bash
node scripts/check-repo-portability.mjs
```

Fail = must fix file naming/path issues before merge.

### 5.6 Capacity Escalation Rule

If all eligible agents are at the 3-issue cap and urgent work arrives:
1. Log the capacity block in SSOT with impacted issue keys.
2. Notify Eng. Sultan to reassign or approve a temporary cap increase.
3. Do not self-claim beyond the cap without explicit SSOT override.

### 5.7 Emergency Override (Break-Glass)

- Only Eng. Sultan may authorize an emergency override.
- Authorization must be recorded in SSOT with timestamp and reason.
- No static override codes or secrets may be stored in the repo.



---

## 6. Pre-Claim SSOT Validation (MANDATORY)

**Every agent MUST execute this checklist before claiming ANY work.**
Prefer using SSOT tooling (CLI/script/API) when available; the Mongo shell snippets below define the required logic.

### Phase 0: Git Preflight

- Run the Section 5.4 gate before any SSOT claim.
- If available, run `node scripts/git-preflight.mjs --require-clean --base origin/main`.
- If behind origin/main: ABORT, update, then re-run preflight.

### Phase 1: SSOT Query

```javascript
// 1.1 Check existing assignment
db.issues.findOne({
  issueKey: "<target_issue>",
  status: { $in: ["claimed", "in_progress"] },
  "assignment.claimExpiresAt": { $gt: new Date() }
})
// → If result exists: ABORT, issue already claimed

// 1.2 Verify issue still open
db.issues.findOne({
  issueKey: "<target_issue>",
  status: { $in: ["open", "triaged", "abandoned"] }
})
// → If no result: ABORT, issue no longer available

// 1.3 Check file overlap
db.issues.find({
  filePaths: { $in: ["<files_in_target_issue>"] },
  status: { $in: ["claimed", "in_progress"] },
  issueKey: { $ne: "<target_issue>" }
})
// → If results exist: WARN, potential conflict with issues: [list]
```

### Phase 2: Domain Validation

```
□ 2.1 File path authorization
    - Apply routing rules from Agent ID Assignment Table
    - Verify MY_AGENT_ID matches suggestedAgent OR is secondaryAgent
    → If mismatch: ABORT or request handoff

□ 2.2 Domain boundary check
    - Count unique domains across all filePaths
    → If > 1 domain AND I am not AGENT-001: Request coordinator
```

### Phase 3: Resource Validation

```
□ 3.1 Workload check
    db.issues.countDocuments({
      "assignment.agentId": MY_AGENT_ID,
      status: { $in: ["claimed", "in_progress"] }
    })
    → If count >= 3: ABORT, at capacity

□ 3.2 Session health check
    - Verify VS Code extension host is responsive
    - Verify no pending file locks
    → If unhealthy: ABORT and log diagnostics
```

### Phase 4: Atomic Claim Execution

```javascript
// Only after ALL validations pass:
db.issues.findOneAndUpdate(
  {
    issueKey: "<target_issue>",
    status: { $in: ["open", "triaged", "abandoned"] },
    $or: [
      { "assignment.claimToken": null },
      { "assignment.claimExpiresAt": { $lt: new Date() } }
    ],
    version: <expected_version>  // OCC check
  },
  {
    $set: {
      status: "claimed",
      "assignment.agentId": MY_AGENT_ID,
      "assignment.agentType": MY_AGENT_TYPE,
      "assignment.claimedAt": new Date(),
      "assignment.claimExpiresAt": new Date(Date.now() + 60*60*1000),
      "assignment.claimToken": crypto.randomUUID(),
      updatedAt: new Date()
    },
    $inc: { version: 1 },
    $push: {
      "assignment.history": {
        agentId: MY_AGENT_ID,
        action: "claimed",
        timestamp: new Date(),
        reason: "Pre-claim validation passed"
      }
    }
  },
  { returnDocument: "after" }
)
// → If null returned: Another agent claimed first, RETRY from Phase 1
```

### Failure Recovery

If claim fails at any phase:
1. Log failure reason with full context
2. Back off: Wait random(1000, 5000)ms
3. Retry from Phase 1 (max 3 attempts)
4. If all retries fail: Move to next issue in queue

---

## 7. Deep-Dive & Fix-Once Protocol

### 7.1 Principle

**FIX ONCE, FIX EVERYWHERE** — Before fixing ANY issue, scan the entire codebase for similar occurrences.

### 7.2 Before Fixing ANY Issue

```
□ 1. Check SSOT first (MongoDB + PENDING_MASTER)
□ 2. Is another agent working on it? → SKIP
□ 3. Scan for SIMILAR issues: grep -rn "<pattern>" app lib services
□ 4. List ALL occurrences (file + line)
□ 5. Determine if ALL occurrences are in your locked paths
     → If YES: Fix ALL in ONE session
     → If NO: Use Scope Expansion Protocol (Section 8)
□ 6. Update SSOT immediately after fix
□ 7. Commit with full file list
```

### 7.3 Issue Classification & Scan Patterns

| Issue Type | Scan Pattern | Fix Scope |
|------------|--------------|-----------|
| Missing tenant scope | `findById\|findOne` without `org_id` | All API routes |
| Unsafe JSON.parse | `JSON.parse` without try-catch | All files |
| Console logs in prod | `console.log` in app/lib/services | All directories |
| Hardcoded strings | String literals in JSX | Replace with t() |
| Missing .lean() | Mongoose queries without .lean() | All read-only queries |
| Type safety gaps | `as any`, `@ts-ignore` | Proper types required |

---

## 8. Scope Expansion & Delegation Protocol

### 8.1 Problem Statement

Deep-Dive requires repo-wide fixes, but Multi-Agent locks prevent collisions. This protocol resolves the conflict.

### 8.2 Rule

An agent MAY NOT edit files outside its locked paths without following this protocol.

### 8.3 When Deep-Dive Finds Occurrences Outside Locked Paths

```
Step 1: LIST all occurrences (file + line) in working notes

Step 2: ATTEMPT SCOPE EXPANSION
        - Update .fixzit/agent-assignments.json with additional file locks
        - Announce expanded file list with Agent Token
        - Wait 30 seconds for conflict detection

Step 3: IF expansion conflicts (paths locked by another agent):
        - DO NOT edit those files
        - Create/update MongoDB SSOT issues for each occurrence
        - Include in each issue:
          • Evidence (file:line + snippet ≤25 words)
          • Root cause hypothesis
          • Recommended fix
          • recommendedAgentToken (based on domain)
          • Event: DELEGATED
        - Append derived log entry to PENDING_MASTER referencing SSOT keys

Step 4: PROCEED with fixes ONLY in your expanded locked paths
```

### 8.4 Delegation Issue Template

```json
{
  "issueKey": "AUTO-GENERATED",
  "title": "<descriptive title>",
  "type": "bug",
  "status": "open",
  "domain": "<target domain>",
  "filePaths": ["<exact paths>"],
  "delegatedBy": "[AGENT-XXX-Y]",
  "delegatedAt": "2025-12-21T14:30:00+03:00",
  "recommendedAgentToken": "[AGENT-YYY-Z]",
  "delegationReason": "File outside my locked paths during deep-dive",
  "evidenceSnippet": "<≤25 words exact from source>",
  "sourceRef": "deep-dive:<original-issue-key>"
}
```

---

## 9. Task Handoff & Delegation Protocol

This protocol is SSOT-governed and operationally dependent on the SSOT Sync flow.
This section is an overview only; follow the canonical handoff steps in Section 13.4.

- Canonical handoff workflow: **Section 13.4 — Agent Task Handoff Protocol (SSOT Coordination)**
- Canonical backlog extraction workflow: **Section 13.3 — Pending Backlog Extractor v2.5 (MANDATORY)**

---

## 10. PR Protocol & CI/CD Standards

### 10.1 PR Merge Gate Checklist (ALL must be ✅)

```
□ 1.  ALL review comments addressed
□ 2.  ALL conversations resolved
□ 3.  ALL requested changes implemented
□ 4.  CI/CD pipeline passes (ALL checks green)
□ 5.  No "Changes requested" reviews pending
□ 6.  Required approvals received
□ 7.  No merge conflicts
□ 8.  Branch up to date with main
□ 9.  All linked issues updated in SSOT
□ 10. Codex Review: APPROVED (no timeout bypass)
```

### 10.2 ZERO FORCE MERGE TOLERANCE

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ❌ FORBIDDEN PR ACTIONS — ANY VIOLATION = AUTO-FAIL                    │
├─────────────────────────────────────────────────────────────────────────┤
│  • Force merging with unresolved comments                               │
│  • Dismissing review comments without addressing                        │
│  • Merging with failing CI checks                                       │
│  • Bypassing branch protection rules                                    │
│  • Using admin override to merge blocked PRs                            │
│  • Marking "Ready to Merge" before Codex APPROVED                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### 10.3 PR Description Template

````markdown
## Summary
[Brief description]

## Agent Information
- **Agent Token:** [AGENT-XXX-Y]
- **Issue Key:** [ISSUE-KEY]
- **Codex Review:** PENDING | APPROVED | BLOCKED

## Target Code Set
- `path/to/file1.ts` (lines X-Y)
- `path/to/file2.ts` (lines A-B)

## Verification Evidence
```bash
pnpm typecheck  # ✅ 0 errors
pnpm lint       # ✅ 0 warnings
pnpm vitest run # ✅ X tests passed
```

## Deep-Dive Scan Results
- Scanned for: [pattern]
- Occurrences found: N
- All fixed in this PR: YES | NO (delegated: [keys])

## Checklist
- [ ] Pre-Claim SSOT Validation passed
- [ ] Agent Token in all commits
- [ ] SSOT updated with findings
- [ ] PENDING_MASTER updated
````

### 10.4 CI/CD Build Rules (ZERO ERROR TOLERANCE)

| Gate | Requirement | Command |
|------|-------------|---------|
| TypeScript | 0 errors | `pnpm typecheck` |
| ESLint | 0 warnings | `pnpm lint` |
| Tests | 100% pass, 0 skips | `pnpm vitest run` |
| Build | Must complete | `pnpm build` |

### 10.5 GitHub Billing/Quota Failure Protocol

If GitHub Actions fails due to billing:
1. Run ALL tests locally with full evidence
2. Capture complete output
3. Add evidence to PR description
4. Only proceed if 100% pass locally
5. Notify Eng. Sultan about billing status

---

## 11. Code Quality Standards

### 11.1 Fixzit Ecosystem Context

| Aspect | Standard |
|--------|----------|
| Framework | Next.js 14+ App Router |
| Language | TypeScript (strict mode) |
| Database | MongoDB Atlas |
| Styling | Tailwind CSS (RTL-first) |
| i18n | next-intl |
| Brand Blue | #0061A8 |
| Brand Green | #00A859 |
| Brand Yellow | #FFB400 |
| Saudi Compliance | ZATCA Phase 2, VAT 15%, Decimal128 |

### 11.2 Code Quality Gates

| Gate | Rule | Check Command |
|------|------|---------------|
| Null Safety | Every `?.` chain has fallback | `rg '\?\.' \| grep -v '?? \|\|\| \|if ('` |
| RTL Support | No hardcoded left/right/ml-/mr- | See RTL Class Mapping |
| Theme Tokens | No hardcoded hex colors | `rg '#[0-9a-fA-F]{6}' \| grep -v 'tokens'` |
| Multi-Tenancy | All queries scoped by org_id | `rg 'find\|findOne' \| grep -v 'org_id'` |
| Client Directive | Hooks need 'use client' | `rg 'useState\|useEffect' \| xargs grep -L "'use client'"` |
| Error Boundaries | Try-catch for all async | `rg 'await ' \| grep -v 'try\|catch'` |

### 11.3 RTL Class Mapping (BANNED → REQUIRED)

| ❌ BANNED | ✅ REQUIRED | Reason |
|-----------|-------------|--------|
| left-* | start-* | RTL flips |
| right-* | end-* | RTL flips |
| ml-* | ms-* | Margin start |
| mr-* | me-* | Margin end |
| pl-* | ps-* | Padding start |
| pr-* | pe-* | Padding end |
| text-left | text-start | Text alignment |
| text-right | text-end | Text alignment |
| border-l-* | border-s-* | Border start |
| border-r-* | border-e-* | Border end |
| rounded-l-* | rounded-s-* | Rounded start |
| rounded-r-* | rounded-e-* | Rounded end |
| scroll-ml-* | scroll-ms-* | Scroll margin |
| scroll-mr-* | scroll-me-* | Scroll margin |

### 11.4 PR Scorecard (≥85 points required to merge)

| Category | Points | Criteria |
|----------|--------|----------|
| TypeScript | 15 | 0 errors, no `any`, no `@ts-ignore` |
| ESLint | 10 | 0 warnings |
| Tests | 15 | All pass, coverage maintained |
| Tenant Scope | 15 | org_id on all queries |
| RTL Support | 10 | No banned classes |
| Theme Tokens | 5 | No hardcoded colors |
| Error Handling | 10 | Try-catch, error codes |
| i18n | 5 | All user strings in t() |
| Security | 10 | Input validation, no XSS |
| Documentation | 5 | SSOT updated, PR documented |

---

## 12. Error Handling Standards

### 12.1 Error Code Format

```
[FIXZIT-<MODULE>-<NUMBER>] <Human-readable message>: <technical details>

Modules:
  AUTH   - Authentication/Authorization
  DB     - Database operations
  API    - API routes
  TENANT - Multi-tenancy
  PAY    - Payments
  SOUQ   - Marketplace
  AQAR   - Real Estate
  HR     - Human Resources
  FM     - Facility Management
  ENV    - Environment/Config
  I18N   - Internationalization
  FILE   - File operations
```

### 12.2 Required Error Response Structure

```typescript
return NextResponse.json({
  error: {
    code: 'FIXZIT-API-001',
    message: 'Unauthorized access',
    details: 'Session expired',
    path: '/api/finance/accounts',
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID(),
  }
}, { status: 401 });
```

### 12.3 Environment Variable Verification Protocol

BEFORE blaming "missing env var", verify in ALL available sources:

1. Code references (file:line) and any schema validation (Zod/env schema).
2. .env.example and relevant workflow YAMLs (CI/CD secrets usage).
3. Local .env files (.env.local, .env.development.local).

If UI access is required (GitHub/Vercel) and not available to the agent:
- Ask Eng. Sultan to confirm the setting and record the request in SSOT.

If ACTUALLY missing, notify Eng. Sultan with:
- Variable name
- Required by (file:line)
- Purpose
- Status by platform (GitHub Actions, Vercel Prod/Preview/Dev)
- Action required

---

## 13. SSOT Sync Protocol

### 13.1 When to Execute

After EVERY:
- Code review session
- Fix session or task completion
- VSCode Copilot chat session with findings

### 13.2 Phase 0: Chat History Extraction

**Session Metadata:**
```markdown
## 📅 YYYY-MM-DD HH:mm:ss (Asia/Riyadh) — VSCode Session Update

**Agent Token:** [AGENT-XXX-Y]
**Context:** <branch> | <commit short> | <PR link if exists>
**Session Summary:** <1-2 sentences>
**DB Sync:** created=<n>, updated=<n>, skipped=<n>, errors=<n>
```

**Findings Table:**
| Timestamp | Type | File | Description | Status | SSOT Key | Owner Agent |
|-----------|------|------|-------------|--------|----------|-------------|
| HH:mm:ss | Bug | path/file.ts:L10-15 | ... | Fixed | BUG-123 | [AGENT-001-A] |

### 13.3 Pending Backlog Extractor v2.5 — Extraction Protocol (MANDATORY)

#### Purpose
Extract unresolved items from `docs/PENDING_MASTER.md`, deduplicate them deterministically, and generate an import payload suitable for SSOT ingestion (MongoDB Issue Tracker) and sprint planning.

#### SSOT Relationship (Non‑Negotiable)
- MongoDB Issue Tracker = SSOT
- `docs/PENDING_MASTER.md` is a derived log / staging snapshot only.
- This protocol reconciles staged notes into SSOT and eliminates duplicates.

#### Agent Responsibility
Any agent who completes a code review with new findings OR discovers new issues during implementation MUST ensure those findings are represented in SSOT.
If findings were captured in `docs/PENDING_MASTER.md`, run this extractor to reconcile and deduplicate.

#### Execution Trigger
- After completing SSOT Chat History Extraction / SSOT Sync
- Before closing any task that produced new findings
- On explicit request: “extract pending backlog”

#### HARD CONSTRAINTS (VIOLATION = AUTO‑FAIL)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  EXTRACTION RULES (NON‑NEGOTIABLE)                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  ❌ NO INVENTION — Extract ONLY what exists in the source               │
│  ❌ NO COMPLETED ITEMS — Exclude ✅/🟢/Fixed/Done/Completed/Resolved    │
│  ✅ TRIAGE ONLY — Classify/score/sort using deterministic rules         │
│  ✅ ENGLISH ONLY — All output in English                                │
│  ✅ TRACEABILITY — Every item MUST include:                             │
│     - sourceRef (section/date heading)                                  │
│     - location (path:lines OR Doc-only)                                 │
│     - evidenceSnippet (≤25 words, copied exactly)                       │
│  ✅ AGENT TOKEN — Every item MUST include extractedBy: [AGENT-XXX-Y]    │
└─────────────────────────────────────────────────────────────────────────┘
```

#### INPUT REQUIREMENT
If the full content of `docs/PENDING_MASTER.md` is not available in the current context, respond with exactly:

**`[AGENT-XXX-Y] Please provide the full contents of docs/PENDING_MASTER.md so I can extract pending items.`**

Then STOP.

#### EXTRACTION SCOPE

**Include** (explicitly unresolved):
- Markers: 🔲, 🟡, ⏳, ⚠️, 🟠, 🔴
- Keywords: TODO, Pending, Open, Investigate, In Progress, Needs, Missing, Gap
- Unchecked tasks: `- [ ] ...`
- Unmarked bullets under “Next Steps” / “Planned Next Steps” only if clearly actionable tasks

Scan all sections, including:
- Current Progress, Next Steps, Efficiency, Bugs, Logic Errors, Missing Tests, Deep‑Dive

**Exclude** items marked/stated:
✅, 🟢, Fixed, Done, Completed, Resolved, Landed, Added, Closed

Exception: if a later entry explicitly reopens it (“reopened”, “still failing”, “regressed”, “still pending”, “not fixed”) → INCLUDE.

#### REQUIRED FIELDS PER ITEM (STRICT)

| Field | Rule |
|---|---|
| extractedBy | The executing agent token `[AGENT-XXX-Y]` |
| title | From source (exact) |
| issue | From source (if different from title; else repeat title) |
| action | From source (if explicit; else `"Not specified in source"`) |
| location | `path:lines` if present; else `Doc-only` |
| sourceRef | Section/date heading (exact) |
| evidenceSnippet | ≤25 words copied exactly |
| status | `pending \| in_progress \| blocked \| unknown` |
| category | Exactly one: `Bugs \| Logic Errors \| Missing Tests \| Efficiency \| Next Steps` |
| priorityLabel | `P0 \| P1 \| P2 \| P3` (deterministic rules below) |
| priorityRank | Numeric mapping: P0=1, P1=2, P2=3, P3=4 |
| riskTags | 0..n: `SECURITY, MULTI-TENANT, FINANCIAL, TEST-GAP, PERF, INTEGRATION, DATA` |
| effort | `XS \| S \| M \| L \| XL \| ?` |
| impact | 1–10 (deterministic rules below) |
| impactBasis | Short explanation of what triggered scoring |

#### DEDUPLICATION (DETERMINISTIC)

Merge duplicates in this order:
1) Same explicit ID (`BUG-XXXX`, `LOGIC-XXX`, `SEC-XXX`)
2) Same location (same file + line range)
3) Same file + normalized issue text (case‑insensitive; punctuation stripped)

For merged items, track:
- firstSeen (earliest dated heading if present; else `"First seen unknown"`)
- lastSeen (latest dated heading if present; else `"Last seen unknown"`)
- mentions (count of merged occurrences)
- statusEvolved only if explicitly shown in source

**Key + Ref System**
- If item has explicit ID → `externalId = that ID`, `key = externalId`
- Else: `externalId = null`, `key = normalize(title + "|" + category + "|" + location)` and assign display-only `REF-###`

**Source Hash (for dedupe/import tracing)**
- `sourceHash = sha256(evidenceSnippet + "|" + location + "|" + sourceRef)`
- `sourceHash12 = first 12 hex chars`

Compute inside a repo workspace with one of:

```bash
printf "%s" "<evidenceSnippet>|<location>|<sourceRef>" | shasum -a 256 | cut -c1-12
```

```bash
node -e "const crypto=require('crypto'); const s=process.argv[1]; console.log(crypto.createHash('sha256').update(s).digest('hex').slice(0,12));" "<evidenceSnippet>|<location>|<sourceRef>"
```

#### CLASSIFICATION (EXACTLY ONE)

| Category | Keywords |
|---|---|
| Bugs | crash, error, fails, broken, incorrect behavior |
| Logic Errors | wrong condition, missing filter, scoping, incorrect fallback |
| Missing Tests | missing tests, coverage, no negative paths |
| Efficiency | refactor, perf, split file, optimize, validation framework |
| Next Steps | explicitly listed plan/task item |

#### PRIORITY (P0–P3) — DETERMINISTIC KEYWORD RULES

Use explicit P0/P1/P2/P3 if present; else infer:

| PriorityLabel | Keywords |
|---|---|
| P0 (🔴) | security, data leak, cross‑tenant exposure, RBAC/auth bypass, privilege escalation, fail‑open |
| P1 (🟠) | authorization/ownership correctness, compliance correctness, logic errors affecting correctness |
| P2 (🟡) | missing tests, performance/efficiency issues, validation gaps |
| P3 (🟢) | refactor/cleanup/docs/nice‑to‑have |

Priority mapping (governance → numeric):

| PriorityLabel | Meaning | priorityRank |
|---|---:|---:|
| P0 | Critical | 1 |
| P1 | High | 2 |
| P2 | Medium | 3 |
| P3 | Low | 4 |

#### EFFORT (XS–XL) — HEURISTIC

| Effort | Scope |
|---|---|
| XS | One‑liner/config |
| S | Single-file change |
| M | Multi-file OR add new test file |
| L | Cross-module |
| XL | Architectural/migration |
| ? | Scope unclear (log in openQuestions) |

#### IMPACT SCORE (1–10) — DETERMINISTIC

Compute impact (cap 10):
- Base by priority: P0=9, P1=7, P2=5, P3=3
- Modifiers:
  - +2 if SECURITY
  - +2 if MULTI‑TENANT
  - +1 if FINANCIAL
  - +1 if DATA
  - +2 if source explicitly says “production down” / “outage” / “cannot login”
  - +0 for TEST‑GAP / PERF / INTEGRATION unless outage is explicit (+2)

Also output impactBasis listing which tags/phrases triggered scoring.

#### OUTPUT (DEFAULT = BOTH)

**A) BACKLOG_AUDIT.json (SSOT Import Payload)**

Return ONE JSON object (camelCase fields):

```json
{
  "extractedAt": "YYYY-MM-DD HH:mm (Asia/Riyadh)",
  "extractedBy": "[AGENT-XXX-Y]",
  "sourceFile": "docs/PENDING_MASTER.md",
  "appliedFlags": {},
  "counts": {
    "total": 0,
    "byPriorityLabel": {},
    "byCategory": {},
    "quickWins": 0,
    "anomalies": 0
  },
  "anomalies": [],
  "fileHeatMap": [],
  "issues": [],
  "openQuestions": []
}
```

**B) BACKLOG_AUDIT.md (Human Report)**
- Executive Summary
- Category breakdown
- File heat map (top 10)
- Sprint buckets
- Tables by category sorted by: impact desc → priorityLabel → effort
- Open questions (only where required fields are “?” / “Not specified in source”)

#### POST‑EXTRACTION PROTOCOL (MANDATORY)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  POST‑EXTRACTION CHECKLIST                                             │
├─────────────────────────────────────────────────────────────────────────┤
│  1. □ Save BACKLOG_AUDIT.json (repo root)                               │
│  2. □ Save BACKLOG_AUDIT.md (repo root)                                 │
│  3. □ If SSOT import endpoint exists, import:                           │
│       POST /api/issues/import                                           │
│       (Capture created/updated/skipped/errors)                          │
│  4. □ Append summary to docs/PENDING_MASTER.md:                         │
│       "## YYYY-MM-DD HH:mm — Backlog Extraction by [AGENT-XXX-Y]"       │
│       "Extracted: N | Imported: created=X, updated=Y, skipped=Z"        │
│       If import NOT executed, write: "Import: PENDING (reason)"         │
│  5. □ Commit artifacts:                                                 │
│       git add BACKLOG_AUDIT.* docs/PENDING_MASTER.md                    │
│       git commit -m "chore: backlog extraction (N items) [AGENT-XXX-Y]" │
│  6. □ Announce completion:                                              │
│       "[AGENT-XXX-Y] Backlog extraction complete: N items"              │
└─────────────────────────────────────────────────────────────────────────┘
```

### 13.4 Agent Task Handoff Protocol (SSOT Coordination) — MANDATORY

#### Purpose
Prevent duplicate work and enable deterministic handoff between agents using MongoDB Issue Tracker as SSOT.

#### Core Principle (Non‑Negotiable)
- MongoDB Issue Tracker = Single Source of Truth
- `docs/PENDING_MASTER.md` mirrors SSOT changes but is never authoritative
- MongoDB first, then update `docs/PENDING_MASTER.md`

#### Canonical SSOT Fields (Use These Names Consistently)
Use these SSOT record fields (avoid mixing aliases):
- `issueKey` (or `externalId` if you use a secondary identifier)
- `status` (e.g., `open`, `claimed`, `in_progress`, `blocked`, `handoff_pending`, `resolved`)
- `assignment.agentId` = `[AGENT-XXX-Y]` or null
- `assignment.claimedAt`, `assignment.claimExpiresAt`, `assignment.claimToken` (if TTL/claim tokens exist)
- `handoffHistory[]` (handoff audit trail)

If your implementation currently uses `assignedTo`, treat it as an alias of `assignment.agentId` and migrate later.

#### HANDOFF SCENARIOS

**Scenario 1: Task Already Claimed (Do Not Collide)**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TASK ALREADY CLAIMED PROTOCOL                                         │
├─────────────────────────────────────────────────────────────────────────┤
│  1. □ Query SSOT by issueKey/externalId/key                             │
│  2. □ If status ∈ {claimed,in_progress} AND assignment.agentId != me:   │
│       → SKIP immediately                                                │
│       → Log note (SSOT comment or local log):                           │
│         "[AGENT-XXX-Y] Skipped <KEY> — owned by <OTHER_AGENT>"          │
│  3. □ If claim TTL exists AND claimExpiresAt < now:                      │
│       → Treat as stale claim (eligible for reclaim via atomic claim)     │
│  4. □ Move to next eligible task                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

**Scenario 2: You Must Hand Off (Out-of-Domain / Capability Gap)**

Trigger handoff if ANY of the following is true:
- File paths fall outside your domain routing rules
- Fix requires specialized expertise (finance, payroll, etc.)
- Issue touches multiple domains and you are not the coordinator agent
- You are blocked and cannot progress without another domain owner

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TASK HANDOFF PROTOCOL (SSOT FIRST)                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  1. □ Update SSOT issue atomically:                                     │
│       - status → "handoff_pending"                                      │
│       - assignment.agentId → null (release ownership)                   │
│       - append handoffHistory event with:                               │
│         from, to, timestamp, reason, nextAction, filesTouched           │
│  2. □ Update docs/PENDING_MASTER.md with a derived note referencing SSOT│
│  3. □ Release file locks in .fixzit/agent-assignments.json                 │
│  4. □ For P0/P1: Notify Eng. Sultan with the handoff notification box   │
│  5. □ STOP work on that item immediately                                │
└─────────────────────────────────────────────────────────────────────────┘
```

**Scenario 3: Claim a Task From SSOT (No Guessing)**

All task claiming MUST be SSOT-driven:
1) Query SSOT for eligible tasks (unassigned, correct domain, priority order)
2) Execute an atomic claim (or follow Pre-Claim SSOT Validation in Section 6)
3) Lock file paths locally (`.fixzit/agent-assignments.json`)
4) Announce claim with exact files

#### Delegation Rules by Agent Type (Routing)

| Agent Base | Tool / Type | Domain | Delegate To This Agent When… |
|---|---|---|---|
| AGENT-001-* | VS Code Copilot | Core/Auth/Middleware | Auth, middleware, platform-wide coordination |
| AGENT-002-* | Claude Code | Finance/Billing | Payments, invoicing, ZATCA/VAT, financial correctness |
| AGENT-003-* | Codex | Souq/Marketplace | Products, orders, vendors, marketplace workflows |
| AGENT-004-* | Cursor | Aqar/Real Estate | Property listings, contracts, valuation flows |
| AGENT-005-* | Windsurf | HR/Payroll | Employee, attendance, payroll correctness |
| AGENT-006-* | Reserved | Tests/Scripts | CI/CD, automation, test coverage, scripts |

Use the full token when known (e.g., `[AGENT-002-A]`). If unknown, delegate to the base (AGENT-002-*) and let the receiving pool decide the instance.

#### SSOT Query Patterns (Examples)

**Check if Task is Already Owned**

```javascript
db.issues.findOne({
  issueKey: "FM-00123",
  status: { $in: ["claimed", "in_progress", "blocked", "handoff_pending"] },
  "assignment.agentId": { $ne: null }
})
```

**Find Available High-Priority Tasks**

```javascript
db.issues.find({
  status: { $in: ["open", "triaged", "pending"] },
  "assignment.agentId": null,
  priorityLabel: { $in: ["P0", "P1"] }
}).sort({ priorityLabel: 1, impact: -1 }).limit(10)
```

**Find Available Tasks by Domain (Finance Example)**

```javascript
db.issues.find({
  status: { $in: ["open", "triaged", "pending"] },
  "assignment.agentId": null,
  $or: [
    { domain: "finance" },
    { riskTags: "FINANCIAL" },
    { filePaths: { $elemMatch: { $regex: /^app\/api\/finance\// } } }
  ]
}).sort({ priorityLabel: 1, impact: -1 }).limit(10)
```

#### Conflict Resolution (Last-Resort Only)

If atomic claim is implemented correctly, “two agents claimed the same task” should be extremely rare.

If it happens:
1) The SSOT record with the valid `assignment.claimToken` and earliest `assignment.claimedAt` retains ownership.
2) The losing agent MUST release local locks and move to the next available task.

#### Handoff Notification Format (Use Exactly)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔄 TASK HANDOFF NOTIFICATION                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  From: [AGENT-XXX-Y]                                                    │
│  To:   [AGENT-YYY-Z] or AGENT-YYY-*                                     │
│  Task: <issueKey> — <title>                                             │
│  Priority: P0 | P1 | P2 | P3                                            │
│  Status Set: handoff_pending                                            │
│  Reason: <why handoff is required>                                      │
│  Files Touched: <list (or NONE)>                                        │
│  What’s Done: <concise>                                                 │
│  Next Action: <single concrete next step>                               │
└─────────────────────────────────────────────────────────────────────────┘
```

#### Best Practices ✅ / Don’ts ❌

✅ DO:
- Query SSOT before starting work
- Update MongoDB first, then `docs/PENDING_MASTER.md`
- Release file locks immediately on handoff
- Provide concrete “Next Action” to prevent back-and-forth
- Notify Eng. Sultan for P0/P1 handoffs

❌ DON’T:
- Start work without SSOT verification
- Create duplicate SSOT issues (dedupe first)
- Handoff without context
- Keep locks after handing off
- Assume availability without querying SSOT

### 13.5 Phase 1: Discovery

```bash
# Locate canonical file
find . -name "PENDING_MASTER.md" -type f
# Confirm: docs/PENDING_MASTER.md

# Verify Issue Tracker endpoints exist
curl -s http://localhost:3000/api/issues/stats | jq .
```

### 13.6 Phase 2: Backlog Audit

Run **Pending Backlog Extractor v2.5** (Section 13.3).

Generate:
1. `BACKLOG_AUDIT.json` (machine-readable, SSOT import-ready)
2. `BACKLOG_AUDIT.md` (human checklist)

### 13.7 Phase 3: DB Sync (Idempotent)

```bash
POST /api/issues/import
Body: { issues: [...] }
# Capture: { created: N, updated: N, skipped: N, errors: N }
```

### 13.8 Phase 4: Apply Chat History Findings

| Finding Status | DB Action | Event Type |
|----------------|-----------|------------|
| Fixed | status → resolved, add resolution note | STATUS_CHANGED |
| In Progress | status → in_progress | STATUS_CHANGED |
| Blocked | status → blocked, add blocker reason | UPDATED |
| New | CREATE with full evidence | CREATED |
| Delegated | status → handoff_pending | DELEGATED |

### 13.9 Phase 5: Update PENDING_MASTER.md

**Append changelog entry (DO NOT rewrite entire file):**

````markdown
---

## 📅 YYYY-MM-DD HH:mm:ss (Asia/Riyadh) — VSCode Session Update

**Agent Token:** [AGENT-XXX-Y]
**Context:** <branch> | <commit short> | <PR link>
**Session Summary:** <1-2 sentences>
**DB Sync:** created=<n>, updated=<n>, skipped=<n>, errors=<n>

### 📊 Chat History Findings
| Timestamp | Type | File | Description | Status | Key | Agent |
|-----------|------|------|-------------|--------|-----|-------|

### ✅ Resolved Today
- **BUG-001** — <title> — Fixed at HH:mm:ss

### 🟠 In Progress
- **LOGIC-003** — <title> — Work started

### 🔴 Blocked
- **TEST-004** — <title> — Blocker: <reason>

### 🧩 Delegations (No Back-And-Forth)
| SSOT Key | Finding | Recommended Agent | Reason | Evidence |
|----------|---------|-------------------|--------|----------|
| BUG-456 | Missing org_id | [AGENT-002-A] | Finance module | file:L22-30 |

### 🆕 New Findings Added to DB
- **BUG-005** — <title> — sourceRef: <file:lines>

### 📁 Files Modified
- `path/file.ts` — <what changed>

### ⚡ Commands Executed
```bash
pnpm lint
pnpm test
git commit -m "fix: resolved BUG-001 [AGENT-001-A]"
```

### 🎯 Next Steps
- [ ] BUG-005 — Complete implementation
````

### 13.10 Phase 6: Verification

```bash
pnpm lint                                    # Must pass
pnpm test                                    # Must pass
curl http://localhost:3000/api/issues/stats  # 200 OK
```

### 13.11 MongoDB SSOT Schema Alignment (Toolkit)

Use the SSOT toolkit scripts when aligning Atlas with Appendix A:

```bash
# Required env vars
export MONGODB_URI="mongodb+srv://..."
export MONGODB_DB="fixzit"

# Migrate data to v6 fields (idempotent)
node scripts/ssot-migrate-v6.mjs

# Apply validator + indexes
node scripts/ssot-apply-schema-v6.mjs --level strict

# Verify schema + indexes
node scripts/ssot-verify.mjs
```

If any step fails: stop and log the failure in SSOT.

---

## 14. Auto-Review Protocol

### 14.1 Codex Review Gate (NO TIMEOUT BYPASS)

**CRITICAL CHANGE FROM v5.x:**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ⛔ CODEX REVIEW GATE — NO TIMEOUT BYPASS                               │
├─────────────────────────────────────────────────────────────────────────┤
│  • Agent may NOT declare "Complete" or "Ready to Merge" until          │
│    Codex review returns ✅ APPROVED                                     │
│                                                                         │
│  • If Codex review is pending:                                          │
│    - Status MUST be reported as REVIEW_PENDING                          │
│    - Agent may provide progress update to Eng. Sultan                   │
│    - Merge is FORBIDDEN until Codex approves                            │
│    - OR Eng. Sultan explicitly overrides                                │
│                                                                         │
│  • The 5-minute timeout bypass from v5.x is REMOVED                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### 14.2 Review Trigger Protocol

After completing ANY task:
1. Trigger Codex review with HIGH REASONING model
2. Submit TARGET CODE SET (diffs + file list)
3. **WAIT** for review response — NO TIMEOUT BYPASS
4. Status = `REVIEW_PENDING` until response received

### 14.3 Review Checklist (Codex validates)

- Types correct (no `any`)
- Tenant isolation (org_id on all queries)
- Error handling complete
- Input validation (Zod)
- Auth/RBAC enforced
- No console.log in prod
- i18n for user-facing strings
- Tests cover happy + error paths
- Deep-Dive similar patterns fixed

### 14.4 Response Handling

| Result | Action |
|--------|--------|
| ✅ APPROVED | Proceed to merge request |
| 🔴 BLOCKED | Fix blockers, re-run verification, re-trigger review |
| 🟡 SUGGESTIONS | Log to MongoDB as P3 issues |
| 📋 SIMILAR ISSUES | Create MongoDB issues, delegate to appropriate agents |

### 14.5 Final Output Notification (MANDATORY)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  🔔 FINAL OUTPUT — AGENT TASK COMPLETE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Agent: [AGENT-XXX-Y]                                                   │
│  Task: <summary>                                                        │
│  PR: #<number> — <link>                                                 │
│  Codex Review: APPROVED | REVIEW_PENDING | BLOCKED                      │
│  Files Modified: <N>                                                    │
│  Verification: typecheck ✅, lint ✅, vitest ✅                         │
│  Deep-Dive: <N> similar issues found and fixed                          │
│  Delegations: <N> issues delegated to other agents                      │
│  SSOT Sync: created=<n>, updated=<n>                                    │
│  Status: READY FOR ENG. SULTAN REVIEW | REVIEW_PENDING                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 15. Prompts Library

### 15.1 Pending Backlog Extractor (Canonical)

The canonical backlog extraction protocol is **Section 13.3 — Pending Backlog Extractor v2.5 (MANDATORY)**.

Use it to produce:
- `BACKLOG_AUDIT.json` (SSOT import payload)
- `BACKLOG_AUDIT.md` (human audit report)

### 15.2 Codex Targeted Review Prompt

**Purpose:** Deep code review with security, multi-tenancy, and quality focus.

**When to Use:** Before any merge request.

```markdown
# CODEX TARGETED REVIEW

## Context
- Agent: [AGENT-XXX-Y]
- PR: #<number>
- Files: <target code set>

## Review Checklist

### Security
- [ ] No XSS vulnerabilities
- [ ] No SQL/NoSQL injection
- [ ] No hardcoded secrets
- [ ] Input validation with Zod

### Multi-Tenancy
- [ ] org_id on ALL queries
- [ ] Session checks present
- [ ] RBAC enforced
- [ ] No cross-tenant data leaks

### Error Handling
- [ ] Try-catch on all await
- [ ] Error codes [FIXZIT-XXX-NNN]
- [ ] No silent failures

### TypeScript
- [ ] No `any` types
- [ ] No `@ts-ignore` without ticket
- [ ] Proper null safety

### UI/UX
- [ ] RTL-safe classes only
- [ ] Brand tokens used
- [ ] i18n for all strings
- [ ] 'use client' where needed

### Performance
- [ ] .lean() on read queries
- [ ] Proper indexing
- [ ] No N+1 patterns

## Verdict
[ ] ✅ APPROVED — Ready for merge
[ ] 🔴 BLOCKED — Critical issues found
[ ] 🟡 SUGGESTIONS — Non-blocking improvements

## Findings
| Severity | File:Line | Issue | Recommendation |
|----------|-----------|-------|----------------|
```

### 15.3 System-Aware PR Review Prompt

**Purpose:** Comprehensive PR review with Fixzit ecosystem awareness.

**When to Use:** For PRs touching multiple modules.

```markdown
# SYSTEM-AWARE PR REVIEW

## Fixzit Context
- Stack: Next.js 14, TypeScript, MongoDB Atlas, Tailwind
- Modules: FM, Souq, Aqar, Finance, HR
- Compliance: ZATCA Phase 2, VAT 15%
- RTL-first design

## PR Scorecard

| Category | Points | Score |
|----------|--------|-------|
| TypeScript | /15 | |
| ESLint | /10 | |
| Tests | /15 | |
| Tenant Scope | /15 | |
| RTL Support | /10 | |
| Theme Tokens | /5 | |
| Error Handling | /10 | |
| i18n | /5 | |
| Security | /10 | |
| Documentation | /5 | |
| **TOTAL** | **/100** | |

**Merge Threshold: ≥85 points**

## Deep-Dive Results
- Pattern scanned: <pattern>
- Occurrences found: N
- Fixed in PR: N
- Delegated: N (keys: ...)
```

---

## Appendix A: MongoDB Issue Schema

```javascript
db.createCollection("issues", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["tenantId", "issueKey", "title", "type", "status", "priorityLabel", "priorityRank", "domain", "createdAt", "version"],
      properties: {
        tenantId: { bsonType: "string" },
        issueKey: { bsonType: "string", pattern: "^(FM|SOUQ|AQAR|HR|CORE)-[0-9]{5}$" },
        title: { bsonType: "string", minLength: 10, maxLength: 200 },
        description: { bsonType: "string", maxLength: 4000 },
        type: { enum: ["bug", "task", "feature", "security", "performance", "tech_debt"] },
        priorityLabel: { enum: ["P0", "P1", "P2", "P3"] },
        priorityRank: { bsonType: "int", minimum: 1, maximum: 4 },
        priority: { bsonType: ["int", "null"], minimum: 1, maximum: 5 }, // legacy optional
        domain: { enum: ["core", "auth", "middleware", "finance", "billing", "souq", "marketplace", "aqar", "real_estate", "hr", "payroll", "tests", "scripts"] },
        status: { enum: ["open", "triaged", "claimed", "in_progress", "blocked", "handoff_pending", "resolved", "verified", "closed", "abandoned"] },
        filePaths: { bsonType: "array", items: { bsonType: "string" } },
        
        // AGENT COORDINATION FIELDS
        assignment: {
          bsonType: "object",
          properties: {
            agentId: { bsonType: ["string", "null"], pattern: "^AGENT-00[1-6](-[A-Z])?$" },
            agentType: { enum: [null, "Copilot", "Claude Code", "Codex", "Cursor", "Windsurf"] },
            claimedAt: { bsonType: ["date", "null"] },
            claimExpiresAt: { bsonType: ["date", "null"] },
            claimToken: { bsonType: ["string", "null"] },
            history: {
              bsonType: "array",
              items: {
                bsonType: "object",
                properties: {
                  agentId: { bsonType: "string" },
                  action: { enum: ["claimed", "released", "transferred", "expired"] },
                  timestamp: { bsonType: "date" },
                  reason: { bsonType: "string" }
                }
              }
            }
          }
        },
        
        // HANDOFF TRACKING
        handoffHistory: {
          bsonType: "array",
          items: {
            bsonType: "object",
            properties: {
              from: { bsonType: "string" },
              to: { bsonType: "string" },
              timestamp: { bsonType: "date" },
              reason: { bsonType: "string" }
            }
          }
        },
        
        // DEDUPLICATION
        contentHash: { bsonType: "string", pattern: "^[a-f0-9]{16}$" },
        
        // TIMESTAMPS
        createdAt: { bsonType: "date" },
        updatedAt: { bsonType: "date" },
        resolvedAt: { bsonType: ["date", "null"] },
        
        // OPTIMISTIC CONCURRENCY
        version: { bsonType: "int", minimum: 1 }
      }
    }
  },
  validationLevel: "strict",
  validationAction: "error"
});

// Required Indexes
db.issues.createIndex({ tenantId: 1, status: 1, priorityRank: 1 }, { name: "idx_tenant_status_priority" });
db.issues.createIndex({ tenantId: 1, issueKey: 1 }, { unique: true, name: "idx_unique_issue_key" });
db.issues.createIndex({ tenantId: 1, "assignment.agentId": 1, status: 1 }, { name: "idx_agent_assignments" });
db.issues.createIndex({ contentHash: 1 }, { unique: true, sparse: true, name: "idx_dedup_hash" });
db.issues.createIndex({ filePaths: 1 }, { name: "idx_file_paths" });
db.issues.createIndex({ "assignment.claimExpiresAt": 1 }, { 
  name: "idx_claim_expiry",
  partialFilterExpression: { status: { $in: ["claimed", "in_progress"] } }
});
```

---

## Appendix B: Agent Routing Configuration

```json
{
  "routingVersion": "6.0.0",
  "defaultAgent": "AGENT-001",
  "maxConcurrentAgents": 2,
  "claimTTLMinutes": 60,
  "routingRules": [
    {
      "agent": "AGENT-001",
      "type": "Copilot",
      "priority": 100,
      "patterns": ["app/api/core/**", "middleware/**", "lib/auth/**", "lib/session/**", "lib/jwt/**", "lib/errors/**", "lib/logging/**", "lib/config/**", "components/**"],
      "issueCategories": ["authentication", "authorization", "middleware", "cors", "rate-limiting", "error-handling"],
      "capabilities": ["typescript", "nextjs", "middleware", "jwt", "oauth"]
    },
    {
      "agent": "AGENT-002",
      "type": "Claude Code",
      "priority": 90,
      "patterns": ["app/api/finance/**", "app/api/billing/**", "lib/payments/**", "lib/invoices/**", "lib/tax/**", "lib/currency/**"],
      "issueCategories": ["payments", "invoicing", "tax-calculation", "subscriptions", "refunds"],
      "capabilities": ["stripe-api", "tax-engines", "pdf-generation", "financial-calculations"]
    },
    {
      "agent": "AGENT-003",
      "type": "Codex",
      "priority": 90,
      "patterns": ["app/api/souq/**", "app/api/marketplace/**", "lib/products/**", "lib/orders/**", "lib/cart/**", "lib/shipping/**"],
      "issueCategories": ["product-catalog", "order-management", "inventory", "shipping"],
      "capabilities": ["e-commerce", "inventory-systems", "shipping-apis"]
    },
    {
      "agent": "AGENT-004",
      "type": "Cursor",
      "priority": 90,
      "patterns": ["app/api/aqar/**", "app/api/properties/**", "lib/listings/**", "lib/bookings/**", "lib/contracts/**"],
      "issueCategories": ["property-listings", "bookings", "contracts", "tenant-management"],
      "capabilities": ["real-estate-domain", "contract-generation", "map-apis"]
    },
    {
      "agent": "AGENT-005",
      "type": "Windsurf",
      "priority": 90,
      "patterns": ["app/api/hr/**", "app/api/payroll/**", "lib/attendance/**", "lib/leaves/**", "lib/salaries/**"],
      "issueCategories": ["employee-management", "payroll", "attendance", "leave-management"],
      "capabilities": ["hr-systems", "payroll-calculations", "wps-integration"]
    },
    {
      "agent": "AGENT-006",
      "type": "Reserved",
      "priority": 80,
      "patterns": ["tests/**", "__tests__/**", "scripts/**", "cypress/**", "playwright/**", ".github/workflows/**"],
      "issueCategories": ["test-failures", "test-coverage", "e2e-tests", "ci-cd"],
      "capabilities": ["jest", "vitest", "cypress", "playwright", "github-actions"]
    }
  ],
  "conflictResolution": {
    "strategy": "highest_priority_wins",
    "tiebreaker": "lower_agent_id_wins",
    "multiDomainCoordinator": "AGENT-001"
  }
}
```

---

## Changelog

### v6.0.1 (2025-12-23)

**Protocol Additions:**
- Added Cross-Device Git Sync Protocol (Section 5.4) and Repo Portability Protocol (Section 5.5).
- Added Capacity Escalation and Emergency Override rules (Sections 5.6, 5.7).
- Added Git preflight phase and tooling preference for SSOT validation (Section 6).
- Added MongoDB SSOT schema alignment toolkit steps (Section 13.11).
- Updated lockfile path to `.fixzit/agent-assignments.json` (gitignored).

**Schema Updates:**
- Added `priorityLabel`/`priorityRank` and made `priority` legacy optional; index updated to `priorityRank`.

**Routing Updates:**
- Added `components/**` to AGENT-001 routing (Table + Appendix B).


### v6.0.0 (2025-12-21)

**Major Changes:**
- Complete document restructure with numbered sections
- Added Table of Contents for navigation
- Added Definitions table (Section 2)
- Added Agent Token Protocol as mandatory (Section 3)
- Added Pre-Claim SSOT Validation (Section 6) — agents MUST query SSOT before claiming
- Added Scope Expansion Protocol (Section 8) — resolves deep-dive vs locks conflict
- Added SSOT coordination protocols inside SSOT Sync (Section 13):
  - Pending Backlog Extractor v2.5 (Section 13.3)
  - Agent Task Handoff Protocol (Section 13.4)
- **REMOVED** 5-minute Codex timeout bypass — replaced with `REVIEW_PENDING` state
- Added Prompts Library (Section 15) — consolidated all prompts in one place
- Added Appendix A: Complete MongoDB Schema with agent coordination fields
- Added Appendix B: Agent Routing Configuration JSON

**Schema Changes:**
- Added `assignment.agentId`, `assignment.claimedAt`, `assignment.claimExpiresAt`, `assignment.claimToken`
- Added `assignment.history` array for claim audit trail
- Added `handoffHistory` array for delegation tracking
- Added `contentHash` for deduplication
- Added `version` for optimistic concurrency control

**Resolved Contradictions:**
- "WAIT for Codex" vs "proceed after 5 minutes" → Now: NO timeout bypass, use REVIEW_PENDING
- "Fix once everywhere" vs "locked paths only" → Now: Scope Expansion Protocol (Section 8)
- Multiple checklists with duplicate steps → Now: Cross-referenced, single source per protocol

**Extractor Changes:**
- Canonicalized extractor as **Pending Backlog Extractor v2.5** (Section 13.3)
- Removed duplicate/backdrifting extractor variants from Prompts Library
- Standardized governance priority model to **P0–P3**, with deterministic `priorityRank` mapping (P0=1..P3=4)

**Removed Redundancies:**
- Duplicate forbidden actions lists → Single authoritative box in Section 1.2
- Repeated pnpm commands → Referenced to verification sections
- Multiple SSOT descriptions → Single Definitions entry in Section 2

---

*Document maintained by Eng. Sultan Al Hassni*  
*Last updated: 2025-12-21 (Asia/Riyadh)*

---

END OF AGENTS.md v6.0
