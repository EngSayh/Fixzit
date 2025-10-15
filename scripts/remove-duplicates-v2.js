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

  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  // Track keys at each depth level
  const seenKeys = new Map(); // key: `${keyName}_depth${depth}`, value: lineIndex
  const duplicateRanges = []; // Array of {start, end} line ranges to remove
  
  let currentDepth = 0;
  let inDuplicateSection = false;
  let duplicateStart = -1;
  let duplicateKey = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Track depth
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    
    // Check for key definition (e.g., "  keyName: {" or "  keyName: 'value',")
    const keyMatch = line.match(/^(\s*)(\w+):\s*(\{|'|")/);
    
    if (keyMatch) {
      const indent = keyMatch[1];
      const keyName = keyMatch[2];
      const isObject = keyMatch[3] === '{';
      
      // Calculate depth based on indentation
      const depth = Math.floor(indent.length / 2);
      const uniqueKey = `${keyName}_depth${depth}`;
      
      if (seenKeys.has(uniqueKey)) {
        // Found duplicate!
        const firstOccurrence = seenKeys.get(uniqueKey);`);
        
        // Mark the start of duplicate section
        inDuplicateSection = true;
        duplicateStart = i;
        duplicateKey = keyName;
        currentDepth = depth;
        
        // If it's not an object (simple value), just mark this single line
        if (!isObject) {
          duplicateRanges.push({ start: i, end: i });
          inDuplicateSection = false;
        }
      } else {
        // First occurrence - track it
        seenKeys.set(uniqueKey, i);
      }
    }
    
    // If we're in a duplicate section and tracking an object, find where it ends
    if (inDuplicateSection) {
      currentDepth += openBraces - closeBraces;
      
      // When we return to the same depth (object closed), end the duplicate section
      if (line.includes('},') || line.match(/^\s*\},?\s*$/)) {
        const endIndent = (line.match(/^(\s*)/) || ['', ''])[1];
        const endDepth = Math.floor(endIndent.length / 2);
        
        if (endDepth <= Math.floor((lines[duplicateStart].match(/^(\s*)/) || ['', ''])[1].length / 2)) {
          duplicateRanges.push({ start: duplicateStart, end: i });
          inDuplicateSection = false;

        }
      }
    }
  }
  
  // Remove duplicate ranges (in reverse order to maintain line numbers)
  let newLines = [...lines];
  let totalRemoved = 0;
  
  for (let i = duplicateRanges.length - 1; i >= 0; i--) {
    const { start, end } = duplicateRanges[i];
    const removeCount = end - start + 1;
    newLines.splice(start, removeCount);
    totalRemoved += removeCount;
  }

  // Write back
  fs.writeFileSync(filePath, newLines.join('\n'), 'utf-8');
  
  return totalRemoved;
}

// Process files

let totalRemovedEn = 0;
let totalRemovedAr = 0;

for (const file of files) {
  const removed = removeDuplicates(file);
  if (file.includes('en.ts')) totalRemovedEn = removed;
  if (file.includes('ar.ts')) totalRemovedAr = removed;
}

