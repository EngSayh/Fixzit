# src/ Directory Consolidation Plan

**Date**: October 5, 2025  
**Status**: In Progress  
**Goal**: Remove all duplicate files from `src/` subdirectories where canonical versions exist at root level

---

## Analysis

The `src/` directory contains many subdirectories that **duplicate** root-level directories:

- `src/contexts/` duplicates `contexts/`
- `src/i18n/` duplicates `i18n/`
- `src/providers/` duplicates `providers/`
- `src/core/` duplicates `core/`
- `src/hooks/` duplicates `hooks/`
- `src/qa/` duplicates `qa/`

This creates **import ambiguity** and maintenance burden.

---

## Confirmed Duplicates (Ready to Remove)

### Test Files (100% Identical)
1. **src/contexts/TranslationContext.test.tsx** (226 lines)
   - Canonical: `contexts/TranslationContext.test.tsx`
   - Status: ✅ Verified identical

2. **src/i18n/I18nProvider.test.tsx** (304 lines)
   - Canonical: `i18n/I18nProvider.test.tsx`
   - Status: ✅ Verified identical

3. **src/providers/Providers.test.tsx** (197 lines)
   - Canonical: `providers/Providers.test.tsx`
   - Status: ✅ Verified identical

### Component/Provider Files
4. **src/core/RuntimeMonitor.tsx**
   - Canonical: `core/RuntimeMonitor.tsx`
   - Status: ⏳ Needs verification

5. **src/providers/QAProvider.tsx**
   - Canonical: `providers/QAProvider.tsx`
   - Status: ⏳ Needs verification

6. **src/hooks/useUnsavedChanges.tsx**
   - Canonical: `hooks/useUnsavedChanges.tsx`
   - Status: ⏳ Needs verification

### QA Components
7. **src/qa/AutoFixAgent.tsx**
   - Canonical: `qa/AutoFixAgent.tsx`
   - Status: ⏳ Needs verification

8. **src/qa/ErrorBoundary.tsx**
   - Canonical: `qa/ErrorBoundary.tsx` OR `components/ErrorBoundary.tsx`
   - Status: ⏳ Needs import analysis

---

## Execution Strategy

### Phase 1: Remove Verified Test File Duplicates ✅
Remove 3 test files that are 100% verified identical.

### Phase 2: Verify and Remove Component Duplicates
1. Compare each file pair
2. Check imports across codebase
3. Remove duplicate if 100% identical
4. Update imports if needed

### Phase 3: Analyze Remaining src/ Directories
Check for unique files in:
- src/ai/
- src/client/
- src/config/
- src/data/
- src/db/ (already contains unique models - keep)
- src/jobs/
- src/kb/
- src/lib/
- src/nav/
- src/server/
- src/services/
- src/styles/
- src/types/
- src/utils/
- src/sla.ts

---

## Import Patterns to Update

### Current Ambiguous Patterns
- `@/contexts/*` vs `@/src/contexts/*`
- `@/i18n/*` vs `@/src/i18n/*`
- `@/providers/*` vs `@/src/providers/*`
- `@/core/*` vs `@/src/core/*`
- `@/hooks/*` vs `@/src/hooks/*`
- `@/qa/*` vs `@/src/qa/*`

### Target Canonical Patterns
- `@/contexts/*` - ONLY (no src/)
- `@/i18n/*` - ONLY (no src/)
- `@/providers/*` - ONLY (no src/)
- `@/core/*` - ONLY (no src/)
- `@/hooks/*` - ONLY (no src/)
- `@/qa/*` - ONLY (no src/ OR move to components/)

---

## Expected Impact

### Benefits
1. **Eliminate Import Ambiguity**: Single canonical location for each module
2. **Reduce Maintenance**: Fewer duplicate files to maintain
3. **Clearer Architecture**: Obvious file organization
4. **Better Developer Experience**: No confusion about which file to import

### Risks
- ⚠️ **Import Breaks**: If any code imports from `src/` paths, those must be updated first
- ⚠️ **Different Content**: If files aren't identical, need careful merge strategy

---

## Next Steps

1. ✅ Remove 3 verified test file duplicates
2. ⏳ Verify remaining 5+ component duplicates
3. ⏳ Search for imports using `src/` paths
4. ⏳ Update imports if needed
5. ⏳ Remove duplicate files
6. ⏳ Verify TypeScript: 0 errors
7. ⏳ Update documentation

---

**Status**: Ready to execute Phase 1
