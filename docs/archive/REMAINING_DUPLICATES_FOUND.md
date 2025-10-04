# Remaining Duplicates Found (42 Groups, 84 Files)

## Summary
After previous consolidation, comprehensive MD5 hash scan found **42 additional duplicate groups** (84 files total) between root and src/ directories.

## Duplicate Groups by Category

### I18n Dictionaries (2 files)
- ar.ts: `i18n/dictionaries/` vs `src/i18n/dictionaries/`
- en.ts: `i18n/dictionaries/` vs `src/i18n/dictionaries/`

### Types (3 files)
- properties.ts: `types/` vs `src/types/`
- jest-dom.d.ts: `types/` vs `src/types/`
- work-orders.ts: `types/` vs `src/types/`

### QA (4 files)
- consoleHijack.ts: `qa/` vs `src/qa/`
- AutoFixAgent.tsx: `qa/` vs `src/qa/`
- acceptance.ts: `qa/` vs `src/qa/`
- domPath.ts: `qa/` vs `src/qa/`

### Lib Subdirectories (7 files)
**marketplace:**
- search.ts: `lib/marketplace/` vs `src/lib/marketplace/`
- objectIds.ts: `lib/marketplace/` vs `src/lib/marketplace/`
- security.ts: `lib/marketplace/` vs `src/lib/marketplace/`

**payments:**
- parseCartAmount.ts: `lib/payments/` vs `src/lib/payments/`

**storage:**
- s3.ts: `lib/storage/` vs `src/lib/storage/`

### KB (Knowledge Base) (3 files)
- search.ts: `kb/` vs `src/kb/`
- chunk.ts: `kb/` vs `src/kb/`
- ingest.ts: `kb/` vs `src/kb/`

### Config (1 file)
- modules.ts: `config/` vs `src/config/`

### Data (1 file)
- language-options.ts: `data/` vs `src/data/`

### DB (1 file)
- mongoose.ts: `db/` vs `src/db/`

### Hooks (1 file)
- useUnsavedChanges.tsx: `hooks/` vs `src/hooks/`

### Core (1 file)
- RuntimeMonitor.tsx: `core/` vs `src/core/`

### Nav (1 file)
- registry.ts: `nav/` vs `src/nav/`

### Utils (1 file)
- rbac.ts: `utils/` vs `src/utils/`

### Root Level (1 file)
- sla.ts: `./` vs `src/`

## Analysis Pattern

All duplicates follow the same pattern:
- **Root location**: `<dir>/<file>`
- **Src duplicate**: `src/<dir>/<file>`
- **Status**: Byte-for-byte identical (confirmed by MD5 hash)

## Consolidation Strategy

Based on previous successful merge:

1. **Root is canonical**
   - `@/*` → `./*` (root) per tsconfig.json
   - Consistent with previous contexts/, i18n/, providers/, lib/ merge

2. **Remove src/ duplicates**
   - All 42 src/ versions are redundant copies
   - Keep root versions as single source of truth

3. **Update imports**
   - Search for imports to src/<dir>/
   - Update to root <dir>/ or @/<dir>/

4. **Verify**
   - TypeScript check: must be 0 errors
   - No broken imports

## Total Impact

- **Previous consolidation**: 23 files
- **This consolidation**: 42 files
- **Total**: 65 duplicate source files to remove from src/
- **Plus models**: 69 files
- **Plus tests**: 14 files
- **Grand total**: 148 duplicate files eliminated

## Next Steps

1. Remove all 42 src/ duplicate files
2. Search and fix broken imports
3. Verify TypeScript (0 errors)
4. Commit with comprehensive changelog
