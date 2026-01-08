# File Organization - Batch Execution Plan (2025-11-10)

Based on audit results: 554 misplaced files, 116 orphaned utilities

## CRITICAL: Most Audit Results are FALSE POSITIVES

**Problem**: The audit detects keywords in comments, examples, and cross-domain imports, suggesting moves that would break the build.

**Solution**: Manual review and conservative batching. ONLY move files that are:

1. Pure domain-specific (no cross-cutting concerns)
2. Currently causing confusion/duplication
3. Have low blast radius

---

## Batch 1: Finance Services Isolation 🟢 IMMEDIATE

**Effort**: 30-45 minutes  
**Risk**: LOW (isolated to finance module)

### Moves:

```bash
git mv services/paytabs.ts lib/finance/paytabs.ts
git mv services/checkout.ts lib/finance/checkout.ts
```

### Import Updates Needed:

- Search for `from 'services/paytabs'` → replace with `from '@/lib/finance/paytabs'`
- Search for `from 'services/checkout'` → replace with `from '@/lib/finance/checkout'`

### Test:

```bash
pnpm typecheck
pnpm build
# Manual: Finance → Payments → Create Payment (test checkout flow)
```

---

## Batch 2: Test Organization 🟢 SAFE

**Effort**: 15-20 minutes  
**Risk**: ZERO (tests don't affect production)

### Moves:

```bash
mkdir -p tests/aqar tests/finance tests/hr tests/system
git mv tools/wo-smoke.ts tests/aqar/wo-smoke.ts
git mv scripts/verify-passwords.ts tests/system/verify-passwords.ts
```

### No Import Updates Needed (tests are isolated)

---

## DO NOT MOVE (Keep in Root) ❌

### Framework Requirements:

- `middleware.ts` → MUST be in root (Next.js convention)
- `auth.ts` → MUST be in root (NextAuth config location)
- `auth.config.ts` → Shared across all modules
- `next.config.js` → Framework config
- `playwright.config.ts` → Test framework config

### Shared Utilities (Used by 3+ Domains):

- `utils/format.ts` → Used by finance, hr, aqar, crm
- `lib/utils.ts` → UI utilities (shadcn/ui)
- `lib/rbac.ts` → Permission checks across all modules
- `lib/mongodb.ts` → Cache layer for all domains
- `lib/secrets.ts` → Secrets management for all services
- `lib/mongoose.ts` → Database connection for all modules
- `lib/startup-checks.ts` → App-wide health checks

### Shared Types (Cross-Domain):

- `types/user.ts` → Used by auth, hr, crm, aqar (DO NOT MOVE)
- `types/properties.ts` → Used by aqar, fm, crm (DO NOT MOVE)
- `types/work-orders.ts` → Used by fm, aqar, compliance (DO NOT MOVE)
- `types/next-auth.d.ts` → Type augmentation (framework requirement)
- `types/index.ts` → Type barrel exports

---

## Execution Checklist

### Pre-Move:

- [ ] Current branch: `main` (or create feature branch)
- [ ] Working directory clean: `git status`
- [ ] Backup audit report: `cp _artifacts/file-structure-audit.json _artifacts/file-structure-audit-$(date +%Y%m%d).json`

### During Move (Batch 1):

- [ ] Create target directory: `mkdir -p lib/finance`
- [ ] Move files with git mv (preserves history)
- [ ] Update imports: `grep -r "from 'services/paytabs'" --include="*.ts" --include="*.tsx"`
- [ ] Replace imports: Use VS Code find/replace across workspace
- [ ] Run typecheck: `pnpm typecheck`
- [ ] Run build: `pnpm build`

### Post-Move:

- [ ] Manual smoke test (finance pages)
- [ ] Commit: `git commit -m "refactor(finance): Move payment services to lib/finance"`
- [ ] Push: `git push origin main`

---

## Rollback Plan

If issues arise:

```bash
# Immediately revert
git revert HEAD

# Or reset (if not pushed)
git reset --hard HEAD~1
```

---

## Phase 2 (After Batch 1-2 Success)

Review remaining "misplaced" files manually. Most are FALSE POSITIVES:

- Config files in root (correct)
- Shared types (correct)
- Cross-domain utilities (correct)
- Framework conventions (correct)

Focus future efforts on:

1. Removing TRUE duplicates (none found in current audit)
2. Consolidating scattered domain components
3. Creating domain-specific subdirectories within existing structure

---

## Recommendation

**START HERE**: Execute Batch 1 (Finance Services) NOW. It's:

- Low risk (isolated)
- High value (removes services/ clutter)
- Easy to test (finance flows)
- Easy to rollback (2 files only)

**SKIP**: Large-scale moves suggested by audit. They are FALSE POSITIVES and will break the build.
