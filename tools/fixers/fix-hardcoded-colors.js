#!/usr/bin/env node
/**
 * AUTOMATED COLOR STANDARDIZATION SCRIPT
 *
 * Replaces 280+ hardcoded Tailwind color classes with semantic palette classes
 * Based on SYSTEM_WIDE_CONSISTENCY_ISSUES_INVENTORY.md
 *
 * Pattern Replacements:
 * - bg-blue-600 → bg-primary
 * - text-blue-600 → text-primary
 * - bg-green-600 → bg-success
 * - bg-red-600 → bg-destructive
 * - bg-yellow-600 → bg-warning
 *
 * Usage: node tools/fixers/fix-hardcoded-colors.js [--dry-run]
 */

const fs = require("fs");
const path = require("path");

const DRY_RUN = process.argv.includes("--dry-run");

console.log("🎨 AUTOMATED COLOR STANDARDIZATION");
console.log(`Mode: ${DRY_RUN ? "DRY RUN" : "APPLYING CHANGES"}\n`);

// Color mapping: Tailwind class → semantic palette class
const COLOR_MAPPINGS = {
  // Primary (Blue shades)
  "bg-blue-600": "bg-primary",
  "bg-blue-700": "bg-primary-dark",
  "bg-blue-500": "bg-primary/90",
  "bg-blue-50": "bg-primary/5",
  "bg-blue-100": "bg-primary/10",

  "text-blue-600": "text-primary",
  "text-blue-700": "text-primary-dark",
  "text-blue-800": "text-primary-dark",
  "text-blue-900": "text-primary-dark",
  "text-blue-500": "text-primary",
  "text-blue-400": "text-primary",

  "hover:bg-blue-700": "hover:bg-primary-dark",
  "hover:bg-blue-800": "hover:bg-primary-dark",
  "hover:text-blue-700": "hover:text-primary-dark",
  "hover:text-blue-800": "hover:text-primary-dark",
  "hover:text-blue-900": "hover:text-primary-dark",

  // Success (Green shades)
  "bg-green-600": "bg-success",
  "bg-green-700": "bg-success-dark",
  "bg-green-500": "bg-success/90",
  "bg-green-50": "bg-success/5",
  "bg-green-100": "bg-success/10",

  "text-green-600": "text-success",
  "text-green-700": "text-success-dark",
  "text-green-800": "text-success-dark",
  "text-green-500": "text-success",
  "text-green-400": "text-success",

  "hover:bg-green-700": "hover:bg-success-dark",
  "hover:text-green-900": "hover:text-success-dark",

  // Danger (Red shades)
  "bg-red-600": "bg-destructive",
  "bg-red-700": "bg-destructive-dark",
  "bg-red-500": "bg-destructive/90",
  "bg-red-50": "bg-destructive/5",
  "bg-red-100": "bg-destructive/10",

  "text-red-600": "text-destructive",
  "text-red-700": "text-destructive-dark",
  "text-red-800": "text-destructive-dark",
  "text-red-900": "text-destructive-dark",
  "text-red-500": "text-destructive",
  "text-red-400": "text-destructive",

  "hover:bg-red-600": "hover:bg-destructive",
  "hover:bg-red-700": "hover:bg-destructive-dark",
  "hover:text-red-700": "hover:text-destructive-dark",
  "hover:text-red-800": "hover:text-destructive-dark",
  "hover:text-red-900": "hover:text-destructive-dark",

  // Warning/Accent (Yellow shades)
  "bg-yellow-600": "bg-warning",
  "bg-yellow-700": "bg-warning-dark",
  "bg-yellow-500": "bg-warning/90",
  "bg-yellow-50": "bg-warning/5",
  "bg-yellow-100": "bg-warning/10",

  "text-yellow-600": "text-warning",
  "text-yellow-700": "text-warning-foreground",
  "text-yellow-800": "text-warning-foreground",
  "text-yellow-500": "text-warning",
  "text-yellow-400": "text-warning",

  "hover:bg-yellow-700": "hover:bg-warning-dark",

  // Secondary (Purple shades)
  "bg-purple-600": "bg-secondary",
  "bg-purple-700": "bg-secondary",
  "bg-purple-50": "bg-secondary/10",
  "bg-purple-100": "bg-secondary/20",

  "text-purple-600": "text-secondary-foreground",
  "text-purple-800": "text-secondary-foreground",

  "hover:bg-purple-700": "hover:bg-secondary",

  // Indigo shades (projects/special)
  "bg-indigo-600": "bg-accent",
  "bg-indigo-700": "bg-accent",

  "hover:bg-indigo-700": "hover:bg-accent",
};

