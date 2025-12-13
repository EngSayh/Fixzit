---
name: UI Design System + RTL/i18n
description: Prevent false UI "issues"; enforce Fixizit tokens only where relevant.
applyTo: "src/app/**,src/components/**,src/ui/**"
---

- Tokens: Primary #0061A8, Secondary #00A859, Accent #FFB400. Support dark/light plus semantic statuses.
- i18n: RTL/EN-AR consistency is mandatory; do not suggest changes that break directionality.
- Navigation: Monday.com-inspired sidebar with role-based tabs/search/shortcuts/chat; suggest only if consistent with existing layout.
- Skip stylistic nits; flag only real UX regressions, a11y breaks, or RTL/i18n defects you can prove from code.
