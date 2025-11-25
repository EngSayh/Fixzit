# Translation System Documentation

**Supported Languages:** English (en), Arabic (ar)  
**Total Keys:** 29,672 per locale  
**Coverage:** 100% for both languages ✅

## Overview

Fixzit uses a **modular, build-time translation system** that separates source translations from runtime artifacts. This architecture keeps the IDE fast and scales to large translation datasets.

**Language Support:** The system currently supports **English and Arabic** with full right-to-left (RTL) support for Arabic. Additional languages (FR/PT/RU/ES/UR/HI/ZH) were removed on November 18, 2024 as they had 0% real translations. They can be re-added when translation budget is approved.

## Architecture

```
i18n/
├── sources/              # 📝 Modular source files (edit these)
│   ├── admin.translations.json
│   ├── dashboard.translations.json
│   ├── fm.translations.json
│   ├── marketplace.translations.json
│   └── ... (hundreds of domain files, auto-split by feature)
├── generated/            # ⚙️ Build artifacts (never edit directly)
│   ├── en.dictionary.json
│   └── ar.dictionary.json
├── dictionaries/         # 📚 Runtime shims (TypeScript loaders)
│   ├── en.ts
│   ├── ar.ts
│   └── types.ts
└── new-translations.ts   # 🗂️ Auto-generated flat bundle (do not edit)
```

## Workflow

### Adding New Translations

👉 **Single source of truth:** the `i18n/sources/*.translations.json` files. Running `pnpm run i18n:build` regenerates both the runtime dictionaries _and_ `i18n/new-translations.ts` from these modular files.

**Step 1: Choose the correct domain file**

Translations are organized by feature domain. Edit the appropriate file in `i18n/sources/`:

| Domain        | File                            | Purpose                                      |
| ------------- | ------------------------------- | -------------------------------------------- |
| `admin`       | `admin.translations.json`       | Admin panel, feature settings, notifications |
| `dashboard`   | `dashboard.translations.json`   | Main dashboard, widgets, analytics           |
| `fm`          | `fm.translations.json`          | Facilities management, properties, units     |
| `marketplace` | `marketplace.translations.json` | Product listings, orders, reviews            |
| `hr`          | `hr.translations.json`          | Human resources, attendance, payroll         |
| `careers`     | `careers.translations.json`     | Job applications, interviews                 |
| `finance`     | `finance.translations.json`     | Invoices, payments, accounting               |
| `workOrders`  | `workOrders.translations.json`  | Maintenance requests, PM schedules           |
| `properties`  | `properties.translations.json`  | Property details, inspections                |
| `souq`        | `souq.translations.json`        | Online store, e-commerce                     |
| `common`      | `common.translations.json`      | Shared UI elements                           |
| `sidebar`     | `sidebar.translations.json`     | Navigation sidebar                           |

**Step 2: Add translations to the JSON file**

Format:

```json
{
  "en": {
    "domain.section.key": "English text",
    "domain.section.anotherKey": "More English"
  },
  "ar": {
    "domain.section.key": "النص العربي",
    "domain.section.anotherKey": "المزيد من العربية"
  }
}
```

Example - adding work order status:

```json
{
  "en": {
    "workOrders.status.pending": "Pending Assignment",
    "workOrders.status.inProgress": "In Progress",
    "workOrders.status.completed": "Completed"
  },
  "ar": {
    "workOrders.status.pending": "في انتظار التعيين",
    "workOrders.status.inProgress": "قيد التنفيذ",
    "workOrders.status.completed": "مكتمل"
  }
}
```

**Step 3: Build the dictionaries + flat bundle**

```bash
pnpm run i18n:build
```

This merges all source files and generates:

- `i18n/generated/en.dictionary.json`
- `i18n/generated/ar.dictionary.json`
- `i18n/new-translations.ts` (used by `TranslationContext` on the client)

**Step 4: Verify TypeScript**

```bash
pnpm tsc --noEmit
```

**Step 5: Use in components**

```typescript
import { useTranslation } from '@/contexts/TranslationContext';

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('workOrders.status.pending', 'Pending Assignment')}</h1>
    </div>
  );
}
```

### Creating a New Domain

If you're building a new feature (e.g., "CRM"), create a new domain file:

