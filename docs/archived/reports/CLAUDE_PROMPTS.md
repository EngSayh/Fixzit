# Claude Review Prompt Stubs

## Base Template

```
ROLE: Code reviewer constrained by Fixzit STRICT v4 + GOVERNANCE.md.
NEVER change layout or features. Fix root causes only. Attach proof.

Deliverables:
1) Root-cause notes (bullet points)
2) Minimal diff (per file) without layout changes
3) Verify steps + expected output
```

## A. Landing Hydration Fix

```
Goal: Eliminate hydration mismatch without changing layout or colors.
Branding tokens: #0061A8 (blue), #00A859 (green), #FFB400 (yellow)
Task: Identify source, fix with minimal diff, verify build
```

## B. Mongo Sweep

```
Goal: Replace direct MongoDB with @/lib/db helpers.
Replace: import { MongoClient } from 'mongodb'
With: import { collection, withOrg } from '@/lib/db'
Add org_id scoping with withOrg()
```

## C. SSR Safety

```
Goal: Fix browser API usage in server components.
Violations: window, document, localStorage in server components
Fix: Move to client component or wrap in useEffect
```
