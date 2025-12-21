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

| Term | Definition |
|------|------------|
| **SSOT** | Single Source of Truth — MongoDB Issue Tracker ONLY |
| **Derived Log** | `docs/PENDING_MASTER.md` — snapshot of SSOT, never authoritative |
| **Agent Token** | Unique identifier `[AGENT-XXX-Y]` for attribution (e.g., `[AGENT-001-A]`) |
| **Lock** | Exclusive file path claim in `/tmp/agent-assignments.json` |
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
| AGENT-001-A/B/C | VS Code Copilot | Core/Auth/Middleware | `app/api/core/**`, `middleware/**`, `lib/auth/**`, `lib/session/**`, `lib/jwt/**`, `lib/errors/**`, `lib/logging/**` |
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

### 4.2 Pre-Start Checklist (8 items — MANDATORY)

Before starting ANY task:

```
□ 1. Read /tmp/agent-assignments.json — check for conflicts
□ 2. Execute Pre-Claim SSOT Validation (Section 6)
□ 3. Claim slot with Agent Token: [AGENT-XXX-Y]
□ 4. List EXACT files to modify (no wildcards)
□ 5. Verify git status is clean
□ 6. Verify worktrees: `git worktree list` (must be only main)
□ 7. Run: `pnpm typecheck` (must pass)
□ 8. Run: `pnpm lint` (must pass)
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
□ 7.  Release lock in agent-assignments.json
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
| Max worktrees | 1 (main only) | Memory overhead reduction |
| Max concurrent issues per agent | 3 | Workload management |
| Claim TTL | 60 minutes | Auto-release for crashed agents |

### 5.2 Assignment File Structure

Location: `/tmp/agent-assignments.json`

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

---

## 6. Pre-Claim SSOT Validation (MANDATORY)

**Every agent MUST execute this checklist before claiming ANY work.**

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
        - Update /tmp/agent-assignments.json with additional file locks
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

### 9.1 Purpose

Prevent agents from "fighting" over tasks or working inefficiently on domains outside their specialization. Ensure smooth handover via SSOT.

### 9.2 Domain Recognition (Know Your Lane)

| Agent Type | Primary Domain | Handoff Trigger |
|------------|----------------|-----------------|
| Copilot | Core/Auth/API | Finance/Billing logic found → Hand off to Claude |
| Claude Code | Finance/Billing | Marketplace/Product logic found → Hand off to Codex |
| Codex | Souq/Marketplace | Real Estate logic found → Hand off to Cursor |
| Cursor | Aqar/Real Estate | HR/Payroll logic found → Hand off to Windsurf |
| Windsurf | HR/Payroll | Core Auth logic found → Hand off to Copilot |

### 9.3 Handoff Triggers

```typescript
const HANDOFF_TRIGGERS = {
  // Issue touches files from multiple domains
  MULTI_DOMAIN_FILES: (filePaths) => {
    const agents = filePaths.map(f => getAgentForPath(f));
    return new Set(agents).size > 1;
  },
  
  // Agent explicitly requests handoff
  EXPLICIT_REQUEST: (status) => status === 'handoff_requested',
  
  // Capability mismatch detected
  CAPABILITY_GAP: (required, agentCaps) => {
    return required.some(r => !agentCaps.includes(r));
  },
  
  // Agent blocked for > 30 minutes
  BLOCKED_TIMEOUT: (blockedAt) => {
    return Date.now() - blockedAt.getTime() > 30 * 60 * 1000;
  }
};
```

### 9.4 Handoff Execution Protocol

**Step 1:** If you identify an issue OUTSIDE your assigned domain:
- DO NOT FIX IT (unless P0/Critical blocker)

**Step 2:** LOG to MongoDB SSOT:
```json
{
  "status": "handoff_pending",
  "handoffHistory": [{
    "from": "[AGENT-XXX-Y]",
    "to": "[AGENT-YYY-Z]",
    "timestamp": "2025-12-21T14:30:00+03:00",
    "reason": "Issue requires middleware authentication changes"
  }]
}
```

**Step 3:** UPDATE `docs/PENDING_MASTER.md`:
```
- [ ] KEY-123 — <title> — ⚠️ DELEGATED TO [AGENT-002] (Claude Code) for finance logic
```

**Step 4:** STOP working on that specific item

### 9.5 Receiving a Delegation

Before starting work, every agent must:
1. Check `docs/PENDING_MASTER.md` for items marked `DELEGATED TO [MY-AGENT-ID]`
2. Check MongoDB for issues with `status: handoff_pending` and `handoffHistory.to: MY_AGENT_ID`
3. PRIORITIZE these delegated tasks above general backlog items
4. Execute Pre-Claim SSOT Validation (Section 6) before claiming

### 9.6 Multi-Domain Issue Coordination

For issues touching 3+ agent domains, implement coordinator pattern:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  AGENT-001 (Coordinator)                                 │
│  - Receives multi-domain issue                                          │
│  - Breaks into domain-specific subtasks                                 │
│  - Assigns subtasks to domain agents                                    │
│  - Aggregates results                                                   │
│  - Performs final integration                                           │
└─────────────────────────────────────────────────────────────────────────┘
         │              │              │
         ▼              ▼              ▼
   ┌─────────┐    ┌─────────┐    ┌─────────┐
   │AGENT-002│    │AGENT-003│    │AGENT-006│
   │ Finance │    │  Souq   │    │  Tests  │
   │ subtask │    │ subtask │    │ subtask │
   └─────────┘    └─────────┘    └─────────┘
```

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

