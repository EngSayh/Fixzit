#!/usr/bin/env node
/**
 * Fix Duplicate Translation Keys
 * Removes duplicate keys from dictionary files while preserving the last occurrence
 */

const fs = require("fs");
const path = require("path");

function fixDuplicateKeys(filePath) {
  console.log(`\n🔍 Processing: ${filePath}`);

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  const seen = new Set();
  const duplicates = [];
  const toRemove = [];
  let bracketDepth = 0;

  // Find all duplicate keys
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Track bracket depth
    const openBrackets = (line.match(/{/g) || []).length;
    const closeBrackets = (line.match(/}/g) || []).length;
    bracketDepth += openBrackets - closeBrackets;

    // Check for key definitions (key: { or key: "value")
    const keyMatch = trimmed.match(/^(\w+):\s*(?:\{|\[)/);
    if (keyMatch && bracketDepth >= 1) {
      const key = keyMatch[1];

      if (seen.has(key)) {
        duplicates.push({ key, line: i + 1 });
        console.log(`   ⚠️  Duplicate found: '${key}' at line ${i + 1}`);
      } else {
        seen.add(key);
      }
    }
  }

  console.log(`\n📊 Found ${duplicates.length} duplicate keys`);

  if (duplicates.length === 0) {
    console.log("   ✅ No duplicates found!");
    return 0;
  }

  // For each duplicate, keep the last occurrence and mark earlier ones for removal
  const duplicatesByKey = {};
  for (const dup of duplicates) {
    if (!duplicatesByKey[dup.key]) {
      duplicatesByKey[dup.key] = [];
    }
    duplicatesByKey[dup.key].push(dup.line);
  }

  console.log(`\n🔧 Processing duplicates...`);

  for (const [key, lineNumbers] of Object.entries(duplicatesByKey)) {
    // Sort line numbers and keep the last one
    lineNumbers.sort((a, b) => a - b);
    const toKeep = lineNumbers[lineNumbers.length - 1];
    const toDelete = lineNumbers.slice(0, -1);

    console.log(
      `   📝 '${key}': Keeping line ${toKeep}, removing lines ${toDelete.join(", ")}`,
    );

    // Mark sections for removal (key line + all lines until next key or closing bracket)
    for (const lineNum of toDelete) {
      const startIdx = lineNum - 1;
      let endIdx = startIdx;
      let depth = 0;

      // Find the end of this key's section
      for (let i = startIdx; i < lines.length; i++) {
        const line = lines[i];
        const openBrackets = (line.match(/{/g) || []).length;
        const closeBrackets = (line.match(/}/g) || []).length;

        if (i === startIdx) {
          // Check if this key has a nested object
          if (line.includes("{")) {
            depth = 1;
          } else {
            // Simple key-value pair, just this line
            endIdx = i;
            break;
          }
        } else {
          depth += openBrackets - closeBrackets;
          if (depth <= 0) {
            endIdx = i;
            break;
          }
        }
      }

      toRemove.push({ start: startIdx, end: endIdx });
    }
  }

  // Sort removal ranges in reverse order to maintain indices
  toRemove.sort((a, b) => b.start - a.start);

  console.log(`\n🗑️  Removing ${toRemove.length} duplicate sections...`);

  // Remove duplicate sections
  let modifiedLines = [...lines];
  for (const range of toRemove) {
    console.log(`   Removing lines ${range.start + 1} to ${range.end + 1}`);
    modifiedLines.splice(range.start, range.end - range.start + 1);
  }

  // Write back to file
  const newContent = modifiedLines.join("\n");
  fs.writeFileSync(filePath, newContent, "utf8");

  console.log(`\n✅ Fixed! Removed ${toRemove.length} duplicate sections`);

  return toRemove.length;
}

// Main execution
const enPath = path.join(__dirname, "../i18n/dictionaries/en.ts");
const arPath = path.join(__dirname, "../i18n/dictionaries/ar.ts");

console.log("🚀 Starting duplicate key removal...\n");

const enFixed = fixDuplicateKeys(enPath);
const arFixed = fixDuplicateKeys(arPath);

console.log(`\n${"=".repeat(60)}`);
console.log(`✅ COMPLETE!`);
console.log(`   en.ts: ${enFixed} sections removed`);
console.log(`   ar.ts: ${arFixed} sections removed`);
console.log(`${"=".repeat(60)}\n`);

process.exit(0);
