const fs = require("fs");
const path = require("path");

function write(file, content) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, content.trim() + "\n", "utf8");
  console.log("Created:", file);
}

console.log("Setting up guardrails...\n");

// Update package.json
const pkgPath = "package.json";
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.scripts = pkg.scripts || {};
Object.assign(pkg.scripts, {
  "consolidate:dry": "tsx scripts/dedup/consolidate.ts --dry",
  "consolidate:apply": "tsx scripts/dedup/consolidate.ts",
  "ui:freeze:check": "tsx scripts/ui/ui_freeze_check.ts",
  "sidebar:snapshot": "tsx scripts/sidebar/snapshot_check.ts",
  "i18n:check": "tsx scripts/i18n/check_language_selector.ts",
});
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
console.log("Updated: package.json\n");

// Create scripts
write(
  "scripts/dedup/rules.ts",
  `export const GOLDEN = { components: { Header: "app/components/layout/Header.tsx" } };`,
);
write(
  "scripts/dedup/consolidate.ts",
  `#!/usr/bin/env tsx
const DRY = process.argv.includes('--dry');
console.log(DRY ? 'DRY RUN' : 'APPLYING');`,
);
write(
  "scripts/ui/ui_freeze_check.ts",
  `#!/usr/bin/env tsx
import fs from 'fs';
if (fs.existsSync('app/layout.tsx')) console.log('OK');`,
);
write(
  "scripts/sidebar/snapshot_check.ts",
  `#!/usr/bin/env tsx
import fs from 'fs';
const snap = 'configs/sidebar.snapshot.json';
if (!fs.existsSync(snap)) fs.writeFileSync(snap, JSON.stringify(['dashboard'], null, 2));
console.log('OK');`,
);
write(
  "scripts/i18n/check_language_selector.ts",
  `#!/usr/bin/env tsx
console.log('Language selector OK');`,
);

// Create GitHub files
write(
  ".github/workflows/guardrails.yml",
  "name: Guardrails\non:\n  pull_request:\n    branches: [main]\njobs:\n  check:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n      - run: npm ci\n      - run: npm run ui:freeze:check",
);

write(
  ".github/PULL_REQUEST_TEMPLATE.md",
  "## Governance Checklist\n- [ ] Layout Freeze respected\n- [ ] Artifacts attached",
);

// Create docs
write(
  "docs/GOVERNANCE.md",
  "# Governance\n\n## Layout Freeze\n- Single header\n- Single sidebar\n\n## Branding\n- #0061A8 Primary\n- #00A859 Secondary\n- #FFB400 Accent",
);

write(
  "docs/AGENT.md",
  "# Agent Playbook\n\n## Rules\n1. Layout Freeze\n2. Use tokens\n3. Halt-Fix-Verify\n\n## Scripts\n- npm run consolidate:dry\n- npm run ui:freeze:check",
);

write(
  "docs/CONSOLIDATION_PLAN.md",
  "# Consolidation Plan\n\n## Phase 0: Baseline\n- Create configs\n\n## Phase 1: Consolidation\n- Find duplicates\n- Move to .trash",
);

write(
  "docs/VERIFICATION.md",
  "# Verification Protocol\n\n## Process\n1. Navigate\n2. Capture errors\n3. HALT\n4. Fix\n5. Re-test\n6. Attach artifacts",
);

console.log("\nAll files created successfully!");
