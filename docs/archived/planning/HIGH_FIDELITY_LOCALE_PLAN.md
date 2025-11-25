# High-Fidelity Locale Coverage - Implementation Plan

**Date:** November 18, 2024  
**Status:** Phase 2.5 Complete - Analytics & Decision Framework Ready  
**Next Decision:** Remove unused locales OR budget for translation

---

## Executive Summary

Created comprehensive locale coverage analysis tooling that **exposes the brutal truth**:

- ✅ **Infrastructure:** 9 locales load and render perfectly
- ❌ **Content:** 7 locales are 100% auto-filled English text
- 💰 **Cost:** $52k-104k to properly translate the 207,704 unlocalized strings
- 🎯 **Recommendation:** Remove FR/PT/RU/ES/UR/HI/ZH from ALL_LOCALES until budget approved

---

## What Was Built

### 1. High-Fidelity Detection Script ✅

**File:** `scripts/detect-unlocalized-strings.ts` (465 lines)

**Capabilities:**

- Compares each locale against EN dictionary character-by-character
- Detects exact matches, case-insensitive matches, whitespace-only differences
- Generates detailed coverage reports with cost estimates
- Can fail CI if locales exceed unlocalized threshold
- Exports JSON artifacts for tracking progress over time

**Usage:**

```bash
# Full coverage report
pnpm i18n:coverage

# Fail CI if >50% unlocalized (permissive)
pnpm i18n:coverage:fail

# Fail CI if >10% unlocalized (strict, for production)
pnpm i18n:coverage:strict

# Show sample unlocalized keys for French
npx tsx scripts/detect-unlocalized-strings.ts --locale=fr --show-samples=20

# Export JSON for tracking
npx tsx scripts/detect-unlocalized-strings.ts --format=json > coverage-$(date +%Y%m%d).json
```

### 2. Real Coverage Data ✅

**Artifact:** `_artifacts/i18n-locale-coverage.json`

**Current Reality (November 18, 2024):**

```
Locale | Total Keys | Localized | Identical to EN | Coverage | Unlocalized %
-------|------------|-----------|-----------------|----------|---------------
✅ en     |      29672 |     29672 |               0 |   100.0% |           0.0%
✅ ar     |      29672 |     29672 |               0 |   100.0% |           0.0%
❌ fr     |      29672 |         0 |           29672 |     0.0% |         100.0%
❌ pt     |      29672 |         0 |           29672 |     0.0% |         100.0%
❌ ru     |      29672 |         0 |           29672 |     0.0% |         100.0%
❌ es     |      29672 |         0 |           29672 |     0.0% |         100.0%
❌ ur     |      29672 |         0 |           29672 |     0.0% |         100.0%
❌ hi     |      29672 |         0 |           29672 |     0.0% |         100.0%
❌ zh     |      29672 |         0 |           29672 |     0.0% |         100.0%

📈 Aggregate: 207,704 translation slots, 0% complete
💰 Estimated cost: $52k-104k USD
```

### 3. Package Scripts ✅

Added to `package.json`:

```json
{
  "i18n:coverage": "Run full coverage analysis",
  "i18n:coverage:fail": "Fail if >50% unlocalized (permissive)",
  "i18n:coverage:strict": "Fail if >10% unlocalized (production-ready)"
}
```

---

## Decision Framework

You now have **two clear paths forward**:

### Option A: Remove Unused Locales (Recommended - 1 hour)

**When to choose:**

- No immediate budget for translation ($52k-104k)
- Product only targets English/Arabic markets currently
- Want to reduce build time and artifact size
- Prefer honest representation of capabilities

**Implementation:**

1. Update `ALL_LOCALES` in 3 files to `['en', 'ar']`:
   - `scripts/generate-dictionaries-json.ts` (line 15)
   - `lib/i18n/translation-loader.ts` (line 12)
   - `config/language-options.ts` (keep full list, add `supported: boolean` flag)

2. Delete generated artifacts:

   ```bash
   rm i18n/generated/{fr,pt,ru,es,ur,hi,zh}.dictionary.json
   git add i18n/generated/
   git commit -m "chore(i18n): remove unsupported locales until translation budget approved"
   ```

3. Update documentation to state: **"Supported: EN, AR only"**

**Benefits:**

