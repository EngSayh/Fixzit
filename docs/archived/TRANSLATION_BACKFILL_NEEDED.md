# Translation Backfill Required - Action Plan

**Date:** November 18, 2025  
**Priority:** Medium (blocks perfect parity)  
**Estimated Effort:** 2-3 hours for translator

---

## Summary

The parity checker has identified **606 missing English translations** across 28 domains. These are legitimate Arabic translations that need English equivalents added to achieve 100% parity.

### Current State

- ✅ Arabic: 29,671 keys (100%)
- ⚠️ English: 29,065 keys (97.96% coverage)
- 📊 Gap: **606 keys need English translation**

---

## Domains Requiring English Translations

### Critical (0 EN keys - Complete domains missing)

These domains have **complete Arabic translations but zero English translations**:

| Domain                        | AR Keys | Missing EN | Priority |
| ----------------------------- | ------- | ---------- | -------- |
| `dataGovernanceFramework`     | 27      | 27         | High     |
| `productLifecycleManagement`  | 27      | 27         | High     |
| `projectManagement`           | 27      | 27         | High     |
| `accessibilityAdv`            | 22      | 22         | Medium   |
| `burnoutPrevention`           | 22      | 22         | Medium   |
| `collaborationTools`          | 22      | 22         | Medium   |
| `digitalAssetManagement`      | 22      | 22         | Medium   |
| `employeeAssistanceProgram`   | 22      | 22         | Medium   |
| `employeeResourceGroups`      | 22      | 22         | Medium   |
| `enterpriseContentManagement` | 22      | 22         | Medium   |
| `hybridWork`                  | 22      | 22         | Medium   |
| `incidentResponseExt`         | 22      | 22         | Medium   |
| `inclusiveWorkplace`          | 22      | 22         | Medium   |
| `mentalHealthSupport`         | 22      | 22         | Medium   |
| `organizationalHealth`        | 22      | 22         | Medium   |
| `projectCollaboration`        | 22      | 22         | Medium   |
| `stressManagementAdv`         | 22      | 22         | Medium   |
| `teamProductivity`            | 22      | 22         | Medium   |
| `workLifeBalance`             | 22      | 22         | Medium   |
| `workplaceFlexibility`        | 22      | 22         | Medium   |

**Subtotal:** 20 domains, **462 keys**

---

### Major (≥5 keys missing)

| Domain                  | EN Keys | AR Keys | Missing | Priority |
| ----------------------- | ------- | ------- | ------- | -------- |
| `nav`                   | 26      | 74      | 48      | High     |
| `payments`              | 18      | 66      | 48      | High     |
| `rfq`                   | 11      | 30      | 19      | Medium   |
| `workOrder`             | 28      | 43      | 15      | Medium   |
| `preventiveMaintenance` | 27      | 40      | 13      | Medium   |

**Subtotal:** 5 domains, **143 keys**

---

### Minor (<5 keys missing)

| Domain               | EN Keys | AR Keys | Missing | Priority |
| -------------------- | ------- | ------- | ------- | -------- |
| `compliance`         | 104     | 105     | 1       | Low      |
| `marketplace`        | 201     | 202     | 1       | Low      |
| `recruitmentSystems` | 0       | 1       | 1       | Low      |

**Subtotal:** 3 domains, **3 keys**

---

## Sample Missing Keys

### Example: `dataGovernanceFramework` (27 keys)

```json
{
  "en": {
    "dataGovernanceFramework.title": "Data Governance Framework",
    "dataGovernanceFramework.description": "Comprehensive data governance system",
    "dataGovernanceFramework.dataStrategy": "Data Strategy",
    "dataGovernanceFramework.dataPolicy": "Data Policy",
    "dataGovernanceFramework.dataOwnership": "Data Ownership",
    "dataGovernanceFramework.dataStewardship": "Data Stewardship",
    "dataGovernanceFramework.dataQuality": "Data Quality",
    "dataGovernanceFramework.dataPrivacy": "Data Privacy",
    "dataGovernanceFramework.dataSecurity": "Data Security",
    "dataGovernanceFramework.accessControl": "Access Control",
    "dataGovernanceFramework.dataClassification": "Data Classification",
    "dataGovernanceFramework.dataRetention": "Data Retention",
    "dataGovernanceFramework.dataArchiving": "Data Archiving",
    "dataGovernanceFramework.dataDisposal": "Data Disposal",
    "dataGovernanceFramework.dataCatalog": "Data Catalog",
    "dataGovernanceFramework.dataLineage": "Data Lineage",
    "dataGovernanceFramework.metadataManagement": "Metadata Management",
    "dataGovernanceFramework.masterDataManagement": "Master Data Management",
    "dataGovernanceFramework.referenceData": "Reference Data",
    "dataGovernanceFramework.dataStandards": "Data Standards",
    "dataGovernanceFramework.dataGlossary": "Data Glossary",
    "dataGovernanceFramework.dataProfiling": "Data Profiling",
    "dataGovernanceFramework.dataValidation": "Data Validation",
    "dataGovernanceFramework.dataCleansing": "Data Cleansing",
    "dataGovernanceFramework.dataEnrichment": "Data Enrichment",
    "dataGovernanceFramework.dataStandardization": "Data Standardization",
    "dataGovernanceFramework.complianceMonitoring": "Compliance Monitoring"
  }
}
```

### Example: `nav` (48 missing keys - sample)

