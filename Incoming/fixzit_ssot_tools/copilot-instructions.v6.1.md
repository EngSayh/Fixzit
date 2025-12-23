# Fixzit — Copilot Instructions (Synced to AGENTS.md v6.1)

> **Canonical Governance:** `AGENTS.md` is the single authoritative agent agreement.
> If anything in this file conflicts with `AGENTS.md`, **`AGENTS.md` wins**.

## 1) SSOT (Non‑Negotiable)
- MongoDB Issue Tracker is the ONLY SSOT.
- Never create or “invent” work items in docs. `docs/PENDING_MASTER.md` is a derived snapshot only.
- Before starting work: run SSOT Pre‑Claim Validation and perform an atomic claim (per `AGENTS.md`).

## 2) Agent Token / Attribution
- Every commit message MUST include: `[AGENT-XXX-Y]` and `[ISSUE-KEY]`
- Every PR description MUST include Agent Token + Target Code Set.

## 3) Cross‑Device Sync (Mac + Windows)
- Before starting any task: `git fetch --prune` and ensure your branch is **not behind** remote.
- If remote advanced: rebase/merge first, then start.
- Never rely on case‑sensitivity; always match exact import path case.

## 4) Layout Freeze — Universal Shell (UI Contract)
**DO NOT change these without an explicit SSOT issue and approval.**
- Sidebar layout/ordering
- Top navbar layout
- Global language selector
- Global currency selector

If a task risks changing layout: STOP and create/update an SSOT issue with evidence.

## 5) UI/Branding/RTL Hard Rules
- RTL‑first: ban left/right and ml/mr/pl/pr; use start/end/ms/me/ps/pe.
- Use design tokens; no hardcoded hex colors.
- Do not regress UX across Arabic/English locales.

## 6) Multi‑Tenancy — Zero Tolerance
- All queries must be tenant‑scoped (org_id / tenantId) with authorization checks.
- Fix root cause; do not patch with hardcoded IDs.

## 7) Testing & HFV (Happy Flow Validation)
- Update/extend tests for every fix.
- Validate at minimum:
  - login
  - tenant scoping
  - primary module happy path relevant to the change
- Keep mocks clean; avoid flaky tests.

## 8) Environment Variables
- If something fails due to an env var: verify in GitHub + Vercel + local .env before reporting missing.
- Keep `.env.example` up to date.

## 9) Output Discipline
- Provide a merge‑ready output: what changed, why, evidence (commands/logs), SSOT updates, and next steps.