```markdown
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
```

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

BEFORE blaming "missing env var", verify in ALL locations:

1. GitHub Repository Secrets (Settings → Secrets and variables → Actions)
2. Vercel Environment Variables (Production/Preview/Development)
3. Local .env files (.env.local, .env.development.local)
4. .env.example is up to date

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

### 13.3 Phase 1: Discovery

```bash
# Locate canonical file
find . -name "PENDING_MASTER.md" -type f
# Confirm: docs/PENDING_MASTER.md

# Verify Issue Tracker endpoints exist
curl -s http://localhost:3000/api/issues/stats | jq .
```

### 13.4 Phase 2: Backlog Audit

Generate:
1. `BACKLOG_AUDIT.json` (machine-readable, SSOT import-ready)
2. `BACKLOG_AUDIT.md` (human checklist)

**Extraction Rules:**
- Only: OPEN/PENDING/UNRESOLVED
- Exclude: ✅ 🟢 Done/Fixed/Resolved/Completed
- Dedupe: Latest wins
- Every item: sourceRef + evidenceSnippet + agentToken

### 13.5 Phase 3: DB Sync (Idempotent)

```bash
POST /api/issues/import
Body: { issues: [...] }
# Capture: { created: N, updated: N, skipped: N, errors: N }
```

### 13.6 Phase 4: Apply Chat History Findings

| Finding Status | DB Action | Event Type |
|----------------|-----------|------------|
| Fixed | status → resolved, add resolution note | STATUS_CHANGED |
| In Progress | status → in_progress | STATUS_CHANGED |
| Blocked | status → blocked, add blocker reason | UPDATED |
| New | CREATE with full evidence | CREATED |
| Delegated | status → handoff_pending | DELEGATED |

### 13.7 Phase 5: Update PENDING_MASTER.md

**Append changelog entry (DO NOT rewrite entire file):**

```markdown
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
```

### 13.8 Phase 6: Verification

```bash
pnpm lint                                    # Must pass
pnpm test                                    # Must pass
curl http://localhost:3000/api/issues/stats  # 200 OK
```

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

### 15.1 Pending Backlog Extractor v2.6

**Purpose:** Parse PENDING_MASTER.md and produce deduplicated backlog for sprint planning and MongoDB import.

**When to Use:** After any session update to PENDING_MASTER.md

**Agent Token Integration:** Every extracted item includes `agentToken` field for attribution.

