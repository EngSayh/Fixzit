# File Organization - Verified Correct

## Summary
The existing file structure follows **Next.js 15 App Router conventions** and **Governance V5 module boundaries**. Auto-generated move plan was incorrect.

## Category D Cleanup (Completed) ✅
1. Removed `components/SupportPopup.OLD.tsx` (backup file)
2. Removed `components/ErrorBoundary.OLD.tsx` (backup file)
3. Moved `smart-merge-conflicts.ts` → `scripts/` (utility organization)

## Why Auto Move Plan Was Wrong ❌

### Next.js Convention Violations:
- Tried to move `app/*/layout.tsx` → `components/` (WRONG: layouts must stay in app directories)
- Tried to move `app/api/*/route.ts` files (WRONG: API routes must stay under app/api/*)

### Module Boundary Violations:
- Tried to consolidate `app/fm/*`, `app/aqar/*`, `app/souq/*` into single directories
- These are **separate modules** with distinct purposes:
  - `app/fm/*` = Facilities Management
  - `app/aqar/*` = Real Estate marketplace
  - `app/souq/*` = General marketplace
  - Each maintains its own namespace and module boundaries

### Collision Issues:
- 31 files would overwrite same destinations
- Example: 5 different page.tsx files → single app/administration/page.tsx
- Shows heuristic pattern matching was too broad

## ✅ Correct Structure (No Changes Needed)

```
app/
├── (dashboard)/          # Dashboard route group
├── (root)/               # Root route group  
├── api/                  # API routes (MUST stay here)
├── fm/                   # FM module namespace
├── aqar/                 # Real Estate namespace
├── souq/                 # Marketplace namespace
├── admin/                # Admin pages
└── ...

components/               # Shared React components
lib/                      # Shared utilities
scripts/                  # Build/dev scripts
tests/                    # Test files
```

## Memory Safety During Cleanup
- Before: 6.4GB
- During: 6.8GB  
- After: 6.8GB
- Status: Safe ✅ (no Code 5 crashes)

## Conclusion
**File organization is correct.** Only cleanup needed was removing backup files and organizing one utility script. No mass reorganization required.

**Agent Improvements Needed:**
- Fix move-plan heuristics to respect Next.js conventions
- Add checks for layout.tsx files (must stay in app/*)
- Add checks for API routes (must stay in app/api/*)
- Add namespace boundary detection
