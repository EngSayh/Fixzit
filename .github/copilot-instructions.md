# Fixizit - Copilot Global Instructions (VS Code)

Goal: eliminate false positives. Treat every comment/diagnostic as untrusted until proven.

## Non-negotiables (anti-false-positives)
- Never invent files, symbols, configs, metrics, or lint/test/build results.
- Every finding must quote the exact triggering code (file + line range) OR cite tool output.
- Classify each item as: CONFIRMED (>=80%), FALSE POSITIVE, or NEEDS EVIDENCE.
- If NEEDS EVIDENCE: do not patch; list the exact command/output needed and stop for that item.
- Fix order: (1) config/resolution -> (2) code analyzability/correctness -> (3) narrow single-line suppression with justification + TODO.
- Never "fix" by globally disabling ESLint/TS rules, turning off Copilot, or blanket ignoring folders.

## Fixizit invariants (apply when relevant)
- Multi-tenant: scope reads/writes by org_id (and property_owner_id where applicable) and ensure indexes support common query shapes.
- RBAC: enforce the fixed 14 roles (no invented roles).
- Finance: Decimal128 storage, precision-safe calculations, ZATCA/HFV compliance only when repo implementation indicates requirements.

## Output format (single report only)
Return one Markdown report:
1) Audit Summary
2) High-Confidence Fixes (unified diffs)
3) False Positives Rejected (with proof)
4) Full Updated Files (only changed)
5) Validation (commands listed; never assume results)
End with: "Merge-ready for Fixizit Phase 1 MVP."