```bash
# Create the file
touch i18n/sources/crm.translations.json
```

```json
{
  "en": {
    "crm.leads.title": "Leads Management",
    "crm.leads.addNew": "Add New Lead",
    "crm.leads.filters.status": "Filter by Status"
  },
  "ar": {
    "crm.leads.title": "إدارة العملاء المحتملين",
    "crm.leads.addNew": "إضافة عميل محتمل جديد",
    "crm.leads.filters.status": "تصفية حسب الحالة"
  }
}
```

Then run `npm run i18n:build` to include it.

## CI/CD Integration

### Pre-commit Hook

Automatically regenerates dictionaries when translation sources change:

```bash
# Installed via Husky
.husky/pre-commit
```

This hook:

1. Detects changes in `i18n/sources/*.json`
2. Runs `npm run i18n:build`
3. Adds generated files to the commit
4. Runs `pnpm tsc --noEmit` to catch errors

### GitHub Actions Workflow ⭐ ENHANCED

**Workflow:** `.github/workflows/i18n-validation.yml`

Now includes comprehensive validation:

#### Triggers

- ✅ Changes to `i18n/sources/**/*.json`
- ✅ Changes to `i18n/dictionaries/**/*.ts` (base dictionaries)
- ✅ Changes to any script in `scripts/` directory
- ✅ Manual workflow dispatch with parity check override

#### Validation Steps

**1. Source File Validation (Check Mode)**

```bash
npx tsx scripts/split-translations.ts --check
```

- Validates without writing files
- Checks for schema errors
- Reports parity issues
- Exits with error if validation fails

**2. Translation Parity Check**

```bash
npx tsx scripts/check-translation-parity.ts --format=text
```

- Analyzes all domain files
- Reports missing keys per domain
- Detects case-insensitive duplicates
- Generates JSON artifact on failure
- Skippable via `workflow_dispatch` input

**3. Build Dictionary Artifacts**

```bash
pnpm i18n:build
```

- Loads all modular sources
- Builds nested dictionaries
- Generates flat bundle
- Reports key counts

**4. Generated Artifacts Drift Detection**

```bash
git status --porcelain i18n/generated/
```

- Checks if generated files modified
- Ensures developers ran build locally
- Provides clear fix instructions
- Shows diff of changes

**5. Source Artifacts Drift Detection**

```bash
git status --porcelain i18n/sources/
```

- Detects if build modified sources
- Flags automatic formatting
- Warns about merge artifacts
- Requires manual review

**6. TypeScript Compilation**

```bash
pnpm tsc --noEmit
```

- Validates type safety
- Catches import errors
- Ensures shims work correctly

**7. Coverage Baseline Verification**

```bash
# Current baseline: 1149 EN, 1169 AR keys
EN_KEYS=$(jq 'keys | length' i18n/generated/en.dictionary.json)
AR_KEYS=$(jq 'keys | length' i18n/generated/ar.dictionary.json)
```

- Prevents accidental key deletion
- Tracks key count growth
- Allows difference but warns if > 50 keys
- Uses actual current state as baseline

**8. Artifact Upload on Failure**

```yaml
uses: actions/upload-artifact@v3
with:
  name: translation-parity-report
  path: parity-report.json
  retention-days: 30
```

- Saves detailed parity report
- Available for download from Actions tab
- 30-day retention for auditing

#### Performance Optimizations

**pnpm Store Caching:**

```yaml
- name: Get pnpm store directory
  run: echo "STORE_PATH=$(pnpm store path --silent)" >> $GITHUB_ENV

- name: Setup pnpm cache
  uses: actions/cache@v3
  with:
    path: ${{ env.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
```

- Reduces install time by 40-60%
- Persistent across workflow runs
- Invalidates on `pnpm-lock.yaml` changes

**Workflow Run Time:**

- Before: ~3-4 minutes
- After: ~1-2 minutes (with cache hit)

### Manual Workflow Dispatch

Run validation on-demand:

```bash
# Via GitHub UI
Actions → I18n Validation → Run workflow

# Options:
- skip_parity_check: true/false (for baseline updates)
```

**Use cases:**

- Testing validation changes
- Baseline updates after bulk translation
- Post-migration verification

## Performance Benefits

### Before (Monolithic)

