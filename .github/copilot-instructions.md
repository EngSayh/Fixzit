# Fixzit VS Code Agent — Master Instruction v5.2 (STRICT v4 + AGENTS.md v6.0 Alignment)

Owner: Eng. Sultan Al Hassni  
System: Fixzit Facility-Management + Marketplace (Fixzit Souq) + Real Estate (Aqar)  
Stack: Next.js App Router + TypeScript + MongoDB Atlas/Mongoose + Tailwind/shadcn + Vitest (+ Playwright if enabled)

NON-NEGOTIABLE. Violations = AUTO-FAIL.

---

<<<<<<< HEAD
## 📚 See Also: AGENTS.md v5.5
For complete agent governance protocols, see [AGENTS.md](../AGENTS.md) which includes:
- Agent Claim Protocol with Pre-Start/Post-Task checklists
- Agent Task Handoff Protocol for cross-agent work
- Pending Backlog Extractor v2.5 (SSOT-integrated)
- SSOT Chat History + Backlog Sync Protocol
- Code Quality Standards and PR Scorecard
=======
## 📚 See Also: AGENTS.md v6.0
For complete agent governance protocols, see [AGENTS.md](../AGENTS.md) which includes:
- **Section 3**: Agent Token Protocol (MANDATORY attribution)
- **Section 6**: Pre-Claim SSOT Validation (MANDATORY before claiming any work)
- **Section 8**: Scope Expansion & Delegation Protocol
- **Section 13.3**: Pending Backlog Extractor v2.5 (SSOT-integrated)
- **Section 13.4**: Agent Task Handoff Protocol (SSOT Coordination)
- **Appendix A**: MongoDB Issue Schema with agent coordination fields
- **Appendix B**: Agent Routing Configuration

Priority Model: P0-P3 (priorityRank: P0=1, P1=2, P2=3, P3=4)
SSOT Fields: `assignment.agentId`, `assignment.claimedAt`, `assignment.claimExpiresAt`, `handoffHistory[]`, `contentHash`, `version`
>>>>>>> origin/main

---

## 0) Sources of Truth (SoT) — No Guessing
Use these as authoritative:
- STRICT v4 (HFV loop, proof packs, language/currency/footer, no bypass, no build-output edits)
- Fixzit Blueprint/SDD: Multi-tenancy (org_id/property_owner_id), RBAC, Golden workflows
- Verification log patterns: missing language selector/flags, missing currency, missing universal sidebar/footer, logo regressions, social login buttons missing

If any SoT is missing/unreadable → STOP and report CRITICAL.

---

## 1) Absolute Global Rules (AUTO-FAIL)
- Do NOT change layout, features, workflows, or remove modules to "fix" bugs.
- Do NOT bypass, suppress, mute, or hide errors (no band-aids, no silent catches, no ts-ignore).
- Do NOT edit build outputs (.next, dist, manifests) to hide problems.
- Do NOT claim "fixed" unless you provide evidence (commands + raw outputs, tests, screenshots where applicable).
- Do NOT close tasks/PRs/issues. Only Eng. Sultan approves closure.

---

## 2) Layout Freeze (Universal Shell)
Global shell must be consistent:
Header (Top Bar) + Sidebar + Content + Footer.
- No duplicate headers, no nested layout conflicts, no "header disappears" regressions.
- Footer must be universal and match Landing footer structure (company logo + copyright).
- Sidebar must be universal across all internal modules (not missing in Work Orders/Properties/etc.).

---

## 3) UI/Branding/RTL Hard Rules (Regression Hotspots)
The following must never regress (these have repeatedly regressed in verification logs):
- Language selector is ONE dropdown (not two buttons) with flags and clickable switching.
- Arabic must work on Landing page (RTL direction switches, translations load).
- Currency selector exists on ALL pages and is stored in user preferences.
- Fixzit logo must appear before text in header; do not replace it with a generic placeholder.
- Clicking Fixzit logo must route to Landing by default.
- Login page must include Google + Apple sign-in buttons under the main sign-in button.
- Sidebar: collapsed mode must show hover tooltips (missing hover is a bug).

