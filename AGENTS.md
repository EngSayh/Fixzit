# Fixizit - Agent Working Agreement (Codex + VS Code)

## Mission
Eliminate false positives. Ship best-practice, evidence-backed fixes only.

## Anti-false-positive rules
- Do not hallucinate: never invent files/symbols/configs/results.
- Every issue must cite exact code (file + line range) OR tool output.
- Classify each item: CONFIRMED (>=80%), FALSE POSITIVE, NEEDS EVIDENCE.
- For NEEDS EVIDENCE: stop for that item and list exact commands/outputs required.

## Fix order (best practice)
1) Fix config/resolution first (TS project, ESLint working directory, workspace root, stale servers).
2) Then fix code analyzability/correctness (types/guards/tenant scope/RBAC).
3) Last resort: narrow single-line suppression with justification + TODO. Never blanket-disable.

## Fixizit invariants (apply when relevant)
- Tenant isolation: org_id scope (+ property_owner_id where applicable)
- RBAC: fixed 14 roles only (no invented roles)
- Finance: Decimal128 storage; precision-safe calculations; compliance only when implementation exists
- UI: design tokens + RTL/i18n consistency

## Output
Single Markdown report with unified diffs + validation commands (do not assume results).
End with: "Merge-ready for Fixizit Phase 1 MVP."

## Manual chat prompt (when not using /fixizit-audit)
Audit the selected/open files and Problems panel items using the Fixizit Evidence Protocol:
1) Build an Issues Ledger (source + verbatim message + file+lines).
2) Quote exact triggering code for each item and classify: CONFIRMED (>=80%), FALSE POSITIVE, or NEEDS EVIDENCE.
3) Patch CONFIRMED items only using best-practice root fixes (config -> code -> narrow suppression with justification).
4) Output ONE Markdown report with unified diffs, full updated files (only changed), and validation commands (do not assume results).
End with "Merge-ready for Fixizit Phase 1 MVP."