- ❌ 2,523-line `new-translations.ts` loaded by TypeScript
- ❌ VS Code TypeScript server parses entire file
- ❌ Slow autocomplete and IntelliSense
- ❌ High memory usage

### After (Modular + Generated)

- ✅ 28 small JSON files (~90 lines each)
- ✅ TypeScript only sees type definitions
- ✅ Runtime loads pre-compiled JSON
- ✅ Fast IDE experience

## Best Practices

### ✅ DO

- Edit `.json` files in `i18n/sources/`
- Run `npm run i18n:build` before committing
- Use semantic key names: `domain.section.element.attribute`
- Keep domains focused on single features
- Provide fallback text in `t()` calls: `t('key', 'Fallback')`

### ❌ DON'T

- Edit `i18n/generated/*.json` directly (they're overwritten)
- Edit `i18n/new-translations.ts` (deprecated, will be removed)
- Create deeply nested keys (max 4 levels)
- Hardcode English strings in components
- Mix translation keys from different domains

## Migration from Legacy System

If you see imports like:

```typescript
import { newTranslations } from "@/i18n/new-translations";
```

Replace with:

```typescript
import { useTranslation } from "@/contexts/TranslationContext";

const { t } = useTranslation();
// Use t('key', 'fallback') instead of direct object access
```

## Future Enhancements

### Phase 1: ✅ Complete

- Modular sources by domain
- Automated build pipeline
- CI/CD validation

### Phase 2: Lazy Loading

```typescript
// Load only dashboard translations when needed
import { loadDomainTranslations } from "@/lib/i18n/loader";

async function DashboardPage() {
  const translations = await loadDomainTranslations("dashboard");
  // ...
}
```

### Phase 3: External Translation Service

- Integrate with Phrase, Lokalise, or Crowdin
- Translator UI for non-technical team members
- Version control for translation changes

### Phase 4: Per-Route Bundles

```javascript
// next.config.js
experimental: {
  i18n: {
    locales: ['en', 'ar'],
    defaultLocale: 'en',
    // Load only needed translations per route
    localeDetection: true,
    domains: [
      { domain: 'dashboard', locales: ['en-dashboard', 'ar-dashboard'] },
      { domain: 'marketplace', locales: ['en-marketplace', 'ar-marketplace'] },
    ]
  }
}
```

## Troubleshooting

### "Translation key not found"

1. Check if key exists in correct domain file
2. Run `npm run i18n:build`
3. Restart development server

### "TypeScript errors in new-translations.ts"

- This file is auto-generated via `pnpm run i18n:build`
- Do not edit it manually—fix the corresponding entry inside `i18n/sources/*.translations.json`
- Re-run `pnpm run i18n:build` to regenerate the bundle after editing the source file

### "Generated files out of sync"

```bash
# Regenerate all dictionaries + flat bundle
pnpm run i18n:build

# Verify
git status i18n/generated/
```

### "Pre-commit hook failing"

```bash
# Manually regenerate
npm run i18n:build

# Check TypeScript errors
pnpm tsc --noEmit

# Add generated files
git add i18n/generated/*.json
```

### "Parity check failing in CI"

**Scenario: Missing translations detected**

```bash
# Run parity check locally
npx tsx scripts/check-translation-parity.ts

# Check specific domain
npx tsx scripts/check-translation-parity.ts --domain=marketplace

# Output shows missing keys:
❌ Missing in Arabic (7 keys):
   - marketplace.product.shipping.express
   - marketplace.product.shipping.standard
   ...
```

**Fix:**

1. Add missing keys to appropriate domain file
2. Run `pnpm i18n:build`
3. Verify: `npx tsx scripts/check-translation-parity.ts`
4. Commit changes

**Scenario: Baseline drift (key count dropped)**

```bash
# CI output:
❌ English key count dropped below baseline (1149)
   Current: 1147, Expected: >= 1149
```

**Investigate:**

```bash
# Check git diff
git diff HEAD~1 i18n/sources/

# Find deleted keys
git log -p --all -S 'deleted.key.name' -- i18n/sources/
```

**Fix:**

- If intentional deletion: Update baseline in CI workflow
- If accidental: Restore keys from git history

**Scenario: Domain file validation errors**

```bash
# Error output:
❌ VALIDATION ERRORS (3 total):
  marketplace/product.price: Non-string value in en (type: number)
  admin/settings.debug: Empty string in ar
```

**Fix:**

```json
// Before (invalid)
{
  "en": {
    "product.price": 99.99,  // ❌ Number
    "settings.debug": ""     // ❌ Empty
  }
}

// After (valid)
{
  "en": {
    "product.price": "99.99",  // ✅ String
    "settings.debug": "Debug Mode"  // ✅ Not empty
  }
}
```

### "Data loss detected during flatten"

```bash
# Output:
⚠️  DATA LOSS DETECTED:
    - Lost 5 English keys during grouping/merge
```

**Investigate:**

```bash
# Check backup files
ls -lh i18n/dictionaries/backup/

# Compare original vs flattened
git diff i18n/sources/
```

**Possible causes:**

- Duplicate keys with different casing
- Keys without proper domain prefix
- Merge conflicts overwriting values

**Recovery:**

```bash
# Restore from backup
cp i18n/dictionaries/backup/en.ts.backup.<timestamp> i18n/dictionaries/en.ts

# Re-run flatten with investigation
npx tsx scripts/flatten-base-dictionaries.ts 2>&1 | tee flatten.log

# Review warnings
grep "⚠️" flatten.log
```

### "Unsafe domain name detected"

```bash
# Warning:
⚠️  Unsafe domain name: "admin:settings" (contains illegal chars), using "common"
⚠️  Path traversal attempt: "../etc", using "common"
```

**Fix keys in source dictionaries:**

```json
// Before (invalid domain)
{
  "en": {
    "admin:settings.debug": "Debug",     // ❌ Colon not allowed
    "../etc.password": "Secret"          // ❌ Path traversal
  }
}

// After (valid domain)
{
  "en": {
    "admin.settings.debug": "Debug",     // ✅ Dot-separated
    "admin.password": "Secret"           // ✅ Safe path
  }
}
```

### "CI workflow timing out"

**Symptom:** Workflow exceeds 10-minute limit

**Causes:**

- pnpm cache miss (full install)
- Large number of domain files (1000+)
- Slow parity check

**Solutions:**

```yaml
# Increase timeout in workflow
jobs:
  validate-translations:
    timeout-minutes: 15  # Default is 10

# Skip parity check for rapid iteration
gh workflow run i18n-validation.yml -f skip_parity_check=true
```

### "Duplicate key warnings"

```bash
# Parity check output:
⚠️  CASE-INSENSITIVE DUPLICATE KEYS DETECTED
   marketplace: product.Name, product.name
```

**Impact:** Only one key will be used at runtime (platform-dependent)

**Fix:**

```json
// Before (duplicates)
{
  "en": {
    "product.Name": "Product Name",  // ❌
    "product.name": "Name"           // ❌
  }
}

// After (deduplicated)
{
  "en": {
    "product.name": "Product Name"   // ✅ Single canonical key
  }
}
```

## Scripts

| Script                                                      | Purpose                                                                          | Usage                          |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------ |
| `pnpm run i18n:build`                                       | Generate runtime dictionaries **and** `new-translations.ts` from modular sources | Run after editing source files |
| `npx tsx scripts/check-translation-parity.ts`               | ⭐ **NEW** - Analyze translation parity across locales                           | CI validation & diagnostics    |
| `npx tsx scripts/check-translation-parity.ts --domain=fm`   | Detailed analysis for specific domain                                            | Debug missing keys             |
| `npx tsx scripts/check-translation-parity.ts --format=json` | JSON output for CI consumption                                                   | Automated reporting            |
| `npx tsx scripts/split-translations.ts`                     | Split flat translations into modular sources                                     | Migration tool                 |
| `npx tsx scripts/split-translations.ts --check`             | Validate sources without writing                                                 | CI dry-run mode                |
| `npx tsx scripts/flatten-base-dictionaries.ts`              | Flatten monolithic TypeScript dictionaries                                       | One-time migration             |

## Validation & Quality Assurance

### Translation Parity Checker ⭐ NEW

The parity checker analyzes all translation files and reports:

- Per-domain key count mismatches
- Missing keys in each locale
- Case-insensitive duplicate detection
- Coverage statistics

**Run locally:**

```bash
npx tsx scripts/check-translation-parity.ts
```

**Sample Output:**

```
═══════════════════════════════════════════════════════════════════════
                    TRANSLATION PARITY REPORT
═══════════════════════════════════════════════════════════════════════

📅 Generated: 11/18/2025, 10:30:00 AM
📂 Analyzed: 1,168 domain files

📊 OVERALL STATISTICS

   Total English keys:     29,061
   Total Arabic keys:      29,667
   Overall difference:     -606 keys
   Coverage:               97.96%

🎯 DOMAIN PARITY BREAKDOWN

   ✅ Perfect parity:      982 domains (84.1%)
   ⚠️  Minor drift (<5):   143 domains (12.2%)
   ❌ Major drift (≥5):    43 domains (3.7%)

⚠️  DOMAINS WITH PARITY ISSUES

   Domain                                      EN      AR      Diff    Missing
   ─────────────────────────────────────────────────────────────────────────────
   ❌ marketplace                               201     202       -1  1 in EN
   ❌ fm.properties.inspection                  45      52       -7  7 in EN
   ⚠️  dashboard.analytics                      89      91       -2  2 in EN
```

**Check specific domain:**

```bash
npx tsx scripts/check-translation-parity.ts --domain=marketplace
```

**CI/JSON mode:**

```bash
npx tsx scripts/check-translation-parity.ts --format=json > parity-report.json
```

### Schema Validation

All scripts now validate translation values:

- ✅ **Type checking** - Only strings allowed (numbers/booleans coerced with warnings)
- ✅ **Empty value detection** - Flags empty strings
- ✅ **Domain sanitization** - Prevents path traversal, illegal characters
- ✅ **Duplicate detection** - Finds case-insensitive duplicates
- ✅ **Bundle integrity** - Validates JSON structure

**Built-in protections:**

```typescript
// ❌ Invalid - will fail validation
{
  "en": {
    "key": 123,              // Number - coerced to "123" with warning
    "other": true,           // Boolean - coerced to "true" with warning
    "empty": "",             // Empty - validation error
    "../etc/passwd": "hack"  // Path traversal - sanitized to "common"
  }
}

// ✅ Valid
{
  "en": {
    "key": "123",
    "other": "true",
    "valid": "Proper string value"
  }
}
```

### Data Loss Detection

`flatten-base-dictionaries.ts` now tracks data integrity:

```bash
npx tsx scripts/flatten-base-dictionaries.ts
```

**Output includes:**

```
📦 Flattening base dictionaries...

  English: 29,061 keys
  Arabic:  29,667 keys

⚠️  Schema Issues:
    - Coerced 3 numbers to strings
    - Coerced 1 boolean to strings
    - Dropped 0 non-string values

📝 Writing 1,168 domain files...
  [... domain list ...]

✅ Successfully flattened base dictionaries!
📂 Location: /path/to/i18n/sources
📊 Total: 29,061 en keys, 29,667 ar keys

⚠️  DATA LOSS DETECTED:
    - Lost 0 English keys during grouping/merge
    - Gained 0 English keys (duplicates or merge artifacts)

⚠️  TRANSLATION PARITY ISSUES (186 domains):

    Domain                                    EN      AR      Diff
    ══════════════════════════════════════════════════════════════
    marketplace                               201     202       -1
    fm.properties.inspection                  45      52       -7
    ... (top 20 shown)

    💡 Run: npx tsx scripts/check-translation-parity.ts for detailed report
```

### Merge Strategy & Backups

**Automatic backups:**

- Created BEFORE flattening (prevents data loss)
- Only backs up files > 1MB (huge dictionaries)
- Prunes old backups (keeps last 10)
- Timestamped for easy recovery

**Merge behavior:**

```bash
# Fresh keys override stale JSON
# Existing keys preserved if not in fresh data
# Logs warning when keys overridden
```

**Restore from backup:**

```bash
# List available backups
ls -lh i18n/dictionaries/backup/

# Restore specific backup
cp i18n/dictionaries/backup/en.ts.backup.1731901234567 i18n/dictionaries/en.ts
```

## Support

For questions or issues with the translation system:

1. Check this README
2. Review existing domain files for examples
3. Ask in #engineering Slack channel
4. Create GitHub issue with `[i18n]` tag