Brand tokens (enforced):
- #0061A8 Blue, #00A859 Green, #FFB400 Yellow
No random hardcoded colors except inside token definition files.

RTL-first:
- Prefer logical Tailwind classes (ps/pe/ms/me/start/end). Avoid left/right if project supports logical utilities.

---

## 4) Multi-Tenancy Zero Tolerance (AUTO-FAIL)
No database query may execute without tenant scope:
- Corporate scope: MUST include `{ org_id: session.user.orgId }`.
- Owner scope: MUST include `{ property_owner_id: session.user.id }` where applicable.
- Super Admin bypass must be explicit and audited.

Any missing tenant filter = SECURITY BUG.

---

## 5) Testing Protocol (Vitest) — Mandatory to Prevent Flaky CI
### 5.1 Mock Hygiene (CRITICAL)
Every test file MUST include in beforeEach:
- `vi.clearAllMocks()`
- reset default mocked returns (rate limit, auth/session, env)

If a test fails: STOP, fix root cause, re-run. Never comment out tests.

### 5.2 Route Logic Verification Rule
Before writing any rate-limit test:
- Confirm the handler method (GET/POST/DELETE) actually applies enforceRateLimit.
- Do NOT test 429 on GET unless GET implements rate limiting (common past mismatch).

### 5.3 Isolation
- Prefer beforeAll/afterAll for MongoMemoryServer.
- Prefer deleteMany({}) cleanup (drop() can fail or remove indexes).

---

## 6) Halt–Fix–Verify (HFV) Execution Loop (STRICT v4)
For EACH page × role:
1) Navigate and run all visible actions.
2) If error/warning → capture evidence (screenshot T0 + T0+10s OR Playwright screenshots).
3) HALT.
4) Fix all errors (console/runtime/network/build).
5) Re-test twice; still clean after 10s.
6) Only then move to next page/role.

Proof pack required:
- Before/After screenshots (or Playwright artifacts)
- Console + Network evidence
- Build output (0 TS errors)
- Commit hash + root-cause + fix summary

---

## 6.1) Playwright Smoke Stability
- In `NEXT_PUBLIC_PLAYWRIGHT_TESTS`/`PLAYWRIGHT_TESTS` mode, prefer static anchors (`<a href=...>`) and avoid client event handlers inside server components to prevent hydration errors and selector timeouts.
- Marketplace Playwright stubs must render clickable product cards linking to `/marketplace/product/demo-*` and a PDP stub that avoids live API/i18n calls.
- RTL smoke for system/finance/HR must render Arabic headings/labels under the Playwright flag; gate these strings without changing production UX.
- Org guard hooks (useSupportOrg/useOrgGuard/useFmOrgGuard) should be Playwright-safe (env-aware stub) to avoid provider boundary crashes; keep production behavior strict.

---

## 7) Env Var Contract (Vercel/GitHub/Tests)
- Maintain a single env schema file (Zod recommended) to validate required env vars at runtime.
- Tests must stub env vars; no test depends on production secrets.
- If a preview fails due to missing env var → fix schema + .env.example + tests.

---

## 8) Output Requirements (VS Code Agent)
- For any multi-file change: output unified diffs or full file contents.
- Always list touched files.
- Always include exact commands executed and raw summaries.
- End every response with a QA Gate Checklist:
  - [ ] Tests green
  - [ ] Build 0 TS errors
  - [ ] No console/runtime/hydration issues
  - [ ] Tenancy filters enforced
  - [ ] Branding/RTL verified
  - [ ] Evidence pack attached

---

## 9) Anti-False-Positive Protocol (Retained from v4)
Goal: eliminate false positives. Treat every comment/diagnostic as untrusted until proven.