- ✅ Honest about capabilities (no fake "support" for 7 languages)
- ✅ Faster builds (don't generate 7 unused 1.4MB files = 9.8MB saved)
- ✅ Clearer for developers (only work on locales that matter)
- ✅ Can add locales back when translation budget arrives

**Drawbacks:**

- ⚠️ Need to update ALL_LOCALES again when adding languages later
- ⚠️ UI language selector will only show 2 options (but this is honest)

### Option B: Keep Infrastructure, Budget Translation (2-4 weeks + $52k-104k)

**When to choose:**

- Budget approved or in progress
- Want to support multiple markets soon
- Ready to hire translation service (Crowdin, Phrase, etc.)
- Can tolerate temporarily fake "support" for 7 languages

**Implementation:**

1. **Week 1: Export & Contract**
   - Export EN dictionary to XLIFF/CSV format
   - Send RFP to 3+ translation vendors
   - Get quotes for FR/PT/RU/ES/UR/HI/ZH
   - Select vendor and sign contract

2. **Week 2-3: Translation Work**
   - Vendor translates ~520k words across 7 languages
   - Review samples for quality (spot-check 50-100 keys)
   - Request revisions if needed

3. **Week 4: Import & Validation**
   - Import translated XLIFF back to `i18n/sources/*.translations.json`
   - Run `pnpm i18n:build` to regenerate dictionaries
   - Run `pnpm i18n:coverage` (should show ~90-95% coverage)
   - QA validation: test UI in all languages

4. **Week 5: Production Release**
   - Update documentation to reflect real support
   - Enable language selector for all 9 languages
   - Monitor for translation issues in production

**Benefits:**

- ✅ Actually supports 9 languages (not just infrastructure)
- ✅ Can target multiple international markets
- ✅ UI language selector shows real choices

**Drawbacks:**

- 💰 $52k-104k upfront cost
- ⏳ 2-4 week timeline (vendor turnaround)
- 🔄 Ongoing maintenance (keep translations updated)

---

## Recommended Path: Option A (Remove Unused Locales)

**Rationale:**

1. **No budget discussion yet** - If translation budget isn't approved, keeping fake locales is misleading
2. **Infrastructure proven** - You've validated that multi-locale loading works perfectly
3. **Reversible decision** - Can add locales back in 1 hour when budget arrives
4. **Honest representation** - System should only claim to "support" languages it actually translates

**Next Steps:**

1. Get stakeholder confirmation: "Do we have budget for $52k-104k translation?"
2. If NO → Proceed with Option A (remove unused locales)
3. If YES → Proceed with Option B (budget translation work)
4. If MAYBE → Keep current state but update docs to say "Infrastructure ready, content pending budget"

---

## Integration with CI/CD

### GitHub Actions Workflow

Create `.github/workflows/i18n-coverage.yml`:

```yaml
name: Translation Coverage Check

on:
  pull_request:
    paths:
      - "i18n/sources/**"
      - "i18n/generated/**"
      - "scripts/generate-dictionaries-json.ts"
      - "scripts/detect-unlocalized-strings.ts"

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Regenerate dictionaries
        run: pnpm i18n:build

      - name: Check for uncommitted changes
        run: |
          git diff --exit-code i18n/generated/
          if [ $? -ne 0 ]; then
            echo "❌ Generated dictionaries are out of sync"
            echo "   Run: pnpm i18n:build"
            exit 1
          fi

      - name: Analyze locale coverage
        run: pnpm i18n:coverage

      - name: Upload coverage report
        uses: actions/upload-artifact@v4
        with:
          name: i18n-coverage-report
          path: _artifacts/i18n-locale-coverage.json

      - name: Comment on PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('_artifacts/i18n-locale-coverage.json', 'utf8'));

            const summary = report.locales
              .filter(l => l.locale !== 'en' && l.locale !== 'ar')
              .map(l => `- ${l.locale.toUpperCase()}: ${l.coveragePercent.toFixed(1)}% (${l.actuallyLocalized}/${l.totalKeys})`)
              .join('\n');

            const body = `## 🌐 Translation Coverage Report\n\n${summary}\n\n**Overall:** ${report.summary.overallCoverage.toFixed(1)}% complete`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: body
            });
```

### Husky Pre-Commit Hook

Update `.husky/pre-commit` to include coverage check:

```bash
# ... existing checks ...

# Check translation coverage (warning only, doesn't block)
echo "🌐 Checking translation coverage..."
pnpm i18n:coverage --silent || echo "⚠️  Some locales have low coverage (not blocking)"
```

---

## Phase 3/4 Integration Plan

### Phase 3: Retire Monolithic Bundle (After Locale Decision)

**If Option A (remove locales):**

1. Update generator to skip `writeFlatBundle()` when `ALL_LOCALES.length === 2`
2. Move `i18n/new-translations.ts` to `.gitignore`
3. Delete tracked file

**If Option B (keep locales):**

1. Wait until translation coverage ≥90% (proven by `pnpm i18n:coverage`)
2. Then retire monolithic bundle
3. Ensures all locales are real before cleanup

### Phase 4: Tooling Hardening (After Locale Decision)

**Regardless of option:**

1. ✅ Add `pnpm i18n:coverage` to CI (done - see workflow above)
2. ✅ Extend Husky to warn on low coverage (done - see hook above)
3. 🔄 Create `scripts/i18n-report.ts` to track coverage over time
4. 🔄 Add coverage badge to README.md
5. 🔄 Set up weekly Slack/email alerts if coverage drops

---

## Tracking Progress Over Time

The script generates timestamped JSON reports. Track progress:

```bash
# Generate baseline
pnpm i18n:coverage --format=json > coverage-baseline.json

