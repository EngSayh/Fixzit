# Fixzit — Agent Working Agreement v7.0.0 (Dec 2025)

> **SSOT Declaration:** MongoDB Issue Tracker is the ONLY Single Source of Truth.  
> `docs/PENDING_MASTER.md` is a derived log/snapshot ONLY. Never create tasks there without MongoDB first.  
> **All timestamps:** Asia/Riyadh (UTC+03:00)

---

## 📑 Table of Contents

1. [Mission & Non-Negotiables](#1-mission--non-negotiables)
2. [Definitions](#2-definitions)
3. [Agent Token Protocol (MANDATORY)](#3-agent-token-protocol-mandatory)
4. [Agent Lifecycle](#4-agent-lifecycle)
   - 4.2 [Multi-Role Validation Protocol (MANDATORY)](#42-multi-role-validation-protocol-mandatory)
     - 4.2.1 [Product Manager Gate](#421-product-manager-gate)
     - 4.2.2 [Business Analyst / Domain SME Gate](#422-business-analyst--domain-sme-gate)
     - 4.2.3 [UX/UI Lead Gate](#423-uxui-lead-gate)
     - 4.2.4 [Engineering Manager / Tech Lead Gate](#424-engineering-manager--tech-lead-gate)
     - 4.2.5 [Backend Engineer Gate](#425-backend-engineer-gate)
     - 4.2.6 [Frontend Engineer Gate](#426-frontend-engineer-gate)
     - 4.2.7 [Mobile Engineer Gate](#427-mobile-engineer-gate-if-mobile-impacting)
     - 4.2.8 [QA Lead Gate](#428-qa-lead-gate)
     - 4.2.9 [Security Engineer Gate](#429-security-engineer-gate)
     - 4.2.10 [DevOps/SRE Gate](#4210-devopssre-gate)
     - 4.2.11 [Finance/Tax Compliance Gate](#4211-financetax-compliance-gate-if-financial)
     - 4.2.12 [Integration Engineer Gate](#4212-integration-engineer-gate-if-external-services)
     - 4.2.13 [Privacy/Compliance Gate](#4213-privacycompliance-gate-if-personal-data)
     - 4.2.14 [Developer Task Breakdown](#4214-developer-task-breakdown)
     - 4.2.15 [Gate Completion Summary Template](#4215-gate-completion-summary-template)
     - 4.2.16 [Quick Reference Checklist](#4216-quick-reference-checklist)
     - 4.2.17 [Forbidden Actions (Validation Violations)](#4217-forbidden-actions-validation-violations)
5. [Multi-Agent Coordination](#5-multi-agent-coordination)
   - 5.8 [Terminal Management Protocol](#58-terminal-management-protocol-mandatory)
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
18. [Appendix C: Environment Variables Reference](#appendix-c-environment-variables-reference)
19. [Appendix D: People Checker Role Checklists](#appendix-d-people-checker-role-checklists)
20. [Changelog](#changelog)

---
## 1. Mission & Non-Negotiables

### 1.1 Mission Statement

Maintain the Fixzit multi-tenant SaaS platform with zero tolerance for shortcuts, ensuring every fix addresses root causes and all work is traceable through MongoDB SSOT.

### 1.2 Absolute Non-Negotiables (AUTO-FAIL if violated)



┌─────────────────────────────────────────────────────────────────────────┐
│ ❌ FORBIDDEN ACTIONS — ANY VIOLATION = IMMEDIATE TASK FAILURE │
├─────────────────────────────────────────────────────────────────────────┤
│ • Commenting out failing tests │
│ • Adding @ts-ignore without ticket + justification │
│ • Swallowing errors silently (try-catch that ignores) │
│ • Using as any to bypass types │
│ • Hardcoding values instead of fixing data source │
│ • Deleting code instead of fixing root cause │
│ • Skipping SSOT update after any finding │
│ • "Works on my machine" without evidence │
│ • Deferring without logging to MongoDB │
│ • Claiming "out of scope" without tracked issue │
│ • Blaming "env var missing" without checking GitHub + Vercel │
│ • Force merging PRs with unresolved comments │
│ • Bypassing Codex review gate │
│ • Editing files outside locked paths without Scope Expansion │
│ • Missing Agent Token in commits, PRs, or SSOT events │
│ • Skipping Multi-Role Validation (Section 4.2) │
│ • Marking gate as N/A when it clearly applies │
│ • Starting implementation before Phase 1 (Strategic) completion │
│ • Proceeding with High/Critical risk findings unmitigated │
│ • Missing QA test plan + verification evidence for claimed fix │
│ • Any layout/functionality drift vs governance baselines │
│ • Introducing confirmation prompts or manual gating into fix flows │
│ • Editing build outputs / generated artifacts to “pass” checks │
└─────────────────────────────────────────────────────────────────────────┘


---

## 2. Definitions

Owner Override (Session): If the System Design Document (SDD) is missing/unreadable, proceed using available SSOT files  
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
| **Golden Workflow** | Critical path flow that must not regress (ticket lifecycle, approvals, RFQ→PO, invoicing/payments) |
| **Multi-Role Validation** | Mandatory role-gate validation protocol (Section 4.2). Also referred to as “People Checker” / “Virtual Boardroom”. |
| **MRDR** | Multi-Role Decision Record — the written summary of gate outputs logged into SSOT before coding |
| **HFV** | Halt–Fix–Verify protocol (Strict: per page × role; artifacts required) |

---
## 3. Agent Token Protocol (MANDATORY)

### 3.1 Agent Token Format (UNIQUE PER SESSION)

┌─────────────────────────────────────────────────────────────────────────┐
│ ⚠️ CRITICAL: EVERY AGENT SESSION MUST HAVE A UNIQUE TOKEN              │
├─────────────────────────────────────────────────────────────────────────┤
│ Multiple agents using the same token = UNTRACEABLE WORK = AUTO-FAIL    │
│ Token reuse across sessions = FORBIDDEN                                │
│ Default fallback tokens are for EMERGENCY ONLY                         │
└─────────────────────────────────────────────────────────────────────────┘

**Token Format:**
```
[AGENT-XXXX]

Where:
XXXX = Sequential session number from SSOT (0001, 0002, 0003, ...)
```

**Examples:**
- `[AGENT-0001]` — First session ever
- `[AGENT-0042]` — 42nd session
- `[AGENT-0156]` — 156th session

### 3.2 Agent Type Prefixes (Optional Metadata)

For internal tracking, agent type can be added as metadata in SSOT:

| Agent Type Code | Agent Platform | Primary Domain |
|-----------------|----------------|----------------|
| `COPILOT` | VS Code Copilot | Core/Auth/UI |
| `CLAUDE` | Claude Code | Finance/Billing |
| `CODEX` | OpenAI Codex | Souq/Marketplace |
| `CURSOR` | Cursor AI | Aqar/Real Estate |
| `WINDSURF` | Windsurf | HR/Payroll |
| `OTHER` | Other AI | Tests/Scripts |

### 3.3 Session Token Assignment (SSOT Auto-Increment) — MANDATORY

**BEFORE any work, every agent MUST:**

1. **Query SSOT for the next session number:**
   ```javascript
   // Get the highest session number
   const lastSession = await db.agent_sessions.findOne(
     {},
     { sort: { sessionNumber: -1 } }
   );
   const nextNumber = (lastSession?.sessionNumber || 0) + 1;
   ```

2. **Register the session in SSOT IMMEDIATELY:**
   ```javascript
   await db.agent_sessions.insertOne({
     sessionNumber: nextNumber,
     agentToken: `[AGENT-${String(nextNumber).padStart(4, '0')}]`,
     agentType: "COPILOT", // or CLAUDE, CODEX, CURSOR, etc.
     platform: "VS Code Copilot Chat",
     startedAt: new Date(),
     status: "active",
     tasksPlanned: [],
     tasksCompleted: [],
     filesModified: [],
     commits: []
   });
   ```

3. **Announce the token at session start:**
   ```
   AGENTS.md read. Agent Token: [AGENT-0042]
   ```

### 3.4 Token Collision Prevention

┌─────────────────────────────────────────────────────────────────────────┐
│ ❌ FORBIDDEN TOKEN BEHAVIORS — ANY VIOLATION = AUTO-FAIL               │
├─────────────────────────────────────────────────────────────────────────┤
│ • Using [AGENT-001-A] or any hardcoded default                         │
│ • Reusing a token from a previous session                              │
│ • Using the same token as another concurrent agent                     │
│ • Skipping SSOT registration before starting work                      │
│ • Inventing a token number without SSOT query                          │
│ • Using fallback tokens without documenting SSOT failure               │
└─────────────────────────────────────────────────────────────────────────┘

**If SSOT is unavailable (emergency only):**
1. Use format: `[AGENT-TEMP-{timestamp}]` e.g., `[AGENT-TEMP-20260103T1430]`
2. Log the SSOT failure reason in your first commit message
3. Create SSOT entry retroactively when connection is restored

### 3.5 Required Agent Token Placements (NON-NEGOTIABLE)

Every action MUST be attributable to your unique Agent Token:

1. **Session Start Announcement** — MUST state: "Agent Token: [AGENT-XXXX]"
2. **Every Commit Message** — MUST include `[AGENT-XXXX]`
3. **Every PENDING_MASTER Entry** — MUST include `[AGENT-XXXX]` in header
4. **Every MongoDB Issue Event** — MUST include `[AGENT-XXXX]` in `by` field
5. **Every PR Description** — MUST include `[AGENT-XXXX]`
6. **Session End Summary** — MUST include `[AGENT-XXXX]`

**If Agent Token is missing in any of the above → AUTO-FAIL**

### 3.6 Commit Message Format

```
<type>(<scope>): <description> [AGENT-XXXX] [ISSUE-KEY]

Examples:
fix(api): enforce org_id on orders [AGENT-0042] [BUG-214]
feat(auth): add RBAC middleware [AGENT-0043] [CORE-045]
test(finance): add invoice validation tests [AGENT-0044] [FM-089]
```

### 3.7 Session Task Recording (MANDATORY)

**Each agent MUST record ALL tasks worked on in MongoDB Issue Tracker.**

At session end, update the session record:
```javascript
await db.agent_sessions.updateOne(
  { agentToken: "[AGENT-XXXX]", status: "active" },
  {
    $set: {
      status: "completed",
      endedAt: new Date(),
      summary: "<session summary>"
    },
    $push: {
      tasksCompleted: {
        $each: [
          { issueKey: "BUG-XXX", action: "fixed", files: ["path/to/file.ts"] },
          { issueKey: "FEAT-YYY", action: "implemented", files: [...] }
        ]
      },
      commits: {
        $each: ["abc1234", "def5678"]
      }
    }
  }
);
```

**Forbidden:**
- ❌ Ending session without recording tasks to SSOT
- ❌ Recording partial task information
- ❌ Skipping task recording "because it was small"

At session end, update the session record:
```javascript
db.agent_sessions.updateOne(
  { agentToken: "[AGENT-XXX-Y]", status: "active" },
  {
    $set: {
      status: "completed",
      endedAt: new Date(),
      summary: "<session summary>"
    },
    $push: {
      tasksCompleted: {
        $each: [
          { issueKey: "BUG-XXX", action: "fixed", files: ["path/to/file.ts"] },
          { issueKey: "FEAT-YYY", action: "implemented", files: [...] }
        ]
      }
    }
  }
)
```

**Forbidden:**
- ❌ Ending session without recording tasks to SSOT
- ❌ Recording partial task information
- ❌ Skipping task recording "because it was small"


---
## 4. Agent Lifecycle

### 4.1 Lifecycle Phases



CLAIM → VALIDATE (Multi-Role Gates) → WORK → VERIFY → REVIEW → SSOT → CLEANUP


### 4.2 Multi-Role Validation Protocol (MANDATORY)

> **Replaces:** Three-Perspective Thinking Protocol (Section 4.2 in v6.0.1)  
> **Purpose:** Every issue MUST pass validation from all relevant team role perspectives before implementation.

#### Required Evidence
- Gate outputs MUST be logged in SSOT issue notes **before** coding begins.
- If a gate triggers specialized domain risk you cannot mitigate, you MUST handoff/delegate via SSOT (see Section 13.4 + Appendix B routing).

---

#### 4.2.0 Protocol Overview

**Every task MUST pass through role-based validation gates BEFORE implementation.**

The protocol ensures that fixes don't just work technically but also:
- Meet product requirements and user expectations
- Are operationally realistic and compliant
- Follow UX/UI standards and accessibility requirements
- Maintain architectural integrity
- Pass security and quality gates
- Are observable, testable, and deployable



┌─────────────────────────────────────────────────────────────────────────┐
│ MULTI-ROLE VALIDATION GATE │
├─────────────────────────────────────────────────────────────────────────┤
│ Before ANY implementation work, agent MUST complete: │
│ │
│ PHASE 1: STRATEGIC VALIDATION (What + Why) │
│ □ Product Manager Gate (4.2.1) │
│ □ Business Analyst Gate (4.2.2) │
│ □ UX/UI Lead Gate (4.2.3) │
│ │
│ PHASE 2: TECHNICAL VALIDATION (How + Architecture) │
│ □ Engineering Manager Gate (4.2.4) │
│ □ Backend Engineer Gate (4.2.5) │
│ □ Frontend Engineer Gate (4.2.6) │
│ □ Mobile Engineer Gate (4.2.7) — if mobile-impacting │
│ │
│ PHASE 3: QUALITY & SECURITY VALIDATION (Correctness + Safety) │
│ □ QA Lead Gate (4.2.8) │
│ □ Security Engineer Gate (4.2.9) │
│ □ DevOps/SRE Gate (4.2.10) │
│ │
│ PHASE 4: COMPLIANCE & INTEGRATION VALIDATION (Regulations + External) │
│ □ Finance/Tax Compliance Gate (4.2.11) — if financial │
│ □ Integration Engineer Gate (4.2.12) — if external services │
│ □ Privacy/Compliance Gate (4.2.13) — if personal data │
│ │
│ PHASE 5: TASK BREAKDOWN (Execution Plan) │
│ □ Developer Task Breakdown (4.2.14) │
│ │
│ VIOLATION = Implementing without completing relevant gates │
└─────────────────────────────────────────────────────────────────────────┘


#### 4.2.0.1 Gate Applicability Matrix

Not all gates apply to every issue. Use this matrix to determine required gates:

| Issue Type | Required Gates | Conditional Gates |
|------------|----------------|-------------------|
| **Bug Fix (UI)** | 4.2.1, 4.2.3, 4.2.6, 4.2.8, 4.2.14 | 4.2.9 (if auth/PII), 4.2.7 (if mobile) |
| **Bug Fix (API)** | 4.2.1, 4.2.4, 4.2.5, 4.2.8, 4.2.14 | 4.2.9 (if auth), 4.2.11 (if finance) |
| **Bug Fix (Multi-tenant)** | 4.2.1, 4.2.4, 4.2.5, 4.2.8, 4.2.9, 4.2.14 | All |
| **New Feature** | ALL GATES (4.2.1–4.2.13) + Task Breakdown (4.2.14) | — |
| **Security Fix** | 4.2.1, 4.2.4, 4.2.5, 4.2.8, 4.2.9, 4.2.10, 4.2.14 | 4.2.13 (if PII) |
| **Performance Fix** | 4.2.4, 4.2.5, 4.2.8, 4.2.10, 4.2.14 | — |
| **Integration Fix** | 4.2.4, 4.2.5, 4.2.8, 4.2.12, 4.2.14 | 4.2.11 (if payments) |
| **ZATCA/Compliance** | 4.2.1, 4.2.2, 4.2.4, 4.2.5, 4.2.8, 4.2.11, 4.2.14 | 4.2.13 |
| **Refactor/Tech Debt** | 4.2.4, 4.2.5, 4.2.8, 4.2.14 | 4.2.10 (if infra) |

> **People Checker note:** If the issue impacts onboarding/support/marketplace operations, consult Appendix D during 4.2.1 and 4.2.2 and reflect those constraints in acceptance criteria and UAT.

---

### PHASE 1: STRATEGIC VALIDATION (What + Why)

### 4.2.1 Product Manager Gate
**Role Mission:** Own roadmap, scope control, releases — ensure fix aligns with product vision.

Think as a Product Manager and validate:

| Checkpoint | Question | Must Answer |
|------------|----------|-------------|
| **Roadmap Alignment** | Does this fix align with current sprint/release goals? | Yes/No + explain |
| **Scope Creep Check** | Is the proposed fix solving the ACTUAL user problem, not a tangential issue? | Confirm user story |
| **MVP vs V1 vs V2** | Is this fix appropriate for current phase, or should it be deferred? | Phase assignment |
| **Role Impact** | Which roles are affected? (Tenant/Owner/Tech/Vendor/Admin/Corporate) | List affected roles |
| **Golden Workflow Impact** | Does this touch a "golden workflow"? (ticket lifecycle, approvals, RFQ→PO) | Yes/No + which |
| **Acceptance Criteria** | What are the specific conditions that mark this fix as "done"? | Bullet list |
| **Release Gate** | Any go/no-go considerations? Dependencies on other work? | List blockers |

**Additional PM obligations (Dec 2025 governance alignment):**
- Confirm “no layout/workflow drift” and “global element baseline” constraints when applicable (single header, global footer, language/currency selectors, back-to-home, mock data completeness, maps where required).
- Ensure acceptance criteria includes **HFV proof artifacts** if the issue is user-facing.

**Output Required:**
```markdown
### PM Gate Analysis
- **User Story:** As a [role], I need [capability] so that [benefit]
- **Acceptance Criteria:**
  1. [Criterion 1]
  2. [Criterion 2]
- **Roadmap Phase:** MVP | V1 | V2
- **Roles Affected:** [list]
- **Golden Workflow:** [Yes/No] — [which]
- **Release Blockers:** [none | list]
- **Ops/Support Impact (Appendix D):** [none | summary]

4.2.2 Business Analyst / Domain SME Gate

Role Mission: Requirements are correct and operationally realistic — ensure fix matches FM/Real Estate operations.

Think as a Business Analyst and validate:

Checkpoint	Question	Must Answer
Operational Reality	Does the fix match how FM/Real Estate operations actually work?	Confirm with process
Workflow Correctness	Are SLAs, categories, checklists, and state transitions correct?	Validate states
Service Catalog	If affecting services: is pricing logic correct (internal vs vendor)?	Pricing validation
Role-to-Permission	Does the fix respect real-life responsibilities? (dispatch, approvals, QA)	Permission check
Data Model Validation	Are field requirements correct? (property/unit/asset/lease, work order states, costs)	Schema review
Edge Cases	What about escalations, rejections, rework, cancellations?	List edge cases
UAT Scenario	What UAT test would validate this fix?	Describe scenario

Output Required:

### BA Gate Analysis
- **Operational Process:** [describe real-world workflow]
- **State Machine:** [current_state] → [action] → [new_state]
- **Permissions Required:** [list by role]
- **Data Fields Affected:** [list with validation rules]
- **Edge Cases Considered:**
  1. [Edge case 1] — [handling]
  2. [Edge case 2] — [handling]
- **UAT Scenario:** [step-by-step test case]

4.2.3 UX/UI Lead Gate

Role Mission: Consistent, fast UI across web + mobile — ensure fix follows design system and governance baselines.

Think as a UX/UI Lead and validate:

Checkpoint	Question	Must Answer
Layout Pattern	Does fix follow global layout patterns? (single header/sidebar/footer, tabs, search, quick actions)	Confirm pattern
RTL/LTR Behavior	Is RTL-first design maintained? No hardcoded left/right?	RTL audit result
i18n Copy	Are all user-facing strings in translation functions?	i18n check
Accessibility	WCAG AA compliance? Keyboard nav, screen readers, contrast?	A11y checklist
Design Tokens	Using brand tokens? No hardcoded colors (#hex values)?	Token audit
UI States	Error, empty, loading states defined?	State coverage
Layout Regression	Will this break existing layouts?	Regression check
Figma Alignment	Does implementation match Figma specs?	Design review

Governance alignment notes (Dec 2025):

Enforce single header (no duplicate top bars).

Enforce global footer on all pages.

Language selector must meet: flag + native name + ISO code + type-ahead (and RTL keeps flag on the left).

Currency selector must show correct icon everywhere.

Back-to-home button must exist (landing) and be keyboard accessible.

Output Required:

### UX/UI Gate Analysis
- **Layout Pattern:** [sidebar/tabs/modal/page]
- **RTL Compliance:** [Pass/Fail] — [violations if any]
- **i18n Coverage:** [Pass/Fail] — [untranslated strings]
- **Accessibility:**
  □ Keyboard navigation
  □ Screen reader labels
  □ Color contrast
  □ Focus indicators
- **Design Tokens Used:** [list tokens]
- **UI States Covered:**
  □ Loading
  □ Empty
  □ Error
  □ Success
- **Regression Risk:** [Low/Medium/High] — [reason]
- **Global Elements Check:** Header (single), Footer, Language selector, Currency selector, Back-to-home

PHASE 2: TECHNICAL VALIDATION (How + Architecture)
4.2.4 Engineering Manager / Tech Lead Gate

Role Mission: Delivery velocity with architectural control — ensure fix maintains system integrity.

Think as an Engineering Manager and validate:

Checkpoint	Question	Must Answer
Module Boundaries	Does fix respect modular-monolith boundaries?	Confirm isolation
Coding Standards	Does fix follow established patterns for this domain module?	Standard compliance
API Contract	Any API contract changes? Backward compatibility?	Contract review
Data Scoping	Is org_id / owner scope correctly enforced?	Scoping audit
RBAC Enforcement	Are permission checks in place?	RBAC verification
Technical Debt	Does this introduce or reduce tech debt?	Debt assessment
Observability	Logging, metrics, tracing in place?	Observability check
No Regression	Layout freeze + functionality freeze respected?	Regression risk

Output Required:

### Tech Lead Gate Analysis
- **Module Affected:** [Core/Souq/Aqar/Finance/HR/FM]
- **Boundary Violations:** [None | list]
- **API Changes:**
  - Endpoint: [path]
  - Breaking: [Yes/No]
  - Versioning: [strategy]
- **Multi-Tenancy:**
  - org_id scoping: [enforced | missing on: list]
  - RBAC: [enforced | missing on: list]
- **Tech Debt Impact:** [Reduces/Introduces/Neutral]
- **Observability:**
  □ Structured logging
  □ Error tracking
  □ Performance metrics

4.2.5 Backend Engineer Gate

Role Mission: Stable APIs + correct data isolation — ensure fix is backend-safe.

Think as a Backend Engineer and validate:

Checkpoint	Question	Must Answer
Auth/Session	JWT/OIDC handling correct? Session validation?	Auth check
User/Role Model	Permission model correctly implemented?	RBAC implementation
Domain API	Does API follow domain patterns? (properties/units, work orders, approvals)	API pattern check
Row-Level Auth	Every endpoint enforces row-level authorization?	Authorization audit
Audit Logging	Who-did-what-when logged for sensitive operations?	Audit trail
File Storage	Pre-signed URLs, proper expiry, secure access?	Storage security
Rate Limits	Rate limiting applied appropriately?	Rate limit check
Input Validation	Zod schemas, sanitization, type validation?	Validation review
State Machine	State transitions follow domain rules?	State machine audit

Output Required:

### Backend Gate Analysis
- **Authentication:**
  □ JWT validation
  □ Session checks
  □ Token refresh handling
- **Authorization:**
  - Endpoint: [path]
  - RBAC check: [present/missing]
  - org_id filter: [present/missing]
- **Data Validation:**
  - Zod schema: [defined/missing]
  - Fields validated: [list]
- **Audit Requirements:**
  □ User action logged
  □ Timestamp recorded
  □ Before/after state captured
- **State Transitions:**
  - Valid: [state1 → state2]
  - Invalid blocked: [state1 → state3]

4.2.6 Frontend Engineer Gate

Role Mission: Fast, correct UX per role — ensure fix delivers proper UI behavior.

Think as a Frontend Engineer and validate:

Checkpoint	Question	Must Answer
Role-Based Nav	Navigation and page access correctly gated by role?	Role gate check
Module UI	Follows module UI patterns? (board/list, views, inbox)	UI pattern check
Deep Links	Notifications link to correct screens?	Deep link test
Global Search	Search UX permission-aware?	Search permissions
Quick Create	Create patterns respect permissions?	Permission gates
RTL + Theme	RTL and dark/light mode consistent?	Theme consistency
Client Directive	'use client' added where hooks are used?	Directive check
Error Boundaries	Graceful error handling in components?	Error boundary audit

Output Required:

### Frontend Gate Analysis
- **Role Gating:**
  - Component: [name]
  - Roles allowed: [list]
  - Gate implementation: [usePermission/middleware]
- **UI Pattern:**
  - Pattern used: [DataTable/Board/Form/Modal]
  - Consistent with module: [Yes/No]
- **Theme Compliance:**
  □ RTL-safe classes only
  □ Dark mode compatible
  □ Brand tokens used
- **Hooks & Directives:**
  □ 'use client' present where needed
  □ No SSR issues
- **Error Handling:**
  □ Error boundary implemented
  □ Fallback UI defined

4.2.7 Mobile Engineer Gate (If Mobile-Impacting)

Role Mission: Mobile apps for Tenant/Technician/Owner/Corporate — ensure fix works on mobile.

Think as a Mobile Engineer and validate:

Checkpoint	Question	Must Answer
Role-Based Shell	Mobile shell aligned with role?	Shell check
API Compatibility	Same backend APIs work for mobile?	API compatibility
Offline-First	Offline flows preserved? (technician updates, photo capture)	Offline check
Push Notifications	Deep linking from push notifications work?	Push + deep link
Mobile Performance	Startup time, list performance, image upload optimized?	Performance check
Form Factor	Works on different screen sizes?	Responsive check

Output Required:

### Mobile Gate Analysis
- **Impact Level:** [No Impact | Minor | Major]
- **Role Shells Affected:** [Tenant/Tech/Owner/Corporate]
- **API Compatibility:** [Compatible | Breaking changes: list]
- **Offline Considerations:**
  □ Works offline
  □ Sync on reconnect
  □ Conflict resolution
- **Performance Impact:**
  - Startup: [No impact | Degraded by: X ms]
  - List loading: [No impact | Affected]

PHASE 3: QUALITY & SECURITY VALIDATION (Correctness + Safety)
4.2.8 QA Lead Gate

Role Mission: "Zero-error" confidence and regression protection — ensure fix is testable and tested.

Think as a QA Lead and validate:

Checkpoint	Question	Must Answer
Test Matrix	Page × role × critical actions covered?	Matrix coverage
UI Tests	Sidebar links, forms, RTL/LTR, dark/light, role access gates?	UI test plan
API Tests	Auth scopes, forbidden data access, state transitions?	API test plan
Smoke Tests	Deploy smoke test updated?	Smoke test check
Regression Risk	What could break?	Risk assessment
Halt-Fix-Verify	Workflow enforcement in place?	HFV compliance
Edge Cases	Negative paths, boundary conditions, error states?	Edge case coverage

HFV strict requirement (Dec 2025):
For each page × role:

Navigate and test actions.

If error appears → screenshot + wait 10s → second screenshot.

HALT navigation immediately.

Fix all errors (console/runtime/network/build).

Re-test until 0 errors.

Only then move to the next page.

Output Required:

### QA Gate Analysis
- **Test Matrix Entry:**
  | Page | Role | Action | Expected | Test Type |
  |------|------|--------|----------|-----------|
  | [page] | [role] | [action] | [result] | [Unit/Integration/E2E] |

- **Required Tests:**
  □ Unit tests for [functions]
  □ Integration tests for [APIs]
  □ E2E tests for [flows]
- **Regression Risks:**
  1. [Risk 1] — [mitigation]
  2. [Risk 2] — [mitigation]
- **Test Commands:**
  ```bash
  pnpm vitest run [pattern]
  pnpm test:e2e [pattern]


Artifacts Plan (HFV Proof): [screenshots/logs/build summary/commit ref]


---

### 4.2.9 Security Engineer Gate

**Role Mission:** Security posture + audit readiness — ensure fix doesn't introduce vulnerabilities.

Think as a Security Engineer and validate:

| Checkpoint | Question | Must Answer |
|------------|----------|-------------|
| **Threat Model** | Multi-tenancy, RBAC, files, payments, vendor portal threats? | Threat assessment |
| **OWASP Top 10** | Any OWASP risks? (Injection, Broken Auth, XSS, etc.) | OWASP check |
| **Secrets Handling** | No hardcoded secrets, proper env var usage? | Secrets audit |
| **Input Sanitization** | All inputs sanitized and validated? | Sanitization check |
| **Output Encoding** | XSS prevention through proper encoding? | Encoding check |
| **Authentication** | Auth bypass impossible? | Auth bypass test |
| **Authorization** | Privilege escalation impossible? | Priv esc test |
| **Data Exposure** | Sensitive data properly protected? | Data exposure check |

**Output Required:**
```markdown
### Security Gate Analysis
- **Threat Assessment:**
  - Attack surface: [describe]
  - Threat actors: [internal/external]
  - Assets at risk: [list]
- **OWASP Compliance:**
  □ A01 Broken Access Control
  □ A02 Cryptographic Failures
  □ A03 Injection
  □ A07 XSS
- **Security Controls:**
  - Input validation: [Zod schema | custom]
  - Output encoding: [React auto | manual]
  - Auth check: [middleware | route]
- **Risk Rating:** [Low | Medium | High | Critical]
- **Mitigations Required:** [list or "None"]

4.2.10 DevOps/SRE Gate

Role Mission: Reliable deployments and monitoring — ensure fix is deployable and observable.

Think as a DevOps/SRE Engineer and validate:

Checkpoint	Question	Must Answer
CI Pipeline	Lint/typecheck/test/build will pass?	CI compatibility
Preview Environments	Works in preview deployment?	Preview check
Secrets Validation	Required secrets available in all environments?	Secrets check
Error Tracking	Errors will be tracked and alerted?	Sentry/logging
Performance Metrics	Performance impact measurable?	Metrics coverage
Environment Parity	Works same in dev/stage/prod?	Env parity
Rollback Plan	Can this be rolled back safely?	Rollback strategy
Incident Runbook	Runbook update needed?	Runbook check

Output Required:

### DevOps Gate Analysis
- **CI/CD Impact:**
  □ Build passes
  □ No new warnings
  □ Test coverage maintained
- **Environment Variables:**
  | Variable | Dev | Stage | Prod | GitHub |
  |----------|-----|-------|------|--------|
  | [var1] | ✅ | ✅ | ✅ | ✅ |
- **Observability:**
  □ Structured logging added
  □ Error tracking configured
  □ Metrics exposed
- **Deployment:**
  - Risk level: [Low | Medium | High]
  - Rollback strategy: [describe]
  - Canary needed: [Yes | No]

PHASE 4: COMPLIANCE & INTEGRATION VALIDATION
4.2.11 Finance/Tax Compliance Gate (If Financial)

Role Mission: Correct invoices, taxes, compliance-ready outputs — ensure ZATCA/VAT compliance.

Think as a Finance/Tax Compliance Engineer and validate:

Checkpoint	Question	Must Answer
Invoice Flow	Invoice/credit note flows correct? Required fields present?	Invoice audit
ZATCA Integration	ZATCA Phase 2 requirements met?	ZATCA compliance
VAT Calculation	15% VAT calculated correctly?	VAT check
QR Encoding	QR code rules followed?	QR validation
Invoice Numbering	Sequential, unique, auditable?	Numbering check
Audit Trail	Financial operations fully auditable?	Audit completeness
Decimal Handling	Decimal128 used for money?	Decimal precision
Subscription Billing	Plans, limits, renewals correct?	Billing logic

Output Required:

### Finance Compliance Gate Analysis
- **ZATCA Phase 2:**
  □ Required XML fields present
  □ Digital signature
  □ QR code generation
  □ UUID format correct
- **VAT Calculation:**
  - Rate applied: [15%]
  - Taxable amount: [field]
  - VAT amount: [field]
  - Total: [field]
- **Invoice Requirements:**
  □ Sequential numbering
  □ Seller/buyer details
  □ Line items with VAT
  □ Payment terms
- **Audit Trail:**
  □ Creation logged
  □ Modifications tracked
  □ Immutable after issue

4.2.12 Integration Engineer Gate (If External Services)

Role Mission: Integrations work reliably end-to-end — ensure external service connections are robust.

Think as an Integration Engineer and validate:

Checkpoint	Question	Must Answer
Payment Gateway	Tap/PayTabs/Moyasar integration correct?	Gateway check
Webhooks	Webhook handlers idempotent and secure?	Webhook audit
Reconciliation	Payment reconciliation logic sound?	Reconciliation check
Messaging	SMS/WhatsApp/Email templates and deliverability?	Messaging check
Deep Links	Message deep links work?	Deep link test
Maps/Geocoding	Property and technician dispatch maps work?	Maps integration
Gov APIs	Government/enterprise integrations secure?	Gov API check
Error Recovery	What happens when external service fails?	Failure handling

Output Required:

### Integration Gate Analysis
- **External Services Affected:** [list]
- **API Contracts:**
  | Service | Endpoint | Auth | Timeout |
  |---------|----------|------|---------|
  | [svc] | [endpoint] | [method] | [ms] |
- **Webhook Handling:**
  □ Signature verification
  □ Idempotency
  □ Retry handling
- **Failure Modes:**
  | Failure | Detection | Recovery |
  |---------|-----------|----------|
  | [timeout] | [how] | [action] |
- **Credentials:**
  □ No hardcoded secrets
  □ Env vars configured

4.2.13 Privacy/Compliance Gate (If Personal Data)

Role Mission: PDPL-ready processes and evidence — ensure personal data protection.

Think as a Privacy/Compliance Officer and validate:

Checkpoint	Question	Must Answer
Data Processing	What personal data is processed?	Data inventory
Retention Rules	Proper retention periods applied?	Retention check
Access Controls	Only authorized roles access PII?	Access audit
DSAR Process	Can data subject requests be fulfilled?	DSAR capability
Consent	Consent properly captured where needed?	Consent check
Cross-Border	Any cross-border data transfer implications?	Transfer check
Incident Response	Data breach process in place?	Incident readiness
Logging	PII not logged inappropriately?	Log audit

Output Required:

### Privacy Gate Analysis
- **Personal Data Affected:**
  | Field | Category | Sensitivity |
  |-------|----------|-------------|
  | [field] | [PII/sensitive] | [Low/Med/High] |
- **PDPL Compliance:**
  □ Data minimization
  □ Purpose limitation
  □ Retention periods
  □ Access logging
- **Consent Requirements:**
  - Required: [Yes | No]
  - Mechanism: [describe]
- **Cross-Border:**
  - Transfer: [Yes | No]
  - Safeguards: [describe]

PHASE 5: EXECUTION PLAN
4.2.14 Developer Task Breakdown

Role Mission: Actionable, traceable execution plan with clear verification criteria.

Create detailed task breakdown:

Field	Required
File List	Exact paths (no wildcards)
Change Type	Create / Modify / Delete
Dependencies	Must complete X before Y
Verification	How to confirm success
Effort	XS/S/M/L/XL per task
Risk	What could go wrong?

Output Required:

### Developer Task Breakdown

#### Pre-Implementation Checks
- [ ] All applicable gates completed
- [ ] SSOT claim acquired
- [ ] File locks obtained
- [ ] Branch created: `agent/<TOKEN>/<ISSUE>/<slug>`

#### Tasks
| # | Task | File(s) | Change | Depends On | Effort | Risk |
|---|------|---------|--------|------------|--------|------|
| 1 | [task] | [path] | Modify | — | S | Low |
| 2 | [task] | [path] | Create | 1 | M | Med |

#### Verification Plan
| Task | Verification Command | Expected Result |
|------|----------------------|-----------------|
| 1 | `pnpm typecheck` | 0 errors |
| 2 | `pnpm vitest run [pattern]` | All pass |

#### Rollback Plan
- If Task 1 fails: [action]
- If Task 2 fails: [action]

4.2.15 Gate Completion Summary Template

After completing all applicable gates, produce this summary:

## Multi-Role Validation Summary (MRDR)

**Issue:** [KEY] — [title]  
**Agent:** [AGENT-XXX-Y]  
**Date:** [YYYY-MM-DD HH:mm (Asia/Riyadh)]

### Gates Completed

| Phase | Gate | Status | Key Finding |
|-------|------|--------|-------------|
| 1 | Product Manager | ✅ | [summary] |
| 1 | Business Analyst | ✅ | [summary] |
| 1 | UX/UI Lead | ✅ | [summary] |
| 2 | Engineering Manager | ✅ | [summary] |
| 2 | Backend Engineer | ✅ | [summary] |
| 2 | Frontend Engineer | ✅ | [summary] |
| 2 | Mobile Engineer | ⏭️ N/A | — |
| 3 | QA Lead | ✅ | [summary] |
| 3 | Security Engineer | ✅ | [summary] |
| 3 | DevOps/SRE | ✅ | [summary] |
| 4 | Finance Compliance | ⏭️ N/A | — |
| 4 | Integration Engineer | ✅ | [summary] |
| 4 | Privacy/Compliance | ⏭️ N/A | — |
| 5 | Task Breakdown | ✅ | [X tasks identified] |

### Critical Findings
1. [Finding 1]
2. [Finding 2]

### Implementation Approved: ✅ YES

### Estimated Effort: [M]

### Risk Level: [Low | Medium | High]

4.2.16 Quick Reference Checklist

For rapid validation, use this condensed checklist:

┌─────────────────────────────────────────────────────────────────────────┐
│  MULTI-ROLE QUICK VALIDATION CHECKLIST                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  □ PM: User story defined, acceptance criteria clear                    │
│  □ BA: Workflow matches real operations, edge cases listed              │
│  □ UX: RTL-safe, tokens used, states defined, a11y checked              │
│  □ Tech Lead: Module boundaries respected, org_id enforced              │
│  □ Backend: Auth + RBAC + validation + audit trail                      │
│  □ Frontend: Role gates + client directive + error boundaries           │
│  □ Mobile: API compatible, offline considered (if applicable)           │
│  □ QA: Test plan created, regression risks identified                   │
│  □ Security: OWASP checked, no secrets, inputs validated                │
│  □ DevOps: CI passes, env vars exist, rollback planned                  │
│  □ Finance: ZATCA/VAT correct (if applicable)                           │
│  □ Integration: External services robust (if applicable)                │
│  □ Privacy: PII protected (if applicable)                               │
│  □ Tasks: Breakdown complete with verification plan                     │
└─────────────────────────────────────────────────────────────────────────┘

4.2.17 Forbidden Actions (Validation Violations)

These are AUTO-FAIL violations (also reflected in Section 1.2 Non-Negotiables):

┌─────────────────────────────────────────────────────────────────────────┐
│  ❌ VALIDATION VIOLATIONS — AUTO-FAIL                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  • Skipping applicable gates without documented justification           │
│  • Marking gate as N/A when it clearly applies                          │
│  • Starting implementation before completing Phase 1 (Strategic)        │
│  • Ignoring security findings from Phase 3                              │
│  • Missing test plan from QA gate                                       │
│  • No task breakdown before coding                                      │
│  • Proceeding with High-risk findings unmitigated                       │
│  • Incomplete gate outputs (missing required fields)                    │
└─────────────────────────────────────────────────────────────────────────┘

4.3 Pre-Start Checklist (MANDATORY)

Before starting ANY task:

□ 1. Run git preflight (Section 5.4) — repo up to date with origin/main
□ 2. Read .fixzit/agent-assignments.json — check for conflicts
□ 3. Execute Pre-Claim SSOT Validation (Section 6)
□ 4. Claim slot with Agent Token: [AGENT-XXX-Y]
□ 5. List EXACT files to modify (no wildcards)
□ 6. Complete applicable Multi-Role Validation Gates (Section 4.2)
□ 7. Record MRDR (Section 4.2.15) in SSOT issue notes BEFORE coding
□ 8. Verify git status is clean
□ 9. Verify worktrees: `git worktree list` (must be single worktree only)
□ 10. Run: `pnpm typecheck` (must pass)
□ 11. Run: `pnpm lint` (must pass)


Announce: [AGENT-XXX-Y] Claimed. Files: <list>

4.4 Post-Task Checklist (13 items — MANDATORY)

After completing ANY task:

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

5. Multi-Agent Coordination
5.1 Resource Limits
Resource	Limit	Rationale
Max concurrent agents per workspace	2	Prevents VS Code Exit Code 5 crashes
Max worktrees	1 (single worktree only)	Memory overhead reduction
Max concurrent issues per agent	3	Workload management
Claim TTL	60 minutes	Auto-release for crashed agents
5.2 Assignment File Structure

Location: .fixzit/agent-assignments.json (gitignored)

{
  "version": "7.0.0",
  "lastUpdated": "2025-12-28T14:30:00+03:00",
  "activeAgents": [
    {
      "agentId": "AGENT-001-A",
      "agentType": "Copilot",
      "status": "active",
      "claimedAt": "2025-12-28T14:00:00+03:00",
      "claimExpiresAt": "2025-12-28T15:00:00+03:00",
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

5.3 Conflict Resolution Rules

First to lock wins — Atomic claim in MongoDB

Lower ID keeps lock on conflict — AGENT-001 > AGENT-002 > ... > AGENT-006

Expired claims auto-release — Heartbeat monitor every 30 seconds

Multi-domain issues → AGENT-001 acts as coordinator

5.4 Cross-Device Git Sync Protocol (MANDATORY)

Goal: Prevent stale work when switching devices (macOS + Windows).
Rule: No agent may claim or modify files until the local repo is fresh vs origin/main.

Pre-Work Git Freshness Gate (Required)

Run BEFORE any SSOT claim:

git fetch --prune origin
git status -sb
git rev-list --left-right --count origin/main...HEAD


Interpretation:

If behind > 0: STOP. Run git pull --rebase origin main, then re-run.

If ahead > 0: OK only on a feature branch; push before switching devices.

Mandatory Branch Discipline (2-device safe)

Never work directly on main.

Branch format: agent/<AGENT-TOKEN>/<ISSUE-KEY>/<short-slug>.

One active branch per device per issue (avoid parallel edits of same files).

Conflict Rule (Non-negotiable)

Resolve conflicts properly; no shortcuts.

Run full verification; update SSOT with the conflict note.

If conflict touches out-of-domain files: handoff via SSOT.

Automation (Preferred)

If available:

node scripts/git-preflight.mjs --require-clean --base origin/main


Failing this script = failing pre-claim validation.

5.5 Repo Portability Protocol (MANDATORY)

Goal: Keep the repo usable on macOS, Windows, and Linux CI.

Naming Rules

Use ASCII only for file/folder names.

Use kebab-case for filenames.

Avoid reserved characters: < > : " / \ | ? * and control chars.

Avoid reserved names: CON, PRN, AUX, NUL, COM1..COM9, LPT1..LPT9.

Avoid trailing spaces or trailing periods in names.

Keep path length under 240 characters (safety margin across tooling).

Never introduce case-collision paths (File.ts vs file.ts).

Verification Gate

Run before PR / merge:

node scripts/check-repo-portability.mjs


Fail = must fix file naming/path issues before merge.

5.6 Capacity Escalation Rule

If all eligible agents are at the 3-issue cap and urgent work arrives:

Log the capacity block in SSOT with impacted issue keys.

Notify Eng. Sultan to reassign or approve a temporary cap increase.

Do not self-claim beyond the cap without explicit SSOT override.

5.7 Emergency Override (Break-Glass)

Only Eng. Sultan may authorize an emergency override.

Authorization must be recorded in SSOT with timestamp and reason.

No static override codes or secrets may be stored in the repo.

### 5.8 Terminal Management Protocol (MANDATORY)

**Goal:** Prevent terminal corruption and resource exhaustion when multiple agents/extensions operate in the same workspace.

#### 5.8.0 Dev Server Protection (NON-NEGOTIABLE)

┌─────────────────────────────────────────────────────────────────────────┐
│ 🔒 DEV SERVER TERMINAL IS SACRED — NEVER KILL IT                       │
├─────────────────────────────────────────────────────────────────────────┤
│ The dev server on localhost:3000 MUST be running at ALL times.         │
│ It auto-starts when VS Code opens the workspace.                       │
│ Only ONE instance should ever exist (no duplicates).                   │
│ Terminal MUST be named: "Fixzit Local" for easy identification.        │
└─────────────────────────────────────────────────────────────────────────┘

**Dev Server Rules:**

| Rule | Requirement |
|------|-------------|
| **Auto-Start** | Dev server starts automatically when workspace opens |
| **Single Instance** | Only ONE dev server terminal can exist at a time |
| **Terminal Name** | Dev server terminal MUST be named **"Fixzit Local"** |
| **Never Kill** | Agents MUST NEVER kill the `Fixzit Local` terminal |
| **Dedicated Panel** | Dev server runs in its own dedicated panel |
| **Always Alive** | If crashed, manually restart via `Dev: Restart Server` task |

**At Session Start, VERIFY dev server is running:**
```powershell
# Check if dev server is running on port 3000
(Test-NetConnection -ComputerName localhost -Port 3000).TcpTestSucceeded
# If FALSE → Run task "Dev: Start Server"
```

**If Dev Server Crashed:**
1. Run VS Code task: `Dev: Restart Server`
2. OR manually: `pnpm dev`
3. Verify at http://localhost:3000

**Forbidden:**
- ❌ Killing the dev server terminal
- ❌ Running `pnpm dev` in a shared/agent terminal
- ❌ Creating duplicate dev server instances
- ❌ Using the dev server terminal for other commands

#### 5.8.1 Terminal Naming Convention (MANDATORY)

**All terminals MUST be named for easy identification and tracking.**

| Terminal Type | Naming Pattern | Example |
|--------------|----------------|---------|
| **Dev Server** | `Fixzit Local` | `Fixzit Local` |
| **Agent Work** | `[AGENT-XXXX]` | `[AGENT-0008]` |
| **Agent + Context** | `[AGENT-XXXX] Context` | `[AGENT-0008] TypeCheck` |
| **Background Task** | `[AGENT-XXXX] bg: Task` | `[AGENT-0008] bg: Tests` |

**Terminal Naming Rules:**

1. **Dev Server Terminal:** Always named `Fixzit Local`
2. **Agent Terminals:** Must include agent token `[AGENT-XXXX]`
3. **Visibility:** Named terminals appear in VS Code terminal dropdown
4. **Tracking:** Named terminals enable quick identification of ownership

**At Session Start (MANDATORY):**
```powershell
# Agent MUST rename their terminal immediately after creation
$host.UI.RawUI.WindowTitle = "[AGENT-XXXX]"
# OR use VS Code terminal API to set name
```

**Benefits:**
- ✅ Easy identification of which agent owns which terminal
- ✅ Quick cleanup of orphaned terminals by token
- ✅ Dev server always visible as "Fixzit Local"
- ✅ Terminals appear in VS Code dropdown for user visibility

#### 5.8.2 Terminal Isolation Rules

| Rule | Requirement |
|------|-------------|
| **Dedicated Terminal** | Each agent session MUST create and use a NEW terminal instance |
| **No Terminal Reuse** | NEVER reuse an existing terminal that may be owned by another agent/extension |
| **Naming Required** | Name terminals with agent token: `[AGENT-XXXX]` or `[AGENT-XXXX] Task Name` |
| **Orphan Cleanup** | Kill all orphaned terminals created by this agent upon task completion |
| **Max Terminals** | Limit to 3 concurrent terminals per agent session |

#### 5.8.3 Terminal Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│ TERMINAL LIFECYCLE (Per Agent Session)                          │
├─────────────────────────────────────────────────────────────────┤
│ 1. CLAIM PHASE                                                  │
│    → Create NEW dedicated terminal for agent work               │
│    → Name terminal with agent token: [AGENT-XXXX]               │
│    → Never attach to existing/shared terminals                  │
│                                                                 │
│ 2. WORK PHASE                                                   │
│    → Use only self-created terminals                            │
│    → Track terminal PIDs for cleanup                            │
│    → Dev server terminal named "Fixzit Local" is READ-ONLY      │
│                                                                 │
│ 3. COMPLETION PHASE (MANDATORY)                                 │
│    → Kill all terminals matching [AGENT-XXXX] pattern           │
│    → NEVER kill "Fixzit Local" terminal                         │
│    → Verify no orphaned processes remain                        │
│    → Report cleanup in task handoff                             │
└─────────────────────────────────────────────────────────────────┘
```

#### 5.8.4 Cleanup Commands (PROTECT DEV SERVER)

**⚠️ IMPORTANT: These commands must NOT kill the "Fixzit Local" dev server terminal!**

**PowerShell (Windows) — Agent Terminal Cleanup:**
```powershell
# Kill orphaned PowerShell terminals (keep current AND dev server "Fixzit Local")
# First, identify dev server terminal by checking port 3000
$devServerPID = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess
Get-Process powershell | Where-Object { 
    $_.Id -ne $PID -and $_.Id -ne $devServerPID 
} | Stop-Process -Force
```

**Verify Dev Server "Fixzit Local" Still Running:**
```powershell
# After cleanup, ALWAYS verify dev server is alive
$portCheck = Test-NetConnection -ComputerName localhost -Port 3000 -WarningAction SilentlyContinue
if (-not $portCheck.TcpTestSucceeded) {
    Write-Host "⚠️ Fixzit Local dev server not running! Restarting..."
    # Trigger VS Code task or manual restart
}
```

**Bash (macOS/Linux):**
```bash
# List terminal processes for review (exclude node/next processes)
ps aux | grep -E 'bash|zsh|sh' | grep -v grep | grep -v node
```

#### 5.8.5 Forbidden Terminal Actions

- ❌ Killing the `Fixzit Local` dev server terminal
- ❌ Killing node processes running on port 3000
- ❌ Sharing terminals between concurrent agents
- ❌ Leaving orphaned terminals after task completion
- ❌ Running commands in the `Fixzit Local` terminal
- ❌ Killing terminals owned by other agents/extensions
- ❌ Exceeding 3 concurrent terminals per agent
- ❌ Creating terminals without agent token naming

#### 5.8.6 Multi-Agent Terminal Etiquette

When multiple agents operate in the same workspace:

1. **Check before creating:** Verify terminal count before creating new ones
2. **Label clearly:** Use `[AGENT-XXX-X]` prefix in terminal names
3. **Clean up immediately:** Don't wait for session end to clean obvious orphans
4. **Preserve shared resources:** Never kill the Dev Server terminal (`Dev: Start Server`)

---

6. Pre-Claim SSOT Validation (MANDATORY)

Every agent MUST execute this checklist before claiming ANY work.
Prefer using SSOT tooling (CLI/script/API) when available; the Mongo shell snippets below define the required logic.

Phase 0: Git Preflight

Run the Section 5.4 gate before any SSOT claim.

If available, run node scripts/git-preflight.mjs --require-clean --base origin/main.

If behind origin/main: ABORT, update, then re-run preflight.

Phase 1: SSOT Query
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

Phase 2: Domain Validation
□ 2.1 File path authorization
    - Apply routing rules from Agent ID Assignment Table
    - Verify MY_AGENT_ID matches suggestedAgent OR is secondaryAgent
    → If mismatch: ABORT or request handoff

□ 2.2 Domain boundary check
    - Count unique domains across all filePaths
    → If > 1 domain AND I am not AGENT-001: Request coordinator

Phase 3: Resource Validation
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

Phase 4: Atomic Claim Execution
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

Failure Recovery

If claim fails at any phase:

Log failure reason with full context

Back off: Wait random(1000, 5000)ms

Retry from Phase 1 (max 3 attempts)

If all retries fail: Move to next issue in queue

7. Deep-Dive & Fix-Once Protocol
7.1 Principle

FIX ONCE, FIX EVERYWHERE — Before fixing ANY issue, scan the entire codebase for similar occurrences.

7.2 Before Fixing ANY Issue
□ 1. Check SSOT first (MongoDB + PENDING_MASTER)
□ 2. Is another agent working on it? → SKIP
□ 3. Scan for SIMILAR issues: grep -rn "<pattern>" app lib services
□ 4. List ALL occurrences (file + line)
□ 5. Determine if ALL occurrences are in your locked paths
     → If YES: Fix ALL in ONE session
     → If NO: Use Scope Expansion Protocol (Section 8)
□ 6. Update SSOT immediately after fix
□ 7. Commit with full file list

7.3 Issue Classification & Scan Patterns
Issue Type	Scan Pattern	Fix Scope
Missing tenant scope	findById|findOne without org_id	All API routes
Unsafe JSON.parse	JSON.parse without try-catch	All files
Console logs in prod	console.log in app/lib/services	All directories
Hardcoded strings	String literals in JSX	Replace with t()
Missing .lean()	Mongoose queries without .lean()	All read-only queries
Type safety gaps	as any, @ts-ignore	Proper types required
8. Scope Expansion & Delegation Protocol
8.1 Problem Statement

Deep-Dive requires repo-wide fixes, but Multi-Agent locks prevent collisions. This protocol resolves the conflict.

8.2 Rule

An agent MAY NOT edit files outside its locked paths without following this protocol.

8.3 When Deep-Dive Finds Occurrences Outside Locked Paths
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

8.4 Delegation Issue Template
{
  "issueKey": "AUTO-GENERATED",
  "title": "<descriptive title>",
  "type": "bug",
  "status": "open",
  "domain": "<target domain>",
  "filePaths": ["<exact paths>"],
  "delegatedBy": "[AGENT-XXX-Y]",
  "delegatedAt": "2025-12-28T14:30:00+03:00",
  "recommendedAgentToken": "[AGENT-YYY-Z]",
  "delegationReason": "File outside my locked paths during deep-dive",
  "evidenceSnippet": "<≤25 words exact from source>",
  "sourceRef": "deep-dive:<original-issue-key>"
}

9. Task Handoff & Delegation Protocol

This protocol is SSOT-governed and operationally dependent on the SSOT Sync flow.
This section is an overview only; follow the canonical handoff steps in Section 13.4.

Canonical handoff workflow: Section 13.4 — Agent Task Handoff Protocol (SSOT Coordination)

Canonical backlog extraction workflow: Section 13.3 — Pending Backlog Extractor v2.5 (MANDATORY)

10. PR Protocol & CI/CD Standards
10.1 PR Merge Gate Checklist (ALL must be ✅)
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
□ 11. MRDR (Multi-Role Validation Summary) attached to SSOT + PR

10.2 ZERO FORCE MERGE TOLERANCE
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

10.3 PR Description Template
## Summary
[Brief description]

## Agent Information
- **Agent Token:** [AGENT-XXX-Y]
- **Issue Key:** [ISSUE-KEY]
- **Codex Review:** PENDING | APPROVED | BLOCKED

## Target Code Set
- `path/to/file1.ts` (lines X-Y)
- `path/to/file2.ts` (lines A-B)

## Multi-Role Validation (MRDR)
- Linked in SSOT issue notes: ✅
- Included below or attached: ✅

## Verification Evidence
```bash
pnpm typecheck  # ✅ 0 errors
pnpm lint       # ✅ 0 warnings
pnpm vitest run # ✅ X tests passed
pnpm build      # ✅ success
```

## Deep-Dive Scan Results
- Scanned for: [pattern]
- Occurrences found: N
- All fixed in this PR: YES | NO (delegated: [keys])

## Checklist
- [ ] Pre-Claim SSOT Validation passed
- [ ] Applicable Multi-Role Gates completed
- [ ] Agent Token in all commits
- [ ] SSOT updated with findings
- [ ] PENDING_MASTER updated

10.4 CI/CD Build Rules (ZERO ERROR TOLERANCE)
Gate	Requirement	Command
TypeScript	0 errors	pnpm typecheck
ESLint	0 warnings	pnpm lint
Tests	100% pass, 0 skips	pnpm vitest run
Build	Must complete	pnpm build
10.5 GitHub Billing/Quota Failure Protocol

If GitHub Actions fails due to billing:

Run ALL tests locally with full evidence

Capture complete output

Add evidence to PR description

Only proceed if 100% pass locally

Notify Eng. Sultan about billing status

11. Code Quality Standards
11.1 Fixzit Ecosystem Context
Aspect	Standard
Framework	Next.js 14+ App Router
Language	TypeScript (strict mode)
Database	MongoDB Atlas
Styling	Tailwind CSS (RTL-first)
i18n	next-intl
Brand Blue	#0061A8
Brand Green	#00A859
Brand Yellow	#FFB400
Saudi Compliance	ZATCA Phase 2, VAT 15%, Decimal128
11.2 Code Quality Gates
Gate	Rule	Check Command
Null Safety	Every ?. chain has fallback	rg '\?\.' | grep -v '?? ||| |if ('
RTL Support	No hardcoded left/right/ml-/mr-	See RTL Class Mapping
Theme Tokens	No hardcoded hex colors	rg '#[0-9a-fA-F]{6}' | grep -v 'tokens'
Multi-Tenancy	All queries scoped by org_id	rg 'find|findOne' | grep -v 'org_id'
Client Directive	Hooks need 'use client'	rg 'useState|useEffect' | xargs grep -L "'use client'"
Error Boundaries	Try-catch for all async	rg 'await ' | grep -v 'try|catch'
11.3 RTL Class Mapping (BANNED → REQUIRED)
❌ BANNED	✅ REQUIRED	Reason
left-*	start-*	RTL flips
right-*	end-*	RTL flips
ml-*	ms-*	Margin start
mr-*	me-*	Margin end
pl-*	ps-*	Padding start
pr-*	pe-*	Padding end
text-left	text-start	Text alignment
text-right	text-end	Text alignment
border-l-*	border-s-*	Border start
border-r-*	border-e-*	Border end
rounded-l-*	rounded-s-*	Rounded start
rounded-r-*	rounded-e-*	Rounded end
scroll-ml-*	scroll-ms-*	Scroll margin
scroll-mr-*	scroll-me-*	Scroll margin
11.4 PR Scorecard (≥85 points required to merge)
Category	Points	Criteria
TypeScript	15	0 errors, no any, no @ts-ignore
ESLint	10	0 warnings
Tests	15	All pass, coverage maintained
Tenant Scope	15	org_id on all queries
RTL Support	10	No banned classes
Theme Tokens	5	No hardcoded colors
Error Handling	10	Try-catch, error codes
i18n	5	All user strings in t()
Security	10	Input validation, no XSS
Documentation	5	SSOT updated, MRDR recorded, PR documented
11.5 Global UI Governance Baseline (Dec 2025)

Agents MUST validate these baseline constraints (primarily via 4.2.3 UX/UI Gate and 4.2.8 QA Gate):

One global layout: Header + Sidebar + Content (no duplicates).

Footer present on all pages (copyright, version, legal/support links).

Language selector meets: flag + native name + ISO code + type-ahead.

Currency selector shows correct icon everywhere.

Back-to-home button exists (landing) and is keyboard accessible.

All required pages exist and contain mock data (no empty placeholders).

Google Maps integrated live where required.

Role-based module visibility enforced; no leakage.

12. Error Handling Standards
12.1 Error Code Format
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

12.2 Required Error Response Structure
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

12.3 Environment Variable Verification Protocol

BEFORE blaming "missing env var", verify in ALL available sources:

Code references (file:line) and any schema validation (Zod/env schema).

.env.example and relevant workflow YAMLs (CI/CD secrets usage).

Local .env files (.env.local, .env.development.local).

If UI access is required (GitHub/Vercel) and not available to the agent:

Ask Eng. Sultan to confirm the setting and record the request in SSOT.

If ACTUALLY missing, notify Eng. Sultan with:

Variable name

Required by (file:line)

Purpose

Status by platform (GitHub Actions, Vercel Prod/Preview/Dev)

Action required

13. SSOT Sync Protocol

### 13.0 SSOT Field Enforcement (NON-NEGOTIABLE)

**All SSOT entries (MongoDB Issue Tracker) MUST have ALL required fields completed.**

┌─────────────────────────────────────────────────────────────────────────┐
│ ❌ FORBIDDEN SSOT ACTIONS — ANY VIOLATION = AUTO-FAIL                  │
├─────────────────────────────────────────────────────────────────────────┤
│ • Creating issues with empty/missing required fields                   │
│ • Updating issues without completing all changed fields                │
│ • Setting status without evidence/notes                                │
│ • Closing issues without resolution summary                            │
│ • Partial updates ("I'll fill this later")                             │
│ • Placeholder values ("TBD", "TODO", "...", "N/A" for required)        │
│ • Skipping agentToken, timestamp, or sourceRef                         │
└─────────────────────────────────────────────────────────────────────────┘

**Required Fields for Issue Creation:**
| Field | Required | Description |
|-------|----------|-------------|
| `issueKey` | ✅ | Auto-generated by system |
| `title` | ✅ | Descriptive, actionable (5-15 words) |
| `type` | ✅ | bug, feature, task, improvement |
| `status` | ✅ | open, in-progress, review, closed |
| `priority` | ✅ | P0, P1, P2, P3 |
| `domain` | ✅ | core, auth, finance, souq, aqar, hr, fm |
| `category` | ✅ | Specific category within domain |
| `filePaths` | ✅ | Array of affected files (can be empty if unknown) |
| `createdBy` | ✅ | Agent Token [AGENT-XXX-Y] |
| `createdAt` | ✅ | ISO 8601 timestamp |
| `description` | ✅ | Detailed description with context |
| `evidenceSnippet` | ⚠️ | Required for bugs (≤25 words from source) |
| `rootCause` | ⚠️ | Required for bugs |
| `stepsToReproduce` | ⚠️ | Required for bugs |

**Required Fields for Issue Updates:**
| Field | Required | Description |
|-------|----------|-------------|
| `updatedBy` | ✅ | Agent Token [AGENT-XXX-Y] |
| `updatedAt` | ✅ | ISO 8601 timestamp |
| `updateNotes` | ✅ | What changed and why |

**Required Fields for Issue Closure:**
| Field | Required | Description |
|-------|----------|-------------|
| `closedBy` | ✅ | Agent Token [AGENT-XXX-Y] |
| `closedAt` | ✅ | ISO 8601 timestamp |
| `resolution` | ✅ | fixed, wont-fix, duplicate, invalid |
| `resolutionNotes` | ✅ | How it was resolved |
| `verificationEvidence` | ✅ | Proof of fix (test output, commit SHA) |

13.1 When to Execute

After EVERY:

Code review session

Fix session or task completion

VSCode Copilot chat session with findings

13.2 Phase 0: Chat History Extraction

Session Metadata:

## 📅 YYYY-MM-DD HH:mm:ss (Asia/Riyadh) — VSCode Session Update

**Agent Token:** [AGENT-XXX-Y]
**Context:** <branch> | <commit short> | <PR link if exists>
**Session Summary:** <1-2 sentences>
**DB Sync:** created=<n>, updated=<n>, skipped=<n>, errors=<n>


Findings Table:

Timestamp	Type	File	Description	Status	SSOT Key	Owner Agent
HH:mm:ss	Bug	path/file.ts:L10-15	...	Fixed	BUG-123	[AGENT-001-A]
13.3 Pending Backlog Extractor v2.5 — Extraction Protocol (MANDATORY)
Purpose

Extract unresolved items from docs/PENDING_MASTER.md, deduplicate them deterministically, and generate an import payload suitable for SSOT ingestion (MongoDB Issue Tracker) and sprint planning.

SSOT Relationship (Non‑Negotiable)

MongoDB Issue Tracker = SSOT

docs/PENDING_MASTER.md is a derived log / staging snapshot only.

This protocol reconciles staged notes into SSOT and eliminates duplicates.

Agent Responsibility

Any agent who completes a code review with new findings OR discovers new issues during implementation MUST ensure those findings are represented in SSOT.
If findings were captured in docs/PENDING_MASTER.md, run this extractor to reconcile and deduplicate.

INPUT REQUIREMENT

If the full content of docs/PENDING_MASTER.md is not available in the current context, respond with exactly:

[AGENT-XXX-Y] Please provide the full contents of docs/PENDING_MASTER.md so I can extract pending items.

Then STOP.

HARD CONSTRAINTS (VIOLATION = AUTO‑FAIL)
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

EXTRACTION SCOPE

Include (explicitly unresolved):

Markers: 🔲, 🟡, ⏳, ⚠️, 🟠, 🔴

Keywords: TODO, Pending, Open, Investigate, In Progress, Needs, Missing, Gap

Unchecked tasks: - [ ] ...

Unmarked bullets under “Next Steps” / “Planned Next Steps” only if clearly actionable tasks

Scan all sections, including:

Current Progress, Next Steps, Efficiency, Bugs, Logic Errors, Missing Tests, Deep‑Dive

Exclude items marked/stated:
✅, 🟢, Fixed, Done, Completed, Resolved, Landed, Added, Closed

Exception: if a later entry explicitly reopens it (“reopened”, “still failing”, “regressed”, “still pending”, “not fixed”) → INCLUDE.

REQUIRED FIELDS PER ITEM (STRICT)
Field	Rule
extractedBy	The executing agent token [AGENT-XXX-Y]
title	From source (exact)
issue	From source (if different from title; else repeat title)
action	From source (if explicit; else "Not specified in source")
location	path:lines if present; else Doc-only
sourceRef	Section/date heading (exact)
evidenceSnippet	≤25 words copied exactly
status	pending | in_progress | blocked | unknown
category	Exactly one: Bugs | Logic Errors | Missing Tests | Efficiency | Next Steps
priorityLabel	P0 | P1 | P2 | P3 (deterministic rules below)
priorityRank	Numeric mapping: P0=1, P1=2, P2=3, P3=4
riskTags	0..n: SECURITY, MULTI-TENANT, FINANCIAL, TEST-GAP, PERF, INTEGRATION, DATA
effort	XS | S | M | L | XL | ?
impact	1–10 (deterministic rules below)
impactBasis	Short explanation of what triggered scoring
DEDUPLICATION (DETERMINISTIC)

Merge duplicates in this order:

Same explicit ID (BUG-XXXX, LOGIC-XXX, SEC-XXX)

Same location (same file + line range)

Same file + normalized issue text (case‑insensitive; punctuation stripped)

For merged items, track:

firstSeen (earliest dated heading if present; else "First seen unknown")

lastSeen (latest dated heading if present; else "Last seen unknown")

mentions (count of merged occurrences)

statusEvolved only if explicitly shown in source

Key + Ref System

If item has explicit ID → externalId = that ID, key = externalId

Else: externalId = null, key = normalize(title + "|" + category + "|" + location) and assign display-only REF-###

Source Hash (for dedupe/import tracing)

sourceHash = sha256(evidenceSnippet + "|" + location + "|" + sourceRef)

sourceHash12 = first 12 hex chars

Compute inside a repo workspace with one of:

printf "%s" "<evidenceSnippet>|<location>|<sourceRef>" | shasum -a 256 | cut -c1-12

node -e "const crypto=require('crypto'); const s=process.argv[1]; console.log(crypto.createHash('sha256').update(s).digest('hex').slice(0,12));" "<evidenceSnippet>|<location>|<sourceRef>"

CLASSIFICATION (EXACTLY ONE)
Category	Keywords
Bugs	crash, error, fails, broken, incorrect behavior
Logic Errors	wrong condition, missing filter, scoping, incorrect fallback
Missing Tests	missing tests, coverage, no negative paths
Efficiency	refactor, perf, split file, optimize, validation framework
Next Steps	explicitly listed plan/task item
PRIORITY (P0–P3) — DETERMINISTIC KEYWORD RULES

Use explicit P0/P1/P2/P3 if present; else infer:

PriorityLabel	Keywords
P0 (🔴)	security, data leak, cross‑tenant exposure, RBAC/auth bypass, privilege escalation, fail‑open
P1 (🟠)	authorization/ownership correctness, compliance correctness, logic errors affecting correctness
P2 (🟡)
missing tests, performance/efficiency issues, validation gaps
P3 (🟢)	refactor/cleanup/docs/nice‑to‑have

Priority mapping:

PriorityLabel	Meaning	priorityRank
P0	Critical	1
P1	High	2
P2	Medium	3
P3	Low	4
EFFORT (XS–XL) — HEURISTIC
Effort	Scope
XS	One‑liner/config
S	Single-file change
M	Multi-file OR add new test file
L	Cross-module
XL	Architectural/migration
?	Scope unclear (log in openQuestions)
IMPACT SCORE (1–10) — DETERMINISTIC

Compute impact (cap 10):

Base by priority: P0=9, P1=7, P2=5, P3=3

Modifiers:

+2 if SECURITY

+2 if MULTI‑TENANT

+1 if FINANCIAL

+1 if DATA

+2 if source explicitly says “production down” / “outage” / “cannot login”

+0 for TEST‑GAP / PERF / INTEGRATION unless outage is explicit (+2)

Also output impactBasis listing which tags/phrases triggered scoring.

OUTPUT (DEFAULT = BOTH)

A) BACKLOG_AUDIT.json (SSOT Import Payload)

Return ONE JSON object (camelCase fields):

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


B) BACKLOG_AUDIT.md (Human Report)

Executive Summary

Category breakdown

File heat map (top 10)

Sprint buckets

Tables by category sorted by: impact desc → priorityLabel → effort

Open questions (only where required fields are “?” / “Not specified in source”)

POST‑EXTRACTION PROTOCOL (MANDATORY)
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

13.4 Agent Task Handoff Protocol (SSOT Coordination) — MANDATORY
Purpose

Prevent duplicate work and enable deterministic handoff between agents using MongoDB Issue Tracker as SSOT.

Core Principle (Non‑Negotiable)

MongoDB Issue Tracker = Single Source of Truth

docs/PENDING_MASTER.md mirrors SSOT changes but is never authoritative

MongoDB first, then update docs/PENDING_MASTER.md

Canonical SSOT Fields (Use These Names Consistently)

Use these SSOT record fields:

issueKey (or externalId if you use a secondary identifier)

status (e.g., open, claimed, in_progress, blocked, handoff_pending, resolved)

assignment.agentId = [AGENT-XXX-Y] or null

assignment.claimedAt, assignment.claimExpiresAt, assignment.claimToken (if TTL/claim tokens exist)

handoffHistory[] (handoff audit trail)

If your implementation currently uses assignedTo, treat it as an alias of assignment.agentId and migrate later.

HANDOFF SCENARIOS

Scenario 1: Task Already Claimed (Do Not Collide)

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


Scenario 2: You Must Hand Off (Out-of-Domain / Capability Gap)

Trigger handoff if ANY of the following is true:

File paths fall outside your domain routing rules

Fix requires specialized expertise (finance, payroll, etc.)

Issue touches multiple domains and you are not the coordinator agent

You are blocked and cannot progress without another domain owner

┌─────────────────────────────────────────────────────────────────────────┐
│  TASK HANDOFF PROTOCOL (SSOT FIRST)                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  1. □ Update SSOT issue atomically:                                     │
│       - status → "handoff_pending"                                      │
│       - assignment.agentId → null (release ownership)                   │
│       - append handoffHistory event with:                               │
│         from, to, timestamp, reason, nextAction, filesTouched           │
│  2. □ Update docs/PENDING_MASTER.md with a derived note referencing SSOT│
│  3. □ Release file locks in .fixzit/agent-assignments.json              │
│  4. □ For P0/P1: Notify Eng. Sultan with the handoff notification box   │
│  5. □ STOP work on that item immediately                                │
└─────────────────────────────────────────────────────────────────────────┘


Scenario 3: Claim a Task From SSOT (No Guessing)

All task claiming MUST be SSOT-driven:

Query SSOT for eligible tasks (unassigned, correct domain, priority order)

Execute an atomic claim (or follow Pre-Claim SSOT Validation in Section 6)

Lock file paths locally (.fixzit/agent-assignments.json)

Announce claim with exact files

Delegation Rules by Agent Type (Routing)
Agent Base	Tool / Type	Domain	Delegate To This Agent When…
AGENT-001-*	VS Code Copilot	Core/Auth/Middleware	Auth, middleware, platform-wide coordination
AGENT-002-*	Claude Code	Finance/Billing	Payments, invoicing, ZATCA/VAT, financial correctness
AGENT-003-*	Codex	Souq/Marketplace	Products, orders, vendors, marketplace workflows
AGENT-004-*	Cursor	Aqar/Real Estate	Property listings, contracts, valuation flows
AGENT-005-*	Windsurf	HR/Payroll	Employee, attendance, payroll correctness
AGENT-006-*	Reserved	Tests/Scripts	CI/CD, automation, test coverage, scripts

Use the full token when known (e.g., [AGENT-002-A]). If unknown, delegate to the base (AGENT-002-*) and let the receiving pool decide the instance.

Handoff Notification Format (Use Exactly)
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

13.5 Phase 1: Discovery
# Locate canonical file
find . -name "PENDING_MASTER.md" -type f
# Confirm: docs/PENDING_MASTER.md

# Verify Issue Tracker endpoints exist
curl -s http://localhost:3000/api/issues/stats | jq .

13.6 Phase 2: Backlog Audit

Run Pending Backlog Extractor v2.5 (Section 13.3).

Generate:

BACKLOG_AUDIT.json (machine-readable, SSOT import-ready)

BACKLOG_AUDIT.md (human checklist)

13.7 Phase 3: DB Sync (Idempotent)
POST /api/issues/import
Body: { issues: [...] }
# Capture: { created: N, updated: N, skipped: N, errors: N }

13.8 Phase 4: Apply Chat History Findings
Finding Status	DB Action	Event Type
Fixed	status → resolved, add resolution note	STATUS_CHANGED
In Progress	status → in_progress	STATUS_CHANGED
Blocked	status → blocked, add blocker reason	UPDATED
New	CREATE with full evidence	CREATED
Delegated	status → handoff_pending	DELEGATED
13.9 Phase 5: Update PENDING_MASTER.md

Append changelog entry (DO NOT rewrite entire file):

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

13.10 Phase 6: Verification
pnpm lint                                    # Must pass
pnpm test                                    # Must pass
curl http://localhost:3000/api/issues/stats  # 200 OK

13.11 MongoDB SSOT Schema Alignment (Toolkit)

Use the SSOT toolkit scripts when aligning Atlas with Appendix A:

# Required env vars
export MONGODB_URI="mongodb+srv://..."
export MONGODB_DB="fixzit"

# Migrate data to v6 fields (idempotent)
node scripts/ssot-migrate-v6.mjs

# Apply validator + indexes
node scripts/ssot-apply-schema-v6.mjs --level strict

# Verify schema + indexes
node scripts/ssot-verify.mjs


If any step fails: stop and log the failure in SSOT.

14. Auto-Review Protocol
14.1 Codex Review Gate (NO TIMEOUT BYPASS)
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
└─────────────────────────────────────────────────────────────────────────┘

14.2 Review Trigger Protocol

After completing ANY task:

Trigger Codex review with HIGH REASONING model

Submit TARGET CODE SET (diffs + file list)

WAIT for review response — NO TIMEOUT BYPASS

Status = REVIEW_PENDING until response received

14.3 Review Checklist (Codex validates)

Types correct (no any)

Tenant isolation (org_id on all queries)

Error handling complete

Input validation (Zod)

Auth/RBAC enforced

No console.log in prod

i18n for user-facing strings

Tests cover happy + error paths

Deep-Dive similar patterns fixed

MRDR present (Multi-Role Validation Summary)

14.4 Response Handling
Result	Action
✅ APPROVED	Proceed to merge request
🔴 BLOCKED	Fix blockers, re-run verification, re-trigger review
🟡 SUGGESTIONS	Log to MongoDB as P3 issues
📋 SIMILAR ISSUES	Create MongoDB issues, delegate to appropriate agents
14.5 Final Output Notification (MANDATORY)
┌─────────────────────────────────────────────────────────────────────────┐
│  🔔 FINAL OUTPUT — AGENT TASK COMPLETE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Agent: [AGENT-XXX-Y]                                                   │
│  Task: <summary>                                                        │
│  PR: #<number> — <link>                                                 │
│  Codex Review: APPROVED | REVIEW_PENDING | BLOCKED                      │
│  MRDR: ✅ Linked in SSOT + PR                                            │
│  Files Modified: <N>                                                    │
│  Verification: typecheck ✅, lint ✅, vitest ✅                         │
│  Deep-Dive: <N> similar issues found and fixed                          │
│  Delegations: <N> issues delegated to other agents                      │
│  SSOT Sync: created=<n>, updated=<n>                                    │
│  Status: READY FOR ENG. SULTAN REVIEW | REVIEW_PENDING                  │
└─────────────────────────────────────────────────────────────────────────┘

15. Prompts Library
15.1 Pending Backlog Extractor (Canonical)

The canonical backlog extraction protocol is Section 13.3 — Pending Backlog Extractor v2.5 (MANDATORY).

Use it to produce:

BACKLOG_AUDIT.json (SSOT import payload)

BACKLOG_AUDIT.md (human audit report)

15.2 Codex Targeted Review Prompt

Purpose: Deep code review with security, multi-tenancy, and quality focus.
When to Use: Before any merge request.

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

### Multi-Role Validation
- [ ] MRDR present and complete
- [ ] Applicable gates not incorrectly marked N/A

## Verdict
[ ] ✅ APPROVED — Ready for merge
[ ] 🔴 BLOCKED — Critical issues found
[ ] 🟡 SUGGESTIONS — Non-blocking improvements

## Findings
| Severity | File:Line | Issue | Recommendation |
|----------|-----------|-------|----------------|

15.3 System-Aware PR Review Prompt

Purpose: Comprehensive PR review with Fixzit ecosystem awareness.
When to Use: For PRs touching multiple modules.

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

15.4 Multi-Role Validation (MRDR) Prompt

Purpose: Produce MRDR content deterministically before coding.
When to Use: Immediately after claiming SSOT issue, before implementation.

# MULTI-ROLE VALIDATION (MRDR)

## Issue
- Key: [ISSUE-KEY]
- Title: [title]
- Agent: [AGENT-XXX-Y]
- Date: [YYYY-MM-DD HH:mm (Asia/Riyadh)]

## Applicability
- Issue type: [UI bug | API bug | Multi-tenant | Security | Performance | Integration | Compliance | Refactor]
- Gates required (from matrix): [list]
- Gates skipped (N/A): [list + justification]

## Gates
### PM Gate
[fill template]

### BA Gate
[fill template]

### UX Gate
[fill template]

### Tech Lead Gate
[fill template]

### Backend Gate
[fill template]

### Frontend Gate
[fill template]

### Mobile Gate (if applicable)
[fill template]

### QA Gate
[fill template]

### Security Gate
[fill template]

### DevOps Gate
[fill template]

### Finance Gate (if applicable)
[fill template]

### Integration Gate (if applicable)
[fill template]

### Privacy Gate (if applicable)
[fill template]

## Developer Task Breakdown
[fill template]

## Approval
- Implementation Approved: ✅ YES / ❌ NO
- Critical Risks: [list]
- Mitigations: [list]

Appendix A: MongoDB Issue Schema
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

Appendix B: Agent Routing Configuration
{
  "routingVersion": "7.0.0",
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
      "capabilities": ["tax-engines", "pdf-generation", "financial-calculations"]
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
      "capabilities": ["hr-systems", "payroll-calculations"]
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

Appendix C: Environment Variables Reference
Live Query Commands

Do NOT hardcode env var lists in documentation. Query live sources instead:

# Vercel Project-level env vars (runtime secrets)
vercel env ls

# GitHub Actions secrets (CI/CD)
gh secret list

# Check specific variable exists
vercel env ls 2>&1 | Select-String "SENTRY"
gh secret list 2>&1 | Select-String "SENTRY"

Key Environment Variable Categories
Category	Variables	Platform
Auth	AUTH_SECRET, NEXTAUTH_SECRET, JWT_SECRET	Vercel
Database	MONGODB_URI	Vercel + GitHub
Payments	TAP_*	Vercel
ZATCA	ZATCA_API_KEY, ZATCA_SELLER_*, ZATCA_VAT_NUMBER	Vercel
SMS	TAQNYAT_*, TWILIO_*, SMS_PROVIDER	Vercel
Monitoring	SENTRY_DSN, NEXT_PUBLIC_SENTRY_DSN, SENTRY_ORG, SENTRY_PROJECT	Vercel + GitHub
Storage	AWS_S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY	Vercel
Search	MEILI_HOST, MEILI_MASTER_KEY	Vercel
Multi-Tenant	DEFAULT_ORG_ID, PUBLIC_ORG_ID, TEST_ORG_ID	Vercel
Superadmin Organization (SAHRECO)
Key	Value	Description
Superadmin OrgID	1	SAHRECO - System owner and platform operator
DEFAULT_ORG_ID	1	Default org for new users without explicit assignment

IMPORTANT: OrgID 1 (SAHRECO) is the platform owner. All system-level operations, superadmin accounts, and platform configuration are scoped to this organization.

Before Claiming ENV-Related Issues

Query live sources using commands above

Verify variable exists before reporting "missing"

Check BOTH Vercel (runtime) AND GitHub (CI/CD)

Follow Section 12.3 Environment Variable Verification Protocol

Appendix D: People Checker Role Checklists

Purpose: These checklists are the acceptance criteria “people checker” reference. They are used during applicable gates (Section 4.2) to ensure solutions satisfy stakeholders beyond engineering correctness.

D.1 Core Build & Platform Team (Product + Engineering + Quality + Infra)
Role	Primary outcome	People Checker (Acceptance Criteria)
Head of Product / Product Manager (FM + Marketplace)	Own roadmap, scope control, releases	• Convert blueprint modules into prioritized roadmap (MVP → V1 → V2)
• Write epics/user stories per module (Work Orders, Properties, Finance, Marketplace, Support)
• Define role-based experiences (Tenant/Owner/Tech/Vendor/Admin) and acceptance criteria
• Run backlog grooming, sprint planning, release notes, go/no-go gates
• Own “golden workflows” quality (ticket lifecycle, approvals, RFQ→PO)
Business Analyst / Domain SME (FM + Real Estate)	Requirements correct and operationally realistic	• Translate FM operations into workflows, SLAs, categories, checklists
• Define service catalog structure + pricing logic (internal vs vendor)
• Map roles to permissions and real-life responsibilities (dispatch, approvals, QA)
• Validate data model fields (property/unit/asset/lease, work order states, costs)
• Produce UAT scenarios and edge cases (escalations, rejections, rework)
UX/UI Lead (RTL-first, Monday-style patterns)	Consistent, fast UI across web + mobile	• Define/enforce global layout patterns (single header/sidebar/footer, tabs, search, quick actions)
• Own RTL/LTR behavior, i18n copy, accessibility (WCAG AA)
• Ensure design tokens usage (no hard-coded colors)
• Create UI states for errors/empty/loading; prevent layout regressions
Engineering Manager / Tech Lead (Architecture Owner)	Delivery velocity with architectural control	• Enforce modular-monolith boundaries & coding standards per domain module
• Define API contracts, data scoping rules (org_id / owner scope), RBAC enforcement
• Review PRs for security, performance, maintainability
• Own technical roadmap (mobile strategy, integrations, observability)
• Keep “no regression” discipline (layout freeze + functionality freeze)
Backend Engineer (Node/Next APIs, Multi-tenant, RBAC)	Stable APIs + correct data isolation	• Implement Auth/JWT/OIDC, user/role/permission model, org scoping
• Build domain APIs: properties/units/tenancies, work orders state machine, approvals engine, finance posting, marketplace flows
• Enforce row-level authorization rules on every endpoint
• Add audit logging for finance + approvals + admin
• File storage (pre-signed URLs), rate limits, input validation
Frontend Engineer (Next.js/React, Role-based UI)	Fast, correct UX per role	• Role-based navigation and page access rules (modules shown/hidden by role)
• Module UIs: Work Orders board/list, property views, finance lists, approvals inbox, marketplace views
• Deep links from notifications to correct screens
• Global search + quick-create (permission-aware)
• RTL + dark/light mode consistency and accessibility
Mobile Engineer (Role-based apps)	Mobile apps for Tenant / Technician / Owner / Corporate	• Implement role-based mobile shells aligned to backend APIs
• Offline-first flows where needed (technician updates, photo capture)
• Push notifications + deep linking to approvals/work orders
• Mobile performance tuning (startup, lists, image upload)
QA Lead + Automation Engineer (Playwright/API tests)	“Zero-error” confidence and regression protection	• Test matrix: page × role × critical actions (create/assign/approve/close/export)
• Automate UI tests (sidebar links, forms, RTL/LTR, dark/light, role access gates)
• Automate API tests (auth scopes, forbidden data access, state transitions)
• Smoke tests for every deploy + “Halt–Fix–Verify” enforcement
DevOps / SRE	Reliable deployments and monitoring	• CI pipelines: lint/typecheck/test/build, preview envs, secrets validation
• Observability: errors/logs/metrics/alerts
• Env management (dev/stage/prod), backup/restore, scaling/caching
• Incident runbooks + on-call procedures
Security / DevSecOps Engineer	Security posture + audit readiness	• Threat modeling (multi-tenancy, RBAC, files, payments, vendor portal)
• Security controls: OWASP, secrets handling, SAST/DAST, dependency scanning
• Governance: roles/responsibilities and evidence trail
• Security reviews for integrations (payments, messaging, email)
D.2 Run & Scale Team (Operations + Marketplace + Support + Compliance)
Role	Primary outcome	People Checker (Acceptance Criteria)
Customer Success / Implementation Manager (B2B onboarding)	Tenants go live quickly and correctly	• Onboard corporate tenants: org setup, users/roles, properties/units import, approval rules, SLAs
• Configure modules per subscription plan, validate workflows in UAT
• Train client admins and produce rollout checklists
• Collect feedback → product backlog with measurable impact
Support Lead + Support Agents (L1/L2)	Tickets resolved fast; knowledge base grows	• Triage, escalation, SLAs, root-cause tagging
• Maintain knowledge base articles and in-product guides
• Reproduce issues, collect logs/screenshots, create dev-ready bug reports
• Monitor recurring issues and push preventive fixes
Marketplace Operations Manager	Healthy vendor ecosystem and reliable delivery	• Vendor verification/KYC, category approvals, coverage areas, SLAs
• Service catalog quality, pricing governance, vendor scoring
• RFQ/bidding lifecycle (publish → bids → award → PO → completion)
• Disputes/refunds/ratings moderation/vendor offboarding
Finance Operations Specialist	Accurate cash operations	• Reconcile payments/invoices/refunds/commissions/vendor payouts
• Subscription billing ops and collections workflows
• Validate finance controls/audit trails, coordinate compliance requirements
Privacy / Compliance Officer (PDPL)	PDPL-ready processes and evidence	• Data processing inventory, retention rules, access controls, DSAR processes
• Controller/processor governance and vendor contracts alignment
• Review logging, consent, cross-border transfer considerations, incident response
Technical Writer / Enablement	Reduced support load, faster adoption	• Admin guides, role-based user guides, API docs (if externalized)
• Maintain change log and release notes aligned to modules/roles
Changelog
v7.0.0 (2025-12-28)

Major Enhancement: Multi-Role Validation Protocol

Replaced Three-Perspective Thinking Protocol with comprehensive 14-gate Multi-Role Validation (Section 4.2).

Updated lifecycle to include VALIDATE gate phase.

Added MRDR (Multi-Role Decision Record) requirement and templates.

Updated PR merge gates to require MRDR evidence.

Added Appendix D “People Checker” role checklists (Core Build + Run & Scale roles).

Aligned validation gates with Dec 2025 governance baselines (single header, footer, language/currency selector, back-to-home, HFV artifacts).

v6.0.1 (2025-12-23)

Protocol Additions:

Added Cross-Device Git Sync Protocol (Section 5.4) and Repo Portability Protocol (Section 5.5).

Added Capacity Escalation and Emergency Override rules (Sections 5.6, 5.7).

Added Git preflight phase and tooling preference for SSOT validation (Section 6).

Added MongoDB SSOT schema alignment toolkit steps (Section 13.11).

Updated lockfile path to .fixzit/agent-assignments.json (gitignored).

Added Three-Perspective Thinking Protocol (Section 4.2) — replaced by v7 Multi-Role protocol.

v6.0.0 (2025-12-21)

Major Changes:

Complete document restructure with numbered sections

Added Table of Contents for navigation

Added Definitions table (Section 2)

Added Agent Token Protocol as mandatory (Section 3)

Added Pre-Claim SSOT Validation (Section 6)

Added Scope Expansion Protocol (Section 8)

Added SSOT coordination protocols inside SSOT Sync (Section 13)

Removed 5-minute Codex timeout bypass — use REVIEW_PENDING

Added Appendix A schema + Appendix B routing config

Document maintained by Eng. Sultan Al Hassni
Last updated: 2025-12-28 (Asia/Riyadh)
