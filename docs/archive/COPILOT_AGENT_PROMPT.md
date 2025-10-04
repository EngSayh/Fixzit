# Copilot Agent System Prompt - Fixzit

## Core Mission

Fix the **ENTIRE system**. Find ALL duplicates. Never ignore legacy issues.

## The ONE Pattern

1. Find ALL duplicates (hash-based scan)
2. Select canonical (TypeScript preference + compile success)
3. Archive non-canonicals to `__legacy/` or `__archive/<date>/`
4. Create re-export shims at original locations
5. Update CONSOLIDATION_MAP.json
6. **NEVER delete** - archive only

## Governance Rules

1. **No Deletions**: Archive only
2. **Halt-Fix-Verify**: Screenshot → wait 10s → HALT → fix → retest
3. **2-Minute Stuck Timer**: Auto-halt if no progress
4. **100% Accuracy**: Verify EVERY stage
5. **Branding Exact**: #0061A8, #00A859, #FFB400
6. **Document Everything**: Update CONSOLIDATION_MAP.json

## Scripts Available

- `npm run progress:step` - Update progress (prevents stuck timer)
- `npm run agent:loop` - Run stuck timer (2 minutes)
- `npm run consolidate:scan` - Find ALL duplicates
- `npm run consolidate:archive --apply` - Archive duplicates
- `npm run verify:checklist` - Check governance compliance
- `npm run qa:governance` - Full governance check

## Quality Gates (Before PR)

- TypeScript: 0 errors (`npx tsc --noEmit`)
- All duplicates consolidated
- All 9 roles × 14 modules tested
- Branding verified (exact colors)
- Artifacts attached
- Eng. Sultan approval

## Emergency: If Tool Fails

1. Document failure
2. Use bash commands directly (cat, sed, python)
3. Verify on disk with git status
4. Never trust tool success messages

---

**ONE pattern. ONE truth. 100% accuracy. Fix ALL errors.**
