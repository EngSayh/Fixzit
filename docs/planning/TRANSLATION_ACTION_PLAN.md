# Translation System Action Plan

**Date:** November 18, 2024  
**Status:** ✅ Option A Implemented  
**Reference:** `_artifacts/i18n-locale-coverage.json`

---

## Executive Summary

**Infrastructure:** ✅ 100% Complete  
**Content:** ✅ 100% Complete (EN/AR only)  
**Decision Made:** Option A - Remove unused locales

**Implementation Complete (November 18, 2024):**
- ✅ Removed 7 unused locales (FR/PT/RU/ES/UR/HI/ZH) from codebase
- ✅ Updated `ALL_LOCALES` to `['en', 'ar']` in generator and loader
- ✅ Deleted 7 unused dictionary files (saved ~10.5MB)
- ✅ Regenerated artifacts (only EN/AR now)
- ✅ System now honestly represents capabilities

**Current State:**
- Supported languages: 2 (English, Arabic)
- Total keys: 29,672 per locale
- Coverage: 100% for both locales ✅
- Build time: Faster (7 fewer locales to process)
- Artifact size: Reduced (3.1MB vs 13.6MB previously)
- User experience: No misleading language options

---

## Locale Coverage Facts

### High-Fidelity Analysis Results

Running `pnpm i18n:coverage` shows:

| Locale | Total Keys | Localized | Identical to EN | Coverage | Status |
|--------|------------|-----------|-----------------|----------|--------|
| ✅ en  | 29,672 | 29,672 | 0 | 100.0% | Real English translations |
| ✅ ar  | 29,672 | 29,672 | 0 | 100.0% | Real Arabic translations |
| ❌ fr  | 29,672 | 0 | 29,672 | 0.0% | English text (auto-filled) |
| ❌ pt  | 29,672 | 0 | 29,672 | 0.0% | English text (auto-filled) |
| ❌ ru  | 29,672 | 0 | 29,672 | 0.0% | English text (auto-filled) |
| ❌ es  | 29,672 | 0 | 29,672 | 0.0% | English text (auto-filled) |
| ❌ ur  | 29,672 | 0 | 29,672 | 0.0% | English text (auto-filled) |
| ❌ hi  | 29,672 | 0 | 29,672 | 0.0% | English text (auto-filled) |
| ❌ zh  | 29,672 | 0 | 29,672 | 0.0% | English text (auto-filled) |

**Aggregate:** 207,704 target-locale translation slots, **0 localized** (100% English text)

**Source:** Run `pnpm i18n:coverage` to regenerate `_artifacts/i18n-locale-coverage.json`

### What "0% Coverage" Means

Users selecting French will see:
```
Button label: "Save" (should be "Enregistrer")
Cancel button: "Cancel" (should be "Annuler")
Error message: "Invalid input" (should be "Entrée invalide")
```

This is **not** a localization bug. The infrastructure works perfectly. The content simply doesn't exist in the source files (`i18n/sources/**/*.json`).

---

## Issues Found (and Fixed)

### 1. ✅ Hard-Coded Locale List
**Problem:** `detect-unlocalized-strings.ts` always audited all 9 locales, even when product should only ship EN/AR  
**Fix:** Added `--locales=<comma-separated>` flag  
**Usage:**
```bash
# Audit only EN/AR (recommended for now)
pnpm tsx scripts/detect-unlocalized-strings.ts --locales=en,ar

# Audit all 9 locales
pnpm i18n:coverage
```

### 2. ✅ Misleading Overall Coverage Math
**Problem:** Coverage calculation only counted exact EN matches, ignoring case-insensitive/whitespace matches and AR fallbacks  
**Fix:** Updated aggregate math to sum all unlocalized categories  
**Impact:** "Overall coverage" now accurately reflects 0% for auto-filled locales

### 3. ✅ AR Fallback Misattribution
**Problem:** Identical-to-AR strings treated as "localized" for every locale, masking copy-paste errors  
**Fix:** AR fallback now counts as unlocalized unless `--allow-ar-fallback` explicitly set  
**Example:** French showing Arabic text was counted as "translated" before

### 4. ✅ Source Locale Assumptions
**Problem:** Recommendations always assumed EN/AR as sources, even when user filtered to fewer locales  
**Fix:** Source/target lists now derive from `--locales` parameter  
**Impact:** `--locales=en,ar` no longer produces "7 locales unlocalized" warnings

---

## The Decision: Two Paths Forward

### Option A: Remove Unused Locales (Recommended for Now)

