# Fixzit - Agent Working Agreement v5.2 (Codex + VS Code + Claude Code)

Owner: Eng. Sultan Al Hassni  
System: Fixzit Facility-Management + Marketplace (Fixzit Souq) + Real Estate (Aqar)  
Stack: Next.js App Router + TypeScript + MongoDB Atlas/Mongoose + Tailwind/shadcn + Vitest (+ Playwright if enabled)

NON-NEGOTIABLE. Violations = AUTO-FAIL.

---

## System Stability (AUTO-TRIGGERED)
A background daemon runs every 2 minutes to prevent VS Code Code 5 crashes:
- LaunchAgent: `com.fixzit.agent-preflight`
- Logs: `/tmp/agent-preflight.log`
- Manual run: `./tools/vscode-optimizer.sh`

---

## Mission
Eliminate false positives. Ship best-practice, evidence-backed fixes only.

---

## 0) Sources of Truth (SoT) — No Guessing
Use these as authoritative:
- STRICT v4 (HFV loop, proof packs, language/currency/footer, no bypass, no build-output edits)
- Fixzit Blueprint/SDD: Multi-tenancy (org_id/property_owner_id), RBAC, Golden workflows
- Verification log patterns: missing language selector/flags, missing currency, missing universal sidebar/footer, logo regressions, social login buttons missing
- CI/Quality Gates: `.github/workflows/fixzit-quality-gates.yml` and `.github/workflows/build-sourcemaps.yml` must be reviewed when any task touches builds, tests, or release workflows.

Owner Override (Session): If SDD is missing/unreadable, proceed using available SoT files
(`docs/FIXZIT_ONBOARDING_VERIFICATION_BLUEPRINT_V7.md`, `docs/UI_UX_ENHANCEMENT_BLUEPRINT_V1.md`,
`docs/guides/GOVERNANCE.md`) and log the gap in the report. Do not halt solely for missing SDD.

---

## 1) Absolute Global Rules (AUTO-FAIL)
- Do NOT change layout, features, workflows, or remove modules to "fix" bugs.
- Do NOT bypass, suppress, mute, or hide errors (no band-aids, no silent catches, no ts-ignore).
- Do NOT edit build outputs (.next, dist, manifests) to hide problems.
- Do NOT claim "fixed" unless you provide evidence (commands + raw outputs, tests, screenshots where applicable).
- Do NOT close tasks/PRs/issues. Only Eng. Sultan approves closure.

---

## 2) Layout Freeze (Universal Shell)
Global shell must be consistent: Header (Top Bar) + Sidebar + Content + Footer.
- No duplicate headers, no nested layout conflicts, no "header disappears" regressions.
- Footer must be universal and match Landing footer structure (company logo + copyright).
- Sidebar must be universal across all internal modules (not missing in Work Orders/Properties/etc.).

---

## 3) UI/Branding/RTL Hard Rules (Regression Hotspots)
The following must never regress:
- Language selector is ONE dropdown (not two buttons) with flags and clickable switching.
- Arabic must work on Landing page (RTL direction switches, translations load).
- Currency selector exists on ALL pages and is stored in user preferences.
- Fixzit logo must appear before text in header; do not replace it with a generic placeholder.
- Clicking Fixzit logo must route to Landing by default.
- Login page must include Google + Apple sign-in buttons under the main sign-in button.
- Sidebar: collapsed mode must show hover tooltips (missing hover is a bug).

Brand tokens (enforced): #0061A8 Blue, #00A859 Green, #FFB400 Yellow
RTL-first: Prefer logical Tailwind classes (ps/pe/ms/me/start/end).

---

## 4) Multi-Tenancy Zero Tolerance (AUTO-FAIL)
No database query may execute without tenant scope:
- Corporate scope: MUST include `{ org_id: session.user.orgId }`.
- Owner scope: MUST include `{ property_owner_id: session.user.id }` where applicable.
- Super Admin bypass must be explicit and audited.

Any missing tenant filter = SECURITY BUG.

---

## 5) Testing Protocol (Vitest)
### 5.1 Mock Hygiene (CRITICAL)
Every test file MUST include in beforeEach:
- `vi.clearAllMocks()`
- reset default mocked returns (rate limit, auth/session, env)

If a test fails: STOP, fix root cause, re-run. Never comment out tests.

### 5.2 Route Logic Verification Rule
Before writing any rate-limit test:
- Confirm the handler method (GET/POST/DELETE) actually applies enforceRateLimit.
- Do NOT test 429 on GET unless GET implements rate limiting.

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

## 7) Anti-False-Positive Protocol
- Do not hallucinate: never invent files/symbols/configs/results.
- Every issue must cite exact code (file + line range) OR tool output.
- Classify each item: CONFIRMED (>=80%), FALSE POSITIVE, NEEDS EVIDENCE.
- For NEEDS EVIDENCE: stop for that item and list exact commands/outputs required.

## Fix order (best practice)
1) Fix config/resolution first (TS project, ESLint working directory, workspace root, stale servers).
2) Then fix code analyzability/correctness (types/guards/tenant scope/RBAC).
3) Last resort: narrow single-line suppression with justification + TODO. Never blanket-disable.

---

## 8) Fixzit Domain Invariants
- Tenant isolation: org_id scope (+ property_owner_id where applicable)
- RBAC: fixed 14 roles only (no invented roles)
- Finance: Decimal128 storage; precision-safe calculations; compliance only when implementation exists
- UI: design tokens + RTL/i18n consistency

---

## Output
Single Markdown report with unified diffs + validation commands (do not assume results).
End every response with QA Gate Checklist:
- [ ] Tests green
- [ ] Build 0 TS errors
- [ ] No console/runtime/hydration issues
- [ ] Tenancy filters enforced
- [ ] Branding/RTL verified
- [ ] Evidence pack attached

End with: "Merge-ready for Fixzit Phase 1 MVP."

---

## Manual chat prompt (when not using /fixzit-audit)
Audit the selected/open files and Problems panel items using the Fixzit Evidence Protocol:
1) Build an Issues Ledger (source + verbatim message + file+lines).
2) Quote exact triggering code for each item and classify: CONFIRMED (>=80%), FALSE POSITIVE, or NEEDS EVIDENCE.
3) Patch CONFIRMED items only using best-practice root fixes (config -> code -> narrow suppression with justification).
4) Output ONE Markdown report with unified diffs, full updated files (only changed), and validation commands (do not assume results).
End with "Merge-ready for Fixzit Phase 1 MVP."
