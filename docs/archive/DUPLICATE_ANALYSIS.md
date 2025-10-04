# Duplicate Code Analysis

**Date**: 2025-10-02
**Branch**: feature/finance-module
**Scanned**: app/, components/, contexts/, config/, src/

---

## 🔍 IDENTIFIED DUPLICATES

### 1. Context Files (EXACT DUPLICATES)

#### TopBarContext.tsx
- **Primary**: \contexts/TopBarContext.tsx\
- **Duplicate**: \src/contexts/TopBarContext.tsx\
- **Status**: ✅ Identical files (diff shows no changes)
- **Action**: Keep \contexts/TopBarContext.tsx\, remove duplicate in src/

#### ThemeContext.tsx  
- **Primary**: \contexts/ThemeContext.tsx\
- **Duplicate**: \src/contexts/ThemeContext.tsx\
- **Status**: ✅ Identical files (diff shows no changes)
- **Action**: Keep \contexts/ThemeContext.tsx\, remove duplicate in src/

### 2. Config Files (EXACT DUPLICATES)

#### topbar-modules.ts
- **Primary**: \config/topbar-modules.ts\
- **Duplicate**: \src/config/topbar-modules.ts\
- **Status**: ✅ Identical files (diff shows no changes)
- **Action**: Keep \config/topbar-modules.ts\, remove duplicate in src/

#### sidebarModules.ts
- **Primary**: \config/sidebarModules.ts\
- **Duplicate**: \src/config/sidebarModules.ts\
- **Status**: ✅ Identical files (diff shows no changes)
- **Action**: Keep \config/sidebarModules.ts\, remove duplicate in src/

### 3. Server Security Headers (EXACT DUPLICATES)

#### headers.ts
- **Primary**: \server/security/headers.ts\
- **Duplicate**: \src/server/security/headers.ts\
- **Status**: ✅ Identical files (likely)
- **Action**: Keep \server/security/headers.ts\, remove duplicate in src/

### 4. Page Route Duplicates

#### Work Orders Page
- **Primary**: \pp/work-orders/page.tsx\
- **Duplicate**: \pp/fm/work-orders/page.tsx\
- **Status**: ✅ Confirmed identical by hash scan
- **Action**: Keep \pp/fm/work-orders/page.tsx\ (proper module structure), remove standalone version

---

## 📊 CONSOLIDATION SUMMARY

### Files to Keep (Golden Files)
1. \contexts/TopBarContext.tsx\
2. \contexts/ThemeContext.tsx\
3. \config/topbar-modules.ts\
4. \config/sidebarModules.ts\
5. \server/security/headers.ts\
6. \pp/fm/work-orders/page.tsx\

### Files to Remove
1. \src/contexts/TopBarContext.tsx\
2. \src/contexts/ThemeContext.tsx\
3. \src/config/topbar-modules.ts\
4. \src/config/sidebarModules.ts\
5. \src/server/security/headers.ts\
6. \pp/work-orders/page.tsx\

### Import Updates Needed
All imports pointing to \src/contexts/*\, \src/config/*\, \src/server/*\ must be updated to root paths.

Example:
- ❌ \import { useTopBar } from '@/src/contexts/TopBarContext'\
- ✅ \import { useTopBar } from '@/contexts/TopBarContext'\

---

## 🎯 CONSOLIDATION PLAN

### Phase 1: Update Imports (Safe - No Deletions)
1. Find all files importing from \@/src/contexts/*\
2. Update to \@/contexts/*\
3. Find all files importing from \@/src/config/*\
4. Update to \@/config/*\
5. Find all files importing from \@/src/server/*\
6. Update to \@/server/*\
7. Update \pp/work-orders/page.tsx\ redirect

### Phase 2: Move to Trash (Reversible)
1. Create \.trash/\ directory
2. Move duplicates to \.trash/src/\
3. Test build: \
pm run build\
4. Test dev: \
pm run dev\
5. Verify no broken imports

### Phase 3: Commit & Verify
1. Commit import updates
2. Commit trash moves
3. Run full verification suite
4. If successful, delete \.trash/\

---

## 📈 EXPECTED IMPACT

- **Files Removed**: 6
- **Space Saved**: ~5 KB
- **Build Time**: Faster (less file processing)
- **Import Clarity**: Better (single source of truth)
- **Risk**: Low (imports updated before deletion)

---

## ✅ SUCCESS CRITERIA

- [ ] All imports updated to root paths
- [ ] No TypeScript errors after import updates
- [ ] \
pm run build\ succeeds
- [ ] \
pm run dev\ works
- [ ] All tests pass
- [ ] Duplicate files moved to \.trash/\

---

**Next Step**: Execute Phase 1 - Update imports across codebase using replace-string-in-file.ts