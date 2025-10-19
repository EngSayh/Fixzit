#!/usr/bin/env node
/**
 * AUTOMATED COLOR STANDARDIZATION SCRIPT
 * 
 * Replaces 280+ hardcoded Tailwind color classes with CSS variable equivalents
 * Based on SYSTEM_WIDE_CONSISTENCY_ISSUES_INVENTORY.md
 * 
 * Pattern Replacements:
 * - bg-blue-600 → bg-[var(--fixzit-primary)]
 * - text-blue-600 → text-[var(--fixzit-primary)]
 * - bg-green-600 → bg-[var(--fixzit-success)]
 * - bg-red-600 → bg-[var(--fixzit-danger)]
 * - bg-yellow-600 → bg-[var(--fixzit-accent)]
 * 
 * Usage: node tools/fixers/fix-hardcoded-colors.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DRY_RUN = process.argv.includes('--dry-run');

console.log('🎨 AUTOMATED COLOR STANDARDIZATION');
console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'APPLYING CHANGES'}\n`);

// Color mapping: Tailwind class → CSS variable
const COLOR_MAPPINGS = {
  // Primary (Blue shades)
  'bg-blue-600': 'bg-[var(--fixzit-primary)]',
  'bg-blue-700': 'bg-[var(--fixzit-primary-dark)]',
  'bg-blue-500': 'bg-[var(--fixzit-primary-light)]',
  'bg-blue-50': 'bg-[var(--fixzit-primary-lightest)]',
  'bg-blue-100': 'bg-[var(--fixzit-primary-lighter)]',
  
  'text-blue-600': 'text-[var(--fixzit-primary)]',
  'text-blue-700': 'text-[var(--fixzit-primary-dark)]',
  'text-blue-800': 'text-[var(--fixzit-primary-darker)]',
  'text-blue-900': 'text-[var(--fixzit-primary-darkest)]',
  'text-blue-500': 'text-[var(--fixzit-primary-light)]',
  'text-blue-400': 'text-[var(--fixzit-primary-lighter)]',
  
  'hover:bg-blue-700': 'hover:bg-[var(--fixzit-primary-dark)]',
  'hover:bg-blue-800': 'hover:bg-[var(--fixzit-primary-darker)]',
  'hover:text-blue-700': 'hover:text-[var(--fixzit-primary-dark)]',
  'hover:text-blue-800': 'hover:text-[var(--fixzit-primary-darker)]',
  'hover:text-blue-900': 'hover:text-[var(--fixzit-primary-darkest)]',
  
  // Success (Green shades)
  'bg-green-600': 'bg-[var(--fixzit-success)]',
  'bg-green-700': 'bg-[var(--fixzit-success-dark)]',
  'bg-green-500': 'bg-[var(--fixzit-success-light)]',
  'bg-green-50': 'bg-[var(--fixzit-success-lightest)]',
  'bg-green-100': 'bg-[var(--fixzit-success-lighter)]',
  
  'text-green-600': 'text-[var(--fixzit-success)]',
  'text-green-700': 'text-[var(--fixzit-success-dark)]',
  'text-green-800': 'text-[var(--fixzit-success-darker)]',
  'text-green-500': 'text-[var(--fixzit-success-light)]',
  'text-green-400': 'text-[var(--fixzit-success-lighter)]',
  
  'hover:bg-green-700': 'hover:bg-[var(--fixzit-success-dark)]',
  'hover:text-green-900': 'hover:text-[var(--fixzit-success-darkest)]',
  
  // Danger (Red shades)
  'bg-red-600': 'bg-[var(--fixzit-danger)]',
  'bg-red-700': 'bg-[var(--fixzit-danger-dark)]',
  'bg-red-500': 'bg-[var(--fixzit-danger-light)]',
  'bg-red-50': 'bg-[var(--fixzit-danger-lightest)]',
  'bg-red-100': 'bg-[var(--fixzit-danger-lighter)]',
  
  'text-red-600': 'text-[var(--fixzit-danger)]',
  'text-red-700': 'text-[var(--fixzit-danger-dark)]',
  'text-red-800': 'text-[var(--fixzit-danger-darker)]',
  'text-red-900': 'text-[var(--fixzit-danger-darkest)]',
  'text-red-500': 'text-[var(--fixzit-danger-light)]',
  'text-red-400': 'text-[var(--fixzit-danger-lighter)]',
  
  'hover:bg-red-600': 'hover:bg-[var(--fixzit-danger)]',
  'hover:bg-red-700': 'hover:bg-[var(--fixzit-danger-dark)]',
  'hover:text-red-700': 'hover:text-[var(--fixzit-danger-dark)]',
  'hover:text-red-800': 'hover:text-[var(--fixzit-danger-darker)]',
  'hover:text-red-900': 'hover:text-[var(--fixzit-danger-darkest)]',
  
  // Warning/Accent (Yellow shades)
  'bg-yellow-600': 'bg-[var(--fixzit-accent)]',
  'bg-yellow-700': 'bg-[var(--fixzit-accent-dark)]',
  'bg-yellow-500': 'bg-[var(--fixzit-accent-light)]',
  'bg-yellow-50': 'bg-[var(--fixzit-accent-lightest)]',
  'bg-yellow-100': 'bg-[var(--fixzit-accent-lighter)]',
  
  'text-yellow-600': 'text-[var(--fixzit-accent)]',
  'text-yellow-700': 'text-[var(--fixzit-accent-dark)]',
  'text-yellow-800': 'text-[var(--fixzit-accent-darker)]',
  'text-yellow-500': 'text-[var(--fixzit-accent-light)]',
  'text-yellow-400': 'text-[var(--fixzit-accent-lighter)]',
  
  'hover:bg-yellow-700': 'hover:bg-[var(--fixzit-accent-dark)]',
  
  // Secondary (Purple shades)
  'bg-purple-600': 'bg-[var(--fixzit-secondary)]',
  'bg-purple-700': 'bg-[var(--fixzit-secondary-dark)]',
  'bg-purple-50': 'bg-[var(--fixzit-secondary-lightest)]',
  'bg-purple-100': 'bg-[var(--fixzit-secondary-lighter)]',
  
  'text-purple-600': 'text-[var(--fixzit-secondary)]',
  'text-purple-800': 'text-[var(--fixzit-secondary-darker)]',
  
  'hover:bg-purple-700': 'hover:bg-[var(--fixzit-secondary-dark)]',
  
  // Indigo shades (projects/special)
  'bg-indigo-600': 'bg-[var(--fixzit-indigo)]',
  'bg-indigo-700': 'bg-[var(--fixzit-indigo-dark)]',
  
  'hover:bg-indigo-700': 'hover:bg-[var(--fixzit-indigo-dark)]',
};

// Gray colors - keep Tailwind (neutral, used for UI structure)
const SKIP_PATTERNS = [
  /bg-gray-/,
  /text-gray-/,
  /border-gray-/,
  /hover:bg-gray-/,
  /hover:text-gray-/,
];

function shouldSkipFile(filePath) {
  const skipPaths = [
    'node_modules',
    '.next',
    'dist',
    '.git',
    'aws/',
    'qa/',
    'tools/scripts-archive/',
    'COMPREHENSIVE_MISSING_FEATURES_ANALYSIS.md',
    'scripts/generate-complete-fixzit.sh',
  ];
  return skipPaths.some(skip => filePath.includes(skip));
}

function fixColorsInFile(filePath) {
  if (shouldSkipFile(filePath)) return { fixed: 0, skipped: true };
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    let replacementCount = 0;
    
    // Apply each color mapping
    for (const [oldColor, newColor] of Object.entries(COLOR_MAPPINGS)) {
      // Create regex to match class names within className attributes
      // Matches: className="... old-color ..." or className="old-color"
      const regex = new RegExp(`(className=["'][^"']*\\b)${oldColor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\b[^"']*)`, 'g');
      
      const matches = content.match(regex);
      if (matches) {
        content = content.replace(regex, `$1${newColor}$2`);
        replacementCount += matches.length;
      }
    }
    
    if (content !== originalContent && !DRY_RUN) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
    
    return { fixed: replacementCount, skipped: false, changed: content !== originalContent };
  } catch (error) {
    console.error(`   ❌ Error processing ${filePath}:`, error.message);
    return { fixed: 0, skipped: false, error: true };
  }
}

function findTSXFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!shouldSkipFile(filePath)) {
        findTSXFiles(filePath, fileList);
      }
    } else if ((file.endsWith('.tsx') || file.endsWith('.ts')) && !shouldSkipFile(filePath)) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

// Main execution
console.log('🔍 Scanning for .tsx/.ts files...\n');

const targetDirs = [
  path.join(process.cwd(), 'app'),
  path.join(process.cwd(), 'components'),
  path.join(process.cwd(), 'lib'),
  path.join(process.cwd(), 'hooks'),
];

let allFiles = [];
targetDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    allFiles = allFiles.concat(findTSXFiles(dir));
  }
});

console.log(`Found ${allFiles.length} files to process\n`);

let totalReplacements = 0;
let filesChanged = 0;
let filesWithErrors = 0;

allFiles.forEach((file, index) => {
  const result = fixColorsInFile(file);
  
  if (result.error) {
    filesWithErrors++;
  } else if (result.changed) {
    const relativePath = file.replace(process.cwd(), '');
    console.log(`✅ ${relativePath} (${result.fixed} replacements)`);
    totalReplacements += result.fixed;
    filesChanged++;
  }
  
  // Progress indicator every 50 files
  if ((index + 1) % 50 === 0) {
    console.log(`   ... processed ${index + 1}/${allFiles.length} files`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY');
console.log('='.repeat(60));
console.log(`Files scanned:      ${allFiles.length}`);
console.log(`Files changed:      ${filesChanged}`);
console.log(`Total replacements: ${totalReplacements}`);
console.log(`Errors:             ${filesWithErrors}`);
console.log('='.repeat(60));

if (DRY_RUN) {
  console.log('\n⚠️  DRY RUN - No changes were written to disk');
  console.log('Run without --dry-run to apply changes');
} else {
  console.log('\n✨ Changes applied successfully!');
  console.log('\nNext steps:');
  console.log('1. Run: pnpm typecheck');
  console.log('2. Run: pnpm lint');
  console.log('3. Test in browser');
  console.log('4. Git commit with detailed message');
}

process.exit(filesWithErrors > 0 ? 1 : 0);