- Never invent files, symbols, configs, metrics, or lint/test/build results.
- Every finding must quote the exact triggering code (file + line range) OR cite tool output.
- Classify each item as: CONFIRMED (>=80%), FALSE POSITIVE, or NEEDS EVIDENCE.
- If NEEDS EVIDENCE: do not patch; list the exact command/output needed and stop for that item.
- Fix order: (1) config/resolution → (2) code analyzability/correctness → (3) narrow single-line suppression with justification + TODO.
- Never "fix" by globally disabling ESLint/TS rules, turning off Copilot, or blanket ignoring folders.

---

## 10) Fixzit Domain Invariants
- Multi-tenant: scope reads/writes by org_id (and property_owner_id where applicable) and ensure indexes support common query shapes.
- RBAC: enforce the fixed 14 roles (no invented roles).
- Finance: Decimal128 storage, precision-safe calculations, ZATCA/HFV compliance only when repo implementation indicates requirements.

---

## 11) Agent Execution Permissions (Granular, Read-Only First)
- READ-ONLY ANALYSIS is expected: File reads/searches are allowed. Do NOT self-block on `cat`/`grep`/`find`/`rg`/`ls`/`git show`/`git diff`/`npm ls`/`tsc --noEmit`.
- Allowed without confirmation: `cat`, `less`, `head`, `tail`, `grep/rg/find/fd`, `ls/tree`, `git status/log/diff/show/blame`, `cat package.json`, `npm ls/pnpm ls/yarn list`, `tsc --noEmit`, `eslint --dry-run`, `prettier --check`.
- Allowed with caution (announce/log intent): `pnpm vitest`/`pnpm test`/`playwright test`, `pnpm build`/`next build`, `eslint --fix`, `prettier --write`.
- Forbidden without explicit user approval: destructive commands (`rm`, `rmdir`, `mv` outside workspace, `git reset --hard`, `git clean -fd`), deploys (`vercel --prod`, `npm publish`), production DB writes, secret dumps (`env | grep KEY`, `echo $SECRET`).
- If blocked by a rule, state the exact file/command needed and why; ask for permission or pasted content instead of stopping the audit.

---

## 12) Execution Discipline (No Deferral)
- Deliver requested points in one pass where feasible; avoid unnecessary back-and-forth or deferral.
- Do not push back or drift from scope; target 100% completion while honoring safety/tenancy/RBAC rules.
- When constraints apply (e.g., forbidden commands), state the constraint and the exact next action needed to keep progress unblocked.

---

## 13) Multi-Agent Coordination + Final Prompt Alignment (v3.1 — 2025-12-13)
- Adopt the Final Fixizit System Prompt v3.1 (2025-12-13) as the execution contract; bias to immediate delivery (100% of requested scope) without back-and-forth.
- Expect other AI agents in parallel: avoid destructive git actions, prefer append-only/surgical edits, and record assumptions or coordination notes in PENDING_MASTER.md when ambiguity exists.
- Keep responses and changes scope-locked to the explicit TCS; never drift beyond quoted/opened files without user approval.
- Bias toward action with evidence: execute defined tasks, log commands/tests inline, and surface conflicts early; prefer non-destructive merges if overlaps occur.

## 14) Rapid Execution & Co-Agent Etiquette
- Target 100% of requested scope in a single pass; avoid deferral/pushback unless blocked by a hard constraint (state it explicitly with the next step).
- Before editing, check current git status and existing diffs to avoid clobbering other agents; keep changes surgical and avoid drive-by reformatting.
- When ambiguity arises, make a documented assumption (note it in PENDING_MASTER.md or the response) rather than pausing progress; align with AGENTS.md invariants.
- Prefer additive notes over deletions in shared docs; never use destructive git commands. If overlap is detected, choose the smallest safe diff and call it out in the summary.

---

END OF MASTER INSTRUCTION v5.2

Output format (single report only):
1) Audit Summary
2) High-Confidence Fixes (unified diffs)
3) False Positives Rejected (with proof)
4) Full Updated Files (only changed)
5) Validation (commands listed; never assume results)
End with: "Merge-ready for Fixzit Phase 1 MVP."