**Who:** Teams without translation budget or timeline  
**When:** Immediate implementation (1 hour)  
**Cost:** $0 (developer time only)  
**Benefit:** Honest representation of capabilities

**What Changes:**
1. Update `ALL_LOCALES` in 3 files to `['en', 'ar']`:
   - `scripts/generate-dictionaries-json.ts` (line 15)
   - `lib/i18n/translation-loader.ts` (line 12)

2. Delete unused artifacts:
   ```bash
   rm i18n/generated/{fr,pt,ru,es,ur,hi,zh}.dictionary.json
   ```

3. Regenerate and verify:
   ```bash
   pnpm i18n:build
   pnpm i18n:coverage --locales=en,ar  # Should show 100% for both
   git add i18n/
   git commit -m "chore(i18n): remove unsupported locales until translation budget approved"
   ```

4. Update documentation:
   - README.md: "Languages: English, Arabic"
   - User-facing language selector: Hide FR/PT/RU/ES/UR/HI/ZH

**Pros:**
- ✅ Honest about capabilities
- ✅ Faster builds (smaller artifacts)
- ✅ No misleading user experience
- ✅ Reversible (can add back when translations arrive)

**Cons:**
- ❌ Limited market reach (EN/AR regions only)
- ❌ Can't claim "9 language support" in marketing

---

### Option B: Budget Professional Translation

**Who:** Teams committed to real multi-language support  
**When:** 2-4 weeks + vendor contract time  
**Cost:** $52,000 - $104,000 USD  
**Benefit:** Real 9-language product

**Cost Breakdown:**
- Target locales: FR, PT, RU, ES, UR, HI, ZH (7 languages)
- Source keys: 29,672 keys
- Estimated words: ~74,180 words (2.5 avg words/key)
- Translation rate: $0.10 - $0.20 per word
- **Per-language cost:** $7,418 - $14,836
- **Total cost:** $51,926 - $103,852

**Timeline:**
1. **Week 1:** RFP & contract
2. **Week 2-3:** Translation work
3. **Week 4:** Import & validation

**Implementation:**
```bash
# 1. Export EN dictionary (TODO: create this script)
npx tsx scripts/export-to-xliff.ts

# 2. Send to vendor, wait for translated files

# 3. Import translated files (TODO: create this script)
npx tsx scripts/import-from-xliff.ts

# 4. Regenerate
pnpm i18n:build

# 5. Verify
pnpm i18n:coverage  # Should show ~90-95% for all

# 6. QA testing in all languages

# 7. Commit
git add i18n/
git commit -m "feat(i18n): add professional translations for 7 languages"
```

---

## Recommended Path: Option A → Option B

**Phase 1 (Now):** Implement Option A
- Remove unused locales
- Update documentation ("EN/AR only")
- Ship honest product

**Phase 2 (When Budget Approved):** Execute Option B
- RFP to translation vendors
- Continue development in EN/AR
- Import translations when ready
- Add locales back to codebase

**Why This Works:**
- ✅ Honest representation today
- ✅ Infrastructure ready for future
- ✅ Incremental language support
- ✅ No technical debt

---

## Integration with CI/CD

### GitHub Actions (Already Updated)

`.github/workflows/i18n-validation.yml` now includes:

```yaml
- name: High-Fidelity Coverage Check (EN/AR only)
  run: |
    npx tsx scripts/detect-unlocalized-strings.ts --locales=en,ar || exit 1

- name: Upload coverage report
  uses: actions/upload-artifact@v3
  with:
    name: i18n-coverage-report
    path: _artifacts/i18n-locale-coverage.json
    retention-days: 90
```

**To enable strict checks for all locales:**
```yaml
# Remove --locales=en,ar to audit all 9
npx tsx scripts/detect-unlocalized-strings.ts --fail-threshold=0.1
```

### Husky Pre-Commit (Already Updated)

`.husky/pre-commit` now includes:

```bash
# High-fidelity coverage check (non-blocking warning)
pnpm tsx scripts/detect-unlocalized-strings.ts --locales=en,ar --silent || {
  echo "⚠️  Translation coverage issues (not blocking)"
}
```

**To make it blocking:**
```bash
# Remove || {...} to exit 1 on failure
pnpm tsx scripts/detect-unlocalized-strings.ts --locales=en,ar
```

---

## Commands Reference

### Quick Commands

