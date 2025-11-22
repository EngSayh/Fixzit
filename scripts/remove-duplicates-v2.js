#!/usr/bin/env node

/**
 * Remove duplicate keys from translation files (Version 2)
 * Removes the SECOND occurrence of each duplicate key
 */

const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, '../i18n/dictionaries/en.ts'),
  path.join(__dirname, '../i18n/dictionaries/ar.ts')
];

function removeDuplicates(filePath) {
  console.log(`\n📝 Processing: ${filePath}`);

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  // Track keys at each depth level
  const seenKeys = new Map(); // key: `${keyName}_depth${depth}`, value: lineIndex
  const duplicateRanges = []; // Array of {start, end} line ranges to remove

  // Helper: regex to capture keys (supports quoted and unquoted keys)
  // Matches:    keyName: {   or   'key-name': 'value',   or   "key.name": {
const keyRegex = /^(\s*)(?:['"]?)([\w.-]+)(?:['"]?)\s*:\s*(\{|['"])/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for key definition
    const keyMatch = line.match(keyRegex);
    if (keyMatch) {
      const indent = keyMatch[1] || '';
      const keyName = keyMatch[2];
      const isObject = keyMatch[3] === '{';

      // Calculate depth based on indentation (assumes 2-space indent)
      const depth = Math.floor(indent.length / 2);
      const uniqueKey = `${keyName}_depth${depth}`;

      if (seenKeys.has(uniqueKey)) {
        const firstOccurrence = seenKeys.get(uniqueKey);
        console.log(`   ⚠️  Duplicate '${keyName}' at line ${i + 1} (first at ${firstOccurrence + 1})`);

        if (!isObject) {
          // Simple value on a single line - remove this line only
          duplicateRanges.push({ start: i, end: i });
        } else {
          // Object value - find matching closing brace using brace balance
          let braceBalance = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
          let endLine = i;
          while (endLine + 1 < lines.length && braceBalance > 0) {
            endLine++;
            const l = lines[endLine];
            braceBalance += (l.match(/\{/g) || []).length;
            braceBalance -= (l.match(/\}/g) || []).length;
          }

          // Push range from start to endLine (inclusive)
          duplicateRanges.push({ start: i, end: endLine });
          console.log(`      ↳ Removing lines ${i + 1}-${endLine + 1}`);
        }
      } else {
        // First occurrence - track it
        seenKeys.set(uniqueKey, i);
      }
    }
  }

  // Remove duplicate ranges (in reverse order to maintain line numbers)
  let newLines = [...lines];
  let totalRemoved = 0;

  for (let r = duplicateRanges.length - 1; r >= 0; r--) {
    const { start, end } = duplicateRanges[r];
    const removeCount = end - start + 1;
    newLines.splice(start, removeCount);
    totalRemoved += removeCount;
  }

  console.log(`   ✅ Removed ${totalRemoved} lines`);

  // Write back only if something changed
  if (totalRemoved > 0) {
    fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
  } else {
    console.log('   (No changes)');
  }

  return totalRemoved;
}

// Process files
console.log('🔍 Removing duplicate keys...\n');
let totalRemovedEn = 0;
let totalRemovedAr = 0;

for (const file of files) {
  try {
    const removed = removeDuplicates(file);
    if (file.includes('en.ts')) totalRemovedEn = removed;
    if (file.includes('ar.ts')) totalRemovedAr = removed;
  } catch (err) {
    console.error(`Failed processing ${file}:`, err);
  }
}

console.log(`\n📊 Summary:`);
console.log(`   en.ts: ${totalRemovedEn} lines removed`);
console.log(`   ar.ts: ${totalRemovedAr} lines removed`);
console.log(`\n✅ Done! Run 'pnpm tsx scripts/remove-duplicates-v2.js' or 'node scripts/remove-duplicates-v2.js' to execute.`);
