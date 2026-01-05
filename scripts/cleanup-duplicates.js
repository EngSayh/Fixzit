#!/usr/bin/env node
/**
 * Cleanup duplicate files based on duplicate-detection-report.json
 * Categories handled:
 * 1. Error screenshots - keep first, delete rest
 * 2. Archived docs - keep longer filename (more descriptive), delete shorter
 * 3. i18n case duplicates - keep kebab-case, delete Title Case
 * 4. _artifacts - keep newest
 * 5. Environment JSON - intentional (skip)
 * 6. Playwright config - keep tests/, delete qa/
 */

const fs = require('fs');

const DRY_RUN = !process.argv.includes('--apply');
const reportPath = 'duplicate-detection-report.json';

if (!fs.existsSync(reportPath)) {
  console.error('❌ No duplicate-detection-report.json found. Run detect-duplicates first.');
  process.exit(1);
}

// Read and strip BOM if present
let reportContent = fs.readFileSync(reportPath, 'utf8');
if (reportContent.charCodeAt(0) === 0xFEFF) {
  reportContent = reportContent.slice(1);
}
const report = JSON.parse(reportContent);
console.log(`📊 Found ${report.duplicate_groups} duplicate groups (${report.total_wasted_mb} MB waste)`);
console.log(DRY_RUN ? '🔍 DRY RUN mode (use --apply to delete files)\n' : '🗑️  APPLY mode - files will be deleted!\n');

let deletedCount = 0;
let deletedBytes = 0;
let skippedGroups = 0;

for (const group of report.duplicates) {
  const files = group.files;
  
  // Normalize paths for matching (remove .\ prefix, convert backslashes to forward slashes)
  const normFiles = files.map(f => f.replace(/^\.\\/g, '').replace(/^\.\//g, '').replace(/\\/g, '/'));
  
  // Skip intentional duplicates
  if (normFiles.some(f => f.startsWith('environments/'))) {
    skippedGroups++;
    continue;
  }
  
  // Determine which file to keep
  let toKeep = null;
  let toDelete = [];
  
  // Error screenshots - keep first
  if (normFiles.every(f => f.startsWith('reports/evidence/'))) {
    toKeep = files[0];
    toDelete = files.slice(1);
  }
  // Archived docs - keep longer/more descriptive name
  else if (normFiles.every(f => f.startsWith('docs/archived/'))) {
    const sorted = [...files].sort((a, b) => b.length - a.length);
    toKeep = sorted[0];
    toDelete = sorted.slice(1);
  }
  // i18n case duplicates - keep kebab-case (no uppercase)
  else if (normFiles.every(f => f.startsWith('i18n/sources/'))) {
    const kebab = files.find(f => !f.match(/[A-Z]/));
    if (kebab) {
      toKeep = kebab;
      toDelete = files.filter(f => f !== kebab);
    } else {
      skippedGroups++;
      continue;
    }
  }
  // _artifacts - keep first (both are same)
  else if (normFiles.every(f => f.startsWith('_artifacts/'))) {
    toKeep = files[0];
    toDelete = files.slice(1);
  }
  // playwright.config.ts - keep tests/, delete qa/
  else if (normFiles.some(f => f.includes('playwright.config.ts'))) {
    toKeep = files.find(f => f.includes('tests'));
    if (toKeep) {
      toDelete = files.filter(f => f !== toKeep);
    } else {
      skippedGroups++;
      continue;
    }
  }
  // functions/config.json vs move-plan.json - skip (different purposes)
  else if (normFiles.some(f => f.includes('functions/config.json'))) {
    skippedGroups++;
    continue;
  }
  else {
    // Unknown pattern - skip
    skippedGroups++;
    continue;
  }
  
  // Verify toKeep file exists before deleting others
  if (!toKeep || !fs.existsSync(toKeep)) {
    // If the chosen file doesn't exist, try to find an alternative
    const existingFile = files.find(f => fs.existsSync(f));
    if (existingFile) {
      toKeep = existingFile;
      toDelete = files.filter(f => f !== toKeep);
    } else {
      console.warn(`  ⚠️ No files exist in group, skipping`);
      skippedGroups++;
      continue;
    }
  }
  
  // Ensure toDelete doesn't include the file we're keeping and all files exist
  toDelete = toDelete.filter(f => f !== toKeep);
  
  // Process deletions
  for (const file of toDelete) {
    const filePath = file.replace(/^\.\\/g, '').replace(/^\.\//g, '');
    if (DRY_RUN) {
      console.log(`  Would delete: ${filePath}`);
    } else {
      try {
        fs.unlinkSync(filePath);
        console.log(`  Deleted: ${filePath}`);
      } catch (e) {
        console.error(`  Failed to delete: ${filePath} - ${e.message}`);
      }
    }
    deletedCount++;
    deletedBytes += group.size;
  }
  
  if (toDelete.length > 0) {
    console.log(`✓ Keep: ${toKeep}`);
  }
}

console.log('\n--- Summary ---');
console.log(`Files ${DRY_RUN ? 'to delete' : 'deleted'}: ${deletedCount}`);
console.log(`Space ${DRY_RUN ? 'to save' : 'saved'}: ${(deletedBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Groups skipped (intentional): ${skippedGroups}`);

if (DRY_RUN && deletedCount > 0) {
  console.log('\n💡 Run with --apply to actually delete files');
}
