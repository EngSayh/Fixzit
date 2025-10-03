# Agent Governor - Fixzit Consolidation System

**Version**: 1.0  
**Date**: October 3, 2024  
**Purpose**: Comprehensive governance for system-wide consolidation and error elimination

## 1. Objective

Fix the **ENTIRE system**—not just current problems. Consolidate ALL duplicates. Never ignore legacy issues.

### Golden Rules (Non-Negotiable)

1. **No Deletions**: Archive to `__legacy/` or `__archive/<date>/` - NEVER delete
2. **ONE Pattern**: Find ALL duplicates → select canonical → archive rest → create shims
3. **100% Accuracy**: Verify EVERY stage (connections, endpoints, DB, UI/UX, HTML, buttons)
4. **Halt-Fix-Verify**: Screenshot → wait 10s → HALT → fix → retest before proceeding
5. **2-Minute Stuck Timer**: Auto-halt if no progress within 2 minutes
6. **Branding Exact**: #0061A8, #00A859, #FFB400 - no "close enough"
7. **Document Everything**: Update CONSOLIDATION_MAP.json with ALL decisions

## 2. Phase Plan

### Phase 0: Governance Setup ✅
- Create GOVERNANCE files
- Create consolidation scripts
- Create system prompt
- Update package.json

### Phase 1: Duplicate Detection 🔄
- Run `npm run consolidate:scan`
- Review CONSOLIDATION_MAP.json
- Identify ALL duplicate groups
- Plan consolidation strategy

### Phase 2: TypeScript Error Elimination 🔄
- Fix 105 → 0 errors systematically
- Apply 2-minute stuck timer per batch
- Document fixes in TYPESCRIPT_PROGRESS.md

### Phase 3: Duplicate Consolidation ⏸️
- Select canonical for each group
- Archive non-canonicals
- Create re-export shims
- Update CONSOLIDATION_MAP.json

### Phase 4: Halt-Fix-Verify Testing ⏸️
- Test all 9 roles × 14 modules (126 combinations)
- Screenshot → wait 10s → HALT if error → fix → retest
- Verify: console=0, network=0, runtime=0, build=0

### Phase 5: Quality Gates ⏸️
- TypeScript: 0 errors (`npx tsc --noEmit`)
- ESLint: 0 critical errors
- Branding: exact colors verified
- Global elements: language selector, currency, RTL/LTR
- All artifacts collected

### Phase 6: PR Creation ⏸️
- Root cause analysis
- Verification proof (screenshots, logs)
- Test results for all roles × modules
- Eng. Sultan approval

## 3. Quality Gates Summary

Before PR, verify ALL:
- ✅ TypeScript: 0 errors
- ✅ All duplicates consolidated
- ✅ All pages tested for all 9 roles
- ✅ Branding verified (exact colors)
- ✅ Global elements present
- ✅ Artifacts attached
- ✅ Eng. Sultan approval obtained

## 4. Emergency Procedures

### If Stuck (2 Minutes No Progress)
1. STOP immediately
2. Check `progress/stuck-<timestamp>.json`
3. Rollback to last green commit
4. Document blocker in STUCK_ANALYSIS.md
5. Fix root cause
6. Reset timer and retry

### If Tool Fails
1. Document in ROOT_CAUSE_ANALYSIS_<tool>.md
2. Find workaround (e.g., bash commands instead of tools)
3. Verify EVERY operation on disk
4. Never trust tool success messages

---

**Remember**: Fix ALL errors, consolidate ALL duplicates, verify 100% at EVERY stage.
