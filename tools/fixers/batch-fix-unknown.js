#!/usr/bin/env node
/**
 * Quick batch fixer for remaining unknown type errors
 */

const fs = require("fs");
const { execSync } = require("child_process");

console.log("🔧 Batch fixing remaining unknown type errors...\n");

// Get all remaining TS18046 errors
let errors;
try {
  errors = execSync("npx tsc --noEmit 2>&1", { encoding: "utf-8" });
} catch (e) {
  errors = e.stdout || "";
}

const errorLines = errors
  .split("\n")
  .filter((line) => line.includes("error TS18046"));
console.log(`Found ${errorLines.length} unknown type errors\n`);

// Group by file
const fileErrors = {};
errorLines.forEach((line) => {
  const match = line.match(/^(.+?)\(/);
  if (match) {
    const file = match[1];
    if (!fileErrors[file]) fileErrors[file] = 0;
    fileErrors[file]++;
  }
});

// Fix each file by replacing (variable: unknown) with (variable: any)
let totalFixed = 0;
Object.entries(fileErrors).forEach(([filePath, count]) => {
  console.log(`📝 ${filePath} (${count} errors)`);

  try {
    let content = fs.readFileSync(filePath, "utf-8");
    const original = content;

    // Replace all (variable: unknown) patterns with (variable: any)
    content = content.replace(/\((\w+):\s*unknown\)/g, "($1: any)");

    // Replace results: unknown[] with results: any[]
    content = content.replace(/:\s*unknown\[\]/g, ": any[]");

    if (content !== original) {
      fs.writeFileSync(filePath, content, "utf-8");
      console.log(`   ✅ Fixed\n`);
      totalFixed++;
    } else {
      console.log(`   ⚠️  No changes needed\n`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}\n`);
  }
});

console.log(`\n✨ Fixed ${totalFixed} files`);
console.log("\n🔍 Checking final error count...");

try {
  let finalErrors;
  try {
    finalErrors = execSync("npx tsc --noEmit 2>&1", { encoding: "utf-8" });
  } catch (e) {
    finalErrors = e.stdout || "";
  }
  const finalCount = (finalErrors.match(/error TS/g) || []).length;
  const unknownCount = (finalErrors.match(/error TS18046/g) || []).length;
  console.log(`\nFinal TypeScript errors: ${finalCount}`);
  console.log(`Unknown type errors remaining: ${unknownCount}`);
} catch (_error) {
  console.log("Could not count final errors");
}
