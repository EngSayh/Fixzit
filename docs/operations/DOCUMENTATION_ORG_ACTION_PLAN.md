# Documentation & Organization Action Plan

**Date:** November 18, 2025  
**Owner:** DocOps / QA Enablement  
**Scope:** Stabilize the documentation set for payment readiness, UI QA, smoke testing, and org-guard rollout while retiring stale files (60+ docs) into `docs/archived`.

---

## Objectives
- Provide a single source of truth for the four required runbooks (payment integration, manual UI, smoke tests, org guard tracker).
- Document concrete issues found during the audit and define the remediation tasks with owners + timelines.
- Archive at least 60 legacy or superseded documents so the active docs index stays relevant.
- Publish verification steps so future agents can confirm the documentation remains up to date.

---

## Status Dashboard
| Workstream | Artifact | Status | Owner | Notes |
|------------|----------|--------|-------|-------|
| Payment Integration | `docs/payment-integration-checklist.md` | 🟢 Ready for testing | Payments Pod | Checklist now includes sample payloads, error taxonomy, and SLA matrix; awaiting MSW mock (PI-03). |
| Manual UI Testing | `docs/MANUAL_UI_TESTING_CHECKLIST.md` | ✅ Ready | QA Team | Execution template complete; needs data guardrails + summary board. |
| Org Guard Smoke Log | `SMOKE_TEST_EXECUTION_LOG.md` | 🚧 Pending | Release QA | Template exists but missing execution summary + blocker capture. |
| Org Guard Tracker | `docs/ORG_GUARD_STATUS.md` | ⚠️ 40% coverage | Platform | Tracker up but lacks snapshot + dependency mapping. |
| Archive Legacy Docs | `docs/archived/**` | 🟢 On Track | DocOps | New `legacy-sessions/` + `workspace-org/` folders bring archive count to 459 files. |

_These rows correspond to the backlog summary in `CODE_QUALITY_IMPROVEMENTS_REPORT.md`._

---

## Step-by-Step Plan

### 1. Harden the Payment Integration Checklist
- [x] Add a status summary so engineers see which payment areas are blocked/unblocked.
- [x] Capture explicit action items (backend spec review, timeout inventory, monitoring design).
- [x] Link to scripts + log locations for reproducibility.

### 2. Enrich the Manual UI Testing Checklist
- [ ] Provide rapid status dashboard for each suite + test data call-outs.
- [ ] Document the support org switcher credentials + safety checks.
- [ ] Keep the execution log + sign-off template intact for traceability.

### 3. Formalize the Smoke Test Execution Log
- [x] Add a summary board with per-test status.
- [x] Promote the blockers (lack of seeded orgs, impersonation cookies) so the team can unblock.
- [x] Tie in follow-up issues and reference scripts.

### 4. Upgrade the Org Guard Status Tracker
- [ ] Insert a metrics snapshot (modules vs. coverage) that can be copy/pasted to status reports.
- [ ] Clarify dependencies (translations, SupportOrg context, CI gate) for each phase.
- [ ] Document verification scripts + owners.

### 5. Archive ≥60 Legacy Documents
- [ ] Create `docs/archived/legacy-sessions/` and `docs/archived/workspace-org/` for themed storage.
- [ ] Move dormant status/plan docs (Day 1 summaries, workspace org plans, etc.) into archive folders.
- [ ] Update this plan once archive count confirmed ≥60 using `find docs/archived -type f | wc -l`.

### 6. Verification & Reporting
- [ ] Re-run smoke + manual checklists after updates (to be executed by QA when environment ready).
- [ ] Add references in `DEPLOYMENT_NEXT_STEPS.md` if blockers remain.
- [ ] Share summary + commands in the final PR description so reviewers can validate quickly.

---

## Execution Log
| Timestamp | Action |
|-----------|--------|
| 2025-11-18 13:05 UTC | Audited existing doc set; identified missing summary boards + low archive count (46). |
| 2025-11-18 13:20 UTC | Drafted this action plan to guide documentation + archival work. |
| 2025-11-18 13:55 UTC | Updated key artifacts + moved Day 1/session/workspace docs into archive folders (count now 459). |
| _Next_ | Keep plan/table dates in sync after QA finishes execution logs. |

---

## Verification Commands
```bash
# Validate archive target
find docs/archived -type f | wc -l

# Surface org-guard coverage gaps
./scripts/check-org-guards.sh
# Optional deeper validation
pnpm run verify:org-context
```

---

## Dependencies & Risks
- Payment payload specs now published, but QA still needs MSW/prism mock (PI-03) to automate negative testing.
- QA needs superadmin credentials + seeded organizations to finish SupportOrg smoke tests.
- Archival must preserve git history; never delete without moving to `docs/archived`.

Mitigation: Document every blocker, commit partial updates, and keep the summary tables at the top of each artifact up to date.
