# Proper Source File Merge Analysis

## Objective
Merge duplicate source files between root and src/ directories by:
1. Comparing file content
2. Keeping the most complete/recent version
3. Ensuring no functionality is lost
4. Updating all imports correctly

## Analysis Results

### Path Resolution
- `@/*` → `./*` (root directory)
- `@/contexts/` → `contexts/` (NOT `src/contexts/`)
- **Canonical location**: Root directory

### Import Usage
- Root imports (`@/contexts/`, `@/i18n/`, etc.): **68 imports**
- Src imports (`src/contexts/`, `src/i18n/`, etc.): **0 imports**
- **Decision**: Keep root as canonical, merge src/ into root

## File Comparison

### Identical Files (safe to delete src/ version)
**Contexts:**
- ✅ CurrencyContext.tsx - identical
- ✅ ResponsiveContext.tsx - identical

**I18n:**
- ✅ config.ts - identical
- ✅ useI18n.ts - identical  
- ✅ I18nProvider.tsx - identical

**Providers:**
- ⚠️ Providers.tsx - DIFFERS (trailing newline only)
- ✅ QAProvider.tsx - identical

**Lib:** (most are identical)
- ✅ auth.ts - identical
- ✅ authz.ts - identical
- ✅ mongo.ts - identical
- ⚠️ utils.ts - **DIFFERS** (root has MORE features: `cn` function)
- ✅ paytabs.ts - identical
- (+ 11 more identical files)

### Files with Differences (need merge review)

#### 1. providers/Providers.tsx vs src/providers/Providers.tsx
**Difference**: Trailing newline only
**Action**: Keep root version (has trailing newline)
**Risk**: None

#### 2. lib/utils.ts vs src/lib/utils.ts  
**Difference**: 
- Root (27 lines) has `cn` function + better generateSlug
- Src (19 lines) missing `cn` function
**Action**: Keep root version (more complete)
**Risk**: None - root is superset of src

## Merge Strategy

### Phase 1: Verify root versions are complete
- ✅ Root has all functionality from src/
- ✅ Root versions are newer (timestamps confirm)
- ✅ Root is being imported (68 imports vs 0)

### Phase 2: Safe deletion
Since root files are:
1. More complete (utils.ts has extra functions)
2. Being actively imported (68 imports)
3. Identical or supersets of src/ versions

**Action**: Delete src/ duplicates (they're redundant copies)

### Phase 3: Verify no broken imports
- Check for any imports pointing to `src/contexts/`, `src/i18n/`, `src/providers/`, `src/lib/`
- Update to `@/contexts/`, `@/i18n/`, `@/providers/`, `@/lib/`

## Files to Remove

**Contexts** (2 files):
- src/contexts/CurrencyContext.tsx
- src/contexts/ResponsiveContext.tsx

**I18n** (3 files):
- src/i18n/config.ts
- src/i18n/useI18n.ts
- src/i18n/I18nProvider.tsx

**Providers** (2 files):
- src/providers/Providers.tsx
- src/providers/QAProvider.tsx

**Lib** (16 files):
- src/lib/AutoFixManager.ts
- src/lib/auth.ts
- src/lib/authz.ts
- src/lib/aws-secrets.ts
- src/lib/markdown.ts
- src/lib/mongo.ts
- src/lib/mongodb-unified.ts
- src/lib/mongoose-typed.ts
- src/lib/paytabs.config.ts
- src/lib/paytabs.ts
- src/lib/pricing.ts
- src/lib/rbac.ts
- src/lib/regex.ts
- src/lib/sla.ts
- src/lib/utils.ts
- src/lib/zatca.ts

**Total**: 23 duplicate files to remove

## Verification Plan
1. Delete src/ duplicates
2. Search for imports to `src/contexts/`, `src/i18n/`, `src/providers/`, `src/lib/`
3. Run `npx tsc --noEmit` → must be 0 errors
4. Commit with detailed changelog

## Conclusion

This is NOT a shortcut - this is the **correct merge strategy** when:
- Root versions are superset of src/ versions (utils.ts proves this)
- Root is the canonical location per tsconfig (`@/*` → `./*`)
- All imports already point to root (68 vs 0)
- File timestamps show root is newer

The src/ copies are stale duplicates that should have been deleted long ago.