```markdown
# PENDING BACKLOG EXTRACTOR v2.6
## Fixzit Multi-Agent Governance Integration

### ROLE
You are a **Backlog Extraction & Triage Agent**. Your Agent ID MUST be identified in output.

### 🔑 AGENT IDENTIFICATION (MANDATORY)
- **Agent ID:** `[AGENT-XXX-Y]` (e.g., `[AGENT-001-A]`)
- **Session ID:** `EXTRACT-<TIMESTAMP>-<AGENT-ID>`
- Output: Include `agentToken` in JSON root and Markdown header

### HARD CONSTRAINTS (VIOLATION = FAILURE)
1) **NO INVENTION:** Extract ONLY what exists in source text
2) **NO COMPLETED ITEMS:** Exclude ✅/🟢/Done/Fixed/Resolved/Completed
3) **TRIAGE ONLY:** Classify and sort, do not propose new work
4) **ENGLISH ONLY**
5) **SOURCE TRACEABILITY:** Every item must include:
   - `sourceRef` (section/date heading)
   - `location` (file:lines OR Doc-only)
   - `evidenceSnippet` (≤25 words exact from source)
   - `agentToken` (if present in source, else "Not specified")

### OUTPUT SCHEMA (MongoDB-aligned)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["issueKey", "title", "type", "priority", "domain", "filePaths", "extractedAt"],
  "properties": {
    "issueKey": {
      "type": "string",
      "pattern": "^(FM|SOUQ|AQAR|HR|CORE)-[0-9]{5}$"
    },
    "title": { "type": "string", "minLength": 10, "maxLength": 200 },
    "description": { "type": "string", "maxLength": 4000 },
    "type": { "enum": ["bug", "task", "feature", "security", "performance", "tech_debt"] },
    "priority": { "type": "integer", "minimum": 1, "maximum": 5 },
    "domain": { "enum": ["core", "auth", "middleware", "finance", "billing", "souq", "marketplace", "aqar", "real_estate", "hr", "payroll", "tests", "scripts"] },
    "filePaths": { "type": "array", "items": {"type": "string"}, "minItems": 1 },
    "assignedTo": {
      "type": ["string", "null"],
      "pattern": "^AGENT-00[1-6](-[A-Z])?$",
      "description": "Agent ID in AGENT-XXX-Y format, null if unassigned"
    },
    "claimedAt": {
      "type": ["string", "null"],
      "format": "date-time",
      "description": "ISO 8601 timestamp when claimed (Asia/Riyadh)"
    },
    "claimExpiresAt": {
      "type": ["string", "null"],
      "format": "date-time",
      "description": "TTL expiration (default: claimedAt + 60 minutes)"
    },
    "claimToken": {
      "type": ["string", "null"],
      "description": "UUID for claim ownership verification"
    },
    "status": {
      "enum": ["open", "claimed", "in_progress", "blocked", "handoff_pending", "completed", "abandoned"],
      "default": "open"
    },
    "agentType": {
      "enum": [null, "Copilot", "Claude Code", "Codex", "Cursor", "Windsurf"]
    },
    "agentToken": {
      "type": "string",
      "description": "Source agent token [AGENT-XXX-Y] or 'Not specified in source'"
    },
    "extractedAt": { "type": "string", "format": "date-time" },
    "extractionSource": { "type": "string" },
    "contentHash": { "type": "string", "pattern": "^[a-f0-9]{16}$" },
    "suggestedAgent": { "type": "string", "pattern": "^AGENT-00[1-6]$" },
    "recommendedAgentToken": {
      "type": ["string", "null"],
      "description": "For delegated items, the recommended handler"
    },
    "delegatedBy": {
      "type": ["string", "null"],
      "description": "Agent token that delegated this item"
    },
    "version": { "type": "integer", "minimum": 1, "default": 1 }
  }
}
```

### SSOT COORDINATION HOOKS

Before finalizing any extracted item:

1. **DEDUPLICATION CHECK**
   ```
   Query: db.issues.findOne({ contentHash: "<computed_hash>" })
   Action: If exists, SKIP extraction and log duplicate
   ```

2. **ASSIGNMENT CHECK**
   ```
   Query: db.issues.findOne({ 
     filePaths: { $in: ["<any_file>"] },
     status: { $in: ["claimed", "in_progress"] }
   })
   Action: If exists, add reference instead of creating new
   ```

3. **AGENT ROUTING**
   Apply file path rules to set `suggestedAgent` automatically.