```json
{
  "en": {
    "nav.adminMenu.assets": "Assets",
    "nav.adminMenu.doa": "Delegation of Authority",
    "nav.adminMenu.facilitiesFleet": "Facilities Fleet",
    "nav.adminMenu.finance": "Finance",
    "nav.adminMenu.hrManagement": "HR Management",
    "nav.adminMenu.inventory": "Inventory",
    "nav.adminMenu.maintenanceSchedule": "Maintenance Schedule",
    "nav.adminMenu.organizationChart": "Organization Chart",
    "nav.adminMenu.propertyManagement": "Property Management",
    "nav.adminMenu.purchaseOrders": "Purchase Orders"
  }
}
```

---

## Translation Workflow

### Step 1: Check Detailed Keys

```bash
# See all missing keys for a specific domain
npx tsx scripts/check-translation-parity.ts --domain=dataGovernanceFramework

# Check another domain
npx tsx scripts/check-translation-parity.ts --domain=nav
```

### Step 2: Get Arabic Translations for Reference

```bash
# View the Arabic file to understand context
cat i18n/sources/dataGovernanceFramework.translations.json
```

### Step 3: Add English Translations

Edit the domain file in `i18n/sources/`:

```bash
# Example
vim i18n/sources/dataGovernanceFramework.translations.json
```

Add English keys matching the Arabic structure:

```json
{
  "en": {
    "dataGovernanceFramework.title": "Data Governance Framework",
    "dataGovernanceFramework.description": "Comprehensive data governance system",
    ...
  },
  "ar": {
    "dataGovernanceFramework.title": "إطار حوكمة البيانات",
    "dataGovernanceFramework.description": "نظام شامل لحوكمة البيانات",
    ...
  }
}
```

### Step 4: Rebuild & Verify

```bash
# Regenerate dictionaries
pnpm i18n:build

# Verify parity
npx tsx scripts/check-translation-parity.ts

# Check specific domain improved
npx tsx scripts/check-translation-parity.ts --domain=dataGovernanceFramework
```

### Step 5: Commit Changes

```bash
git add i18n/sources/*.translations.json
git add i18n/generated/*.json
git commit -m "feat(i18n): Add missing English translations for 20 domains"
```

---

## Batch Translation Helper Script

Create `scripts/add-missing-en-keys.ts` for bulk processing:

```typescript
import * as fs from "fs";
import * as path from "path";

const SOURCES_DIR = path.join(__dirname, "../i18n/sources");

// Domains needing complete English translations
const ZERO_EN_DOMAINS = [
  "dataGovernanceFramework",
  "productLifecycleManagement",
  "projectManagement",
  "accessibilityAdv",
  "burnoutPrevention",
  // ... add all 20 domains
];

for (const domain of ZERO_EN_DOMAINS) {
  const filePath = path.join(SOURCES_DIR, `${domain}.translations.json`);
  const bundle = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  // Copy Arabic keys to English with placeholder text
  bundle.en = {};
  for (const key of Object.keys(bundle.ar)) {
    const lastSegment = key.split(".").pop() || key;
    // Convert camelCase to Title Case
    const placeholder = lastSegment
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
    bundle.en[key] = `[TODO: Translate] ${placeholder}`;
  }

  fs.writeFileSync(filePath, JSON.stringify(bundle, null, 2), "utf-8");
  console.log(
    `✓ Created placeholders for ${domain} (${Object.keys(bundle.ar).length} keys)`,
  );
}

console.log(
  "\n✅ Placeholders created. Now replace [TODO: Translate] with actual translations.",
);
```

**Usage:**

```bash
npx tsx scripts/add-missing-en-keys.ts
# Then search for "[TODO: Translate]" and replace with real translations
```

---

## Priority Recommendations

### Phase 1: High Priority (96 keys - 2-3 hours)

1. **nav** (48 keys) - Navigation is visible to all users
2. **payments** (48 keys) - Critical business function

### Phase 2: Medium Priority (462 keys - 1-2 days)

3. Complete the 20 domains with 0 EN keys (HR, governance, collaboration features)

### Phase 3: Low Priority (48 keys - 1 hour)

4. Fill remaining partial domains (rfq, workOrder, preventiveMaintenance)

---

## Quality Checklist

Before marking complete:

- [ ] All 606 keys translated to English
- [ ] No placeholder text remaining
- [ ] Context matches Arabic meaning
- [ ] Consistent terminology across domains
- [ ] `pnpm i18n:build` runs successfully
- [ ] `npx tsx scripts/check-translation-parity.ts` shows 0 issues
- [ ] `pnpm tsc --noEmit` passes
- [ ] CI workflow passes

---

## Expected Outcome

**After completion:**

```
📊 OVERALL STATISTICS
   Total English keys:     29,671
   Total Arabic keys:      29,671
   Overall difference:     0 keys
   Coverage:               100.00%

🎯 DOMAIN PARITY BREAKDOWN
   ✅ Perfect parity:      1,168 domains (100%)
   ⚠️  Minor drift (<5):   0 domains (0%)
   ❌ Major drift (≥5):    0 domains (0%)

✅ All domains have perfect parity!
```

---

## Contact

For questions or assistance with translations:

- **Slack:** #translations or #engineering
- **Translation Memory:** Check existing similar keys for consistency
- **Glossary:** Refer to company terminology guide
- **AI Assistant:** Can suggest translations but requires human review

---

**Status:** 📋 **Action Required**  
**Assigned To:** Translation Team  
**Due Date:** TBD  
**Tracking:** Create Jira ticket or GitHub issue
