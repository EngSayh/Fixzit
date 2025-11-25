#!/usr/bin/env node
/**
 * Automated Error Message Sanitization Script
 * Fixes error.message exposure across all API routes
 */

const fs = require("fs");
const { execSync } = require("child_process");

// Files to process
const apiFiles = execSync('find app/api -name "*.ts" -type f -print0')
  .toString()
  .split("\0")
  .filter((f) => f && f.endsWith(".ts"));

let fixed = 0;
let filesChanged = [];

console.log(`\n🔍 Processing ${apiFiles.length} API route files...`);

for (const file of apiFiles) {
  let content = fs.readFileSync(file, "utf8");

  // Apply replacements
  const newContent = content.replace(
    /const message = error instanceof Error \? error\.message : ['"]([^'"]+)['"];[\s\n\r\s]*return createSecureResponse\(\{ error: message \}, (\d+), req\);/g,
    (_match, defaultMsg, status) =>
      `return createSecureResponse({ error: '${defaultMsg}' }, ${status}, req);`,
  );

  if (newContent !== content) {
    fs.writeFileSync(file, newContent, "utf8");
    filesChanged.push(file);
    fixed++;
    console.log(`  ✓ Fixed: ${file}`);
  }
}

console.log(`\n✅ Complete!`);
console.log(`   Fixed ${fixed} files`);
console.log(`   Total checked: ${apiFiles.length}`);

if (filesChanged.length > 0) {
  console.log(`\n📝 Files modified:`);
  filesChanged.forEach((f) => console.log(`   - ${f}`));
}
