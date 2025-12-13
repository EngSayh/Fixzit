---
name: Finance (Decimal128) + ZATCA/HFV
description: Compliance-aware reviews without speculation.
applyTo: "src/domain/finance/**,src/lib/finance/**,src/models/finance/**,src/app/api/**finance**"
---

- Money storage: Decimal128 (or repo-established money type). Avoid float math for SAR.
- Precision risk calculations: use a safe approach (BigInt or repo-established safe method).
- ZATCA/HFV: flag compliance defects only when the repo's own implementation indicates required fields/steps are missing.
- Never speculate on compliance if the relevant implementation is not present in visible code; mark NEEDS EVIDENCE instead.
