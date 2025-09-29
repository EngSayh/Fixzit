#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// List of files with merge conflicts from the TypeScript output
const conflictedFiles = [
  'app/api/ats/applications/[id]/route.ts',
  'app/api/ats/convert-to-employee/route.ts',
  'app/api/ats/jobs/[id]/apply/route.ts',
  'app/api/ats/jobs/[id]/publish/route.ts',
  'app/api/ats/jobs/route.ts',
  'app/api/ats/moderation/route.ts',
  'app/api/ats/public-post/route.ts',
  'app/api/cms/pages/[slug]/route.ts',
  'app/api/feeds/indeed/route.ts',
  'app/api/feeds/linkedin/route.ts',
  'app/api/help/articles/[id]/route.ts',
  'app/api/payments/callback/route.ts',
  'app/api/payments/create/route.ts',
  'app/api/projects/route.ts',
  'app/api/qa/health/route.ts',
  'app/api/rfqs/route.ts',
  'app/api/search/route.ts',
  'app/api/support/tickets/[id]/route.ts',
  'app/api/support/tickets/route.ts',
  'app/api/tenants/route.ts',
  'app/api/work-orders/[id]/checklists/toggle/route.ts',
  'app/api/work-orders/[id]/comments/route.ts',
  'app/api/work-orders/[id]/route.ts',
  'app/careers/[slug]/page.tsx',
  'app/help/[slug]/page.tsx',
  'src/lib/mongo.ts',
  'src/lib/paytabs.ts',
  'src/lib/utils.ts'
];

function fixMergeConflicts(filePath) {
  const fullPath = path.join('/workspaces/Fixzit', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return false;
  }

  try {
    let content = fs.readFileSync(fullPath, 'utf-8');
    let hasConflicts = content.includes('<<<<<<< HEAD');
    
    if (!hasConflicts) {
      console.log(`No conflicts found in: ${filePath}`);
      return true;
    }

    // Remove conflict markers and keep the newer version (after =======)
    content = content.replace(/<<<<<<< HEAD[\s\S]*?=======\n([\s\S]*?)>>>>>>> [a-f0-9]{40}\n?/g, '$1');
    
    // Write the fixed content back
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`✅ Fixed conflicts in: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

console.log('🔧 Fixing merge conflicts...\n');

let successCount = 0;
let errorCount = 0;

for (const file of conflictedFiles) {
  if (fixMergeConflicts(file)) {
    successCount++;
  } else {
    errorCount++;
  }
}

console.log(`\n📊 Summary:`);
console.log(`✅ Successfully fixed: ${successCount} files`);
console.log(`❌ Errors: ${errorCount} files`);

if (errorCount === 0) {
  console.log('\n🎉 All merge conflicts have been resolved!');
} else {
  console.log('\n⚠️  Some files still need manual attention.');
}