### DOMAIN-BASED ISSUE KEY GENERATION

| Domain Match | Prefix | Example |
|-------------|--------|---------|
| app/api/core/**, middleware/**, lib/auth/** | CORE | CORE-00042 |
| app/api/finance/**, billing/** | FM | FM-00123 |
| app/api/souq/**, marketplace/** | SOUQ | SOUQ-00089 |
| app/api/aqar/**, real-estate/** | AQAR | AQAR-00015 |
| app/api/hr/**, payroll/** | HR | HR-00007 |
| tests/**, scripts/** | CORE | CORE-00099 |

### AGENT TOKEN EXTRACTION (DETERMINISTIC)

- If section/date heading contains `Agent Token:` use it for all items under that block
- If multiple Agent Tokens in same block, use nearest one above item
- If none exist, set "Not specified in source"

### PRIORITY RULES (P1-P5)

| Priority | Keywords | Score |
|----------|----------|-------|
| P1 (Critical) | security, data leak, cross-tenant, RBAC bypass | 1 |
| P2 (High) | auth, ownership, compliance, logic error | 2 |
| P3 (Medium) | missing tests, performance, validation gap | 3 |
| P4 (Low) | refactor, cleanup, docs | 4 |
| P5 (Trivial) | nice-to-have | 5 |

### OUTPUT FORMAT

**A) BACKLOG_AUDIT.json** (SSOT Import-ready)
```json
{
  "agentToken": "[AGENT-XXX-Y]",
  "extractedAt": "YYYY-MM-DD HH:mm (Asia/Riyadh)",
  "sourceFile": "PENDING_MASTER.md",
  "counts": { "total": N, "byPriority": {...}, "delegated": N },
  "issues": [...]
}
```

**B) BACKLOG_AUDIT.md** (Human Report)
- Executive Summary with Agent Token
- Category Breakdown
- File Heat Map
- Sprint Buckets
- Delegation Summary
```

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
      required: ["tenantId", "issueKey", "title", "type", "status", "priority", "domain", "createdAt", "version"],
      properties: {
        tenantId: { bsonType: "string" },
        issueKey: { bsonType: "string", pattern: "^(FM|SOUQ|AQAR|HR|CORE)-[0-9]{5}$" },
        title: { bsonType: "string", minLength: 10, maxLength: 200 },
        description: { bsonType: "string", maxLength: 4000 },
        type: { enum: ["bug", "task", "feature", "security", "performance", "tech_debt"] },
        priority: { bsonType: "int", minimum: 1, maximum: 5 },
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
db.issues.createIndex({ tenantId: 1, status: 1, priority: -1 }, { name: "idx_tenant_status_priority" });
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
      "patterns": ["app/api/core/**", "middleware/**", "lib/auth/**", "lib/session/**", "lib/jwt/**", "lib/errors/**", "lib/logging/**", "lib/config/**"],
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

### v6.0.0 (2025-12-21)

**Major Changes:**
- Complete document restructure with numbered sections
- Added Table of Contents for navigation
- Added Definitions table (Section 2)
- Added Agent Token Protocol as mandatory (Section 3)
- Added Pre-Claim SSOT Validation (Section 6) — agents MUST query SSOT before claiming
- Added Scope Expansion Protocol (Section 8) — resolves deep-dive vs locks conflict
- Added Task Handoff Protocol (Section 9) — formal delegation via SSOT
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
- Upgraded to v2.6 with agent token fields (`assignedTo`, `claimedAt`, `status`, `agentType`)
- Added SSOT coordination hooks (dedup check, assignment check, agent routing)
- Added `recommendedAgentToken` and `delegatedBy` fields for handoff tracking
- Priority scale changed from P0-P3 to P1-P5 for alignment with external systems

**Removed Redundancies:**
- Duplicate forbidden actions lists → Single authoritative box in Section 1.2
- Repeated pnpm commands → Referenced to verification sections
- Multiple SSOT descriptions → Single Definitions entry in Section 2

---

*Document maintained by Eng. Sultan Al Hassni*  
*Last updated: 2025-12-21 (Asia/Riyadh)*

---

END OF AGENTS.md v6.0
