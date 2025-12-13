(Shows up as /fixizit-audit in VS Code chat)
Visual Studio Code

---
name: fixizit-audit
description: Fixizit evidence-based audit to eliminate false positives; apply >=80% fixes only.
argument-hint: "Paste diagnostics/messages or run against selected/open files."
agent: 'agent'
---

Audit selected/open files and the Problems panel items using the repo instructions.

1) Build an Issues Ledger: source + verbatim message + file + line range.
2) For each item: quote exact triggering code, then classify:
   - CONFIRMED (>=80%) -> patch
   - FALSE POSITIVE -> reject with proof (code/config)
   - NEEDS EVIDENCE -> list exact command/output needed; do not patch
3) Apply best-practice fixes in order: config/resolution -> code analyzability/correctness -> narrow suppression with justification + TODO.
4) Output ONE Markdown report only:
   Audit Summary -> High-Confidence Fixes (unified diffs) -> False Positives Rejected (proof) -> Full Updated Files (only changed) -> Validation (commands; do not assume results).
End with: "Merge-ready for Fixizit Phase 1 MVP."