function shouldSkipFile(filePath) {
  const skipPaths = [
    "node_modules",
    ".next",
    "dist",
    ".git",
    "aws/",
    "qa/",
    "tools/scripts-archive/",
    "COMPREHENSIVE_MISSING_FEATURES_ANALYSIS.md",
    "scripts/generate-complete-fixzit.sh",
  ];
  return skipPaths.some((skip) => filePath.includes(skip));
}

function fixColorsInFile(filePath) {
  if (shouldSkipFile(filePath)) return { fixed: 0, skipped: true };

  try {
    let content = fs.readFileSync(filePath, "utf8");
    const originalContent = content;
    let replacementCount = 0;

    // Apply each color mapping
    for (const [oldColor, newColor] of Object.entries(COLOR_MAPPINGS)) {
      // Create regex to match class names within className attributes
      // Matches: className="... old-color ..." or className="old-color"
      const regex = new RegExp(
        `(className=["'][^"']*\\b)${oldColor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\b[^"']*)`,
        "g",
      );

      const matches = content.match(regex);
      if (matches) {
        content = content.replace(regex, `$1${newColor}$2`);
        replacementCount += matches.length;
      }
    }

    if (content !== originalContent && !DRY_RUN) {
      fs.writeFileSync(filePath, content, "utf8");
    }

    return {
      fixed: replacementCount,
      skipped: false,
      changed: content !== originalContent,
    };
  } catch (error) {
    console.error(`   ❌ Error processing ${filePath}:`, error.message);
    return { fixed: 0, skipped: false, error: true };
  }
}

function findTSXFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!shouldSkipFile(filePath)) {
        findTSXFiles(filePath, fileList);
      }
    } else if (
      (file.endsWith(".tsx") || file.endsWith(".ts")) &&
      !shouldSkipFile(filePath)
    ) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Main execution
console.log("🔍 Scanning for .tsx/.ts files...\n");

const targetDirs = [
  path.join(process.cwd(), "app"),
  path.join(process.cwd(), "components"),
  path.join(process.cwd(), "lib"),
  path.join(process.cwd(), "hooks"),
];

let allFiles = [];
targetDirs.forEach((dir) => {
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
    const relativePath = file.replace(process.cwd(), "");
    console.log(`✅ ${relativePath} (${result.fixed} replacements)`);
    totalReplacements += result.fixed;
    filesChanged++;
  }

  // Progress indicator every 50 files
  if ((index + 1) % 50 === 0) {
    console.log(`   ... processed ${index + 1}/${allFiles.length} files`);
  }
});

console.log("\n" + "=".repeat(60));
console.log("📊 SUMMARY");
console.log("=".repeat(60));
console.log(`Files scanned:      ${allFiles.length}`);
console.log(`Files changed:      ${filesChanged}`);
console.log(`Total replacements: ${totalReplacements}`);
console.log(`Errors:             ${filesWithErrors}`);
console.log("=".repeat(60));

if (DRY_RUN) {
  console.log("\n⚠️  DRY RUN - No changes were written to disk");
  console.log("Run without --dry-run to apply changes");
} else {
  console.log("\n✨ Changes applied successfully!");
  console.log("\nNext steps:");
  console.log("1. Run: pnpm typecheck");
  console.log("2. Run: pnpm lint");
  console.log("3. Test in browser");
  console.log("4. Git commit with detailed message");
}

process.exit(filesWithErrors > 0 ? 1 : 0);