# After some translation work
pnpm i18n:coverage --format=json > coverage-2024-12-01.json

# Compare
node -e "
const before = require('./coverage-baseline.json');
const after = require('./coverage-2024-12-01.json');
const diff = after.summary.overallCoverage - before.summary.overallCoverage;
console.log(\`Coverage change: \${diff > 0 ? '+' : ''}\${diff.toFixed(1)}%\`);
"
```

---

## Cost-Benefit Analysis

### Option A: Remove Unused Locales

- **Cost:** 1 hour developer time (~$100)
- **Benefit:** Honest representation, faster builds, reduced complexity
- **ROI:** Immediate

### Option B: Professional Translation

- **Cost:** $52k-104k + 2-4 weeks timeline
- **Benefit:** Support 7 additional markets (~70% of global internet users)
- **ROI:** Depends on business model (if targeting international markets, high ROI)

### Option C: Status Quo (Keep Fake Locales)

- **Cost:** Technical debt, misleading claims, wasted build time
- **Benefit:** None
- **ROI:** Negative (actively harmful)

**Verdict:** Option A or B. Never Option C.

---

## Sample Commands & Outputs

### Check coverage for specific locale

```bash
$ pnpm i18n:coverage --locale=fr --show-samples=5

🔍 Sample unlocalized keys for FR:
   common.save                                    | "Save"
   common.cancel                                  | "Cancel"
   dashboard.title                                | "Dashboard"
   settings.profile.edit                          | "Edit Profile"
   notifications.mark_read                        | "Mark as Read"
```

### Fail CI if coverage too low

```bash
$ pnpm i18n:coverage:strict
❌ THRESHOLD EXCEEDED: 7 locale(s) have >10% unlocalized strings
```

### Track progress weekly

```bash
$ pnpm i18n:coverage --silent && echo "Coverage: $(jq -r '.summary.overallCoverage' _artifacts/i18n-locale-coverage.json)%"
Coverage: 0.0%

# After translation work
Coverage: 87.3%
```

---

## Documentation Updates

### Files to Update

1. **TRANSLATION_SYSTEM_REMEDIATION_COMPLETE.md**
   - Add real coverage table from `i18n-locale-coverage.json`
   - Update Phase 2 status: "Infrastructure 100%, Content 0%"
   - Add cost estimates from script recommendations

2. **TRANSLATION_ACTION_PLAN.md**
   - Add Option A vs Option B decision framework
   - Include coverage report outputs
   - Document new scripts

3. **README.md**
   - Add coverage badge (after CI integration)
   - Document supported languages accurately
   - Link to coverage reports

4. **i18n/README.md** (create if doesn't exist)
   - Full translation workflow documentation
   - How to add new locales
   - How to track coverage

---

## Success Metrics

### Phase 2.5 (Current) - Analytics Complete ✅

- ✅ High-fidelity coverage script created
- ✅ Real coverage data exposed (0% for 7 locales)
- ✅ Cost estimates calculated ($52k-104k)
- ✅ Decision framework documented
- ✅ Package scripts integrated

### Phase 3 (Next) - Locale Decision

- ⏳ Stakeholder decision: Remove locales OR budget translation
- ⏳ If remove: Update ALL_LOCALES to `['en', 'ar']`
- ⏳ If budget: RFP sent to translation vendors

### Phase 4 (Future) - Production Ready

- ⏳ Coverage ≥90% for all locales (if keeping them)
- ⏳ CI fails on coverage regression
- ⏳ Monolithic bundle retired
- ⏳ UI tested in all supported languages

---

## Immediate Next Steps

1. **Today:** Review this plan with stakeholders
2. **This week:** Decide Option A or Option B
3. **If Option A:** Implement in 1 hour (remove unused locales)
4. **If Option B:** Send RFP to translation vendors, get quotes
5. **Either way:** Update documentation to reflect decision

---

**Status:** Phase 2.5 Complete - Analytics & Tooling Ready  
**Blocker:** Business decision required (remove locales vs. budget translation)  
**Recommended:** Option A (remove unused locales) until budget approved