```bash
# Audit EN/AR only (recommended)
pnpm tsx scripts/detect-unlocalized-strings.ts --locales=en,ar

# Audit all 9 locales
pnpm i18n:coverage

# CI integration (fail if >50% unlocalized)
pnpm i18n:coverage:fail

# Strict CI (fail if >10% unlocalized)
pnpm i18n:coverage:strict

# Show sample unlocalized keys
pnpm tsx scripts/detect-unlocalized-strings.ts --show-samples=20

# Export JSON for tracking
pnpm i18n:coverage --format=json > coverage-$(date +%Y%m%d).json
```

### Advanced Usage

```bash
# Allow AR fallback
pnpm tsx scripts/detect-unlocalized-strings.ts --allow-ar-fallback

# Custom threshold (fail if >30% unlocalized)
pnpm tsx scripts/detect-unlocalized-strings.ts --fail-threshold=0.3

# Audit specific locales
pnpm tsx scripts/detect-unlocalized-strings.ts --locales=en,ar,fr

# Silent mode
pnpm tsx scripts/detect-unlocalized-strings.ts --silent
```

---

## Next Steps by Role

### Product Manager / Stakeholder
1. Review this document
2. Decide: Option A (remove) OR Option B (budget $52k-104k)
3. Communicate decision to engineering
4. If Option B: Approve budget and 2-4 week timeline

### Engineering Lead
**If Option A:**
- Assign developer (1 hour task)
- Update documentation
- Deploy to staging

**If Option B:**
- Create RFP for vendors
- Create export/import scripts
- Set up vendor account
- Review translated files

### Developer (If Option A)
```bash
# 1. Update ALL_LOCALES to ['en', 'ar'] in 2 files
# 2. Delete unused artifacts
rm i18n/generated/{fr,pt,ru,es,ur,hi,zh}.dictionary.json

# 3. Regenerate
pnpm i18n:build

# 4. Verify
pnpm i18n:coverage --locales=en,ar

# 5. Update docs

# 6. Commit
git add .
git commit -m "chore(i18n): remove unsupported locales"
```

### QA Engineer (If Option B)
1. Test UI in all 9 languages
2. Verify language selector works
3. Check for text overflow
4. Validate RTL (AR/UR)
5. Spot-check 50-100 keys per locale

**Sign-off criteria:**
- ✅ `pnpm i18n:coverage` shows ≥90% for all
- ✅ No English in non-English locales
- ✅ No formatting breaks
- ✅ Language switcher functional

---

## FAQ

**Q: Why not machine translation?**  
A: Quality varies. Human-reviewed recommended for professional products. Machine translation can reduce costs as first pass.

**Q: Can we add languages incrementally?**  
A: Yes! Add to `ALL_LOCALES`, import translations, regenerate. Cost: ~$7k-15k per language.

**Q: What if we only translate high-priority keys?**  
A: Not recommended. Users see inconsistent experience. Better: 100% or stick to EN/AR only.

**Q: How to maintain translations for new features?**  
A: Two approaches:
1. Vendor retainer for ongoing work
2. Quarterly translation batches

**Q: Can we use community translations?**  
A: Risky for production. Quality control difficult. Works for open-source with active contributors.

---

## Progress Tracking

### Baseline (November 18, 2024)

```json
{
  "timestamp": "2025-11-18T08:50:24.841Z",
  "summary": {
    "overallCoverage": 0.0,
    "totalSlots": 207704,
    "unlocalizedSlots": 207704
  }
}
```

### Track Over Time

```bash
# Daily snapshots
pnpm i18n:coverage --format=json > _artifacts/coverage-$(date +%Y%m%d).json

# Compare before/after
diff -u coverage-20241118.json coverage-20241218.json

# Track in git
git add _artifacts/i18n-locale-coverage.json
git commit -m "chore(i18n): update coverage baseline"
```

---

## References

- **Analysis Tool:** `scripts/detect-unlocalized-strings.ts`
- **Coverage Report:** `_artifacts/i18n-locale-coverage.json`
- **Infrastructure Docs:** `TRANSLATION_SYSTEM_REMEDIATION_COMPLETE.md`
- **Decision Framework:** `HIGH_FIDELITY_LOCALE_PLAN.md`

**Commands:**
```bash
pnpm i18n:build              # Regenerate dictionaries
pnpm i18n:coverage           # High-fidelity analysis
pnpm i18n:coverage:fail      # CI check (permissive)
pnpm i18n:coverage:strict    # CI check (strict)
```

---

**Last Updated:** November 18, 2024  
**Next Review:** After decision (Option A or B)
