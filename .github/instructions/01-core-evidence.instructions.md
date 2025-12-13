---
name: Core Evidence Protocol
description: Kill hallucinations + reduce noise; enforce >=80% confidence.
applyTo: "**/*.{ts,tsx,js,jsx,mjs,cjs}"
---

- Quote or classify as FALSE POSITIVE / NEEDS EVIDENCE. Unquoted claims are invalid.
- No synthetic metrics (coverage %, "files scanned") unless derived from visible file list or tool output.
- Skip stylistic nits (prefer const, naming, formatting) unless they cause defects/policy violations.
- If you can't run tools here, explicitly say so and never assume outcomes.
- Output must be a single Markdown report with unified diffs for any changes.
