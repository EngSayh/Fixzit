#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Read both dictionary files
const enPath = path.join(__dirname, "../i18n/dictionaries/en.ts");
const arPath = path.join(__dirname, "../i18n/dictionaries/ar.ts");

function fixDuplicates(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const seen = new Map();
  const fixes = [];

  let currentSection = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(\s*)(\w+):\s*['{]/);

    if (match) {
      const indent = match[1].length;
      const key = match[2];

      // Update current section for top-level keys (2 spaces indent)
      if (indent === 2) {
        currentSection = key;
        seen.clear(); // Reset seen keys for new section
      }

      // Check for duplicates within current scope
      if (seen.has(key)) {
        // Generate unique name based on context
        let newKey = key;
        let suffix = 1;

        // Try adding section context
        if (currentSection && !key.includes(currentSection)) {
          newKey = `${key}${currentSection.charAt(0).toUpperCase() + currentSection.slice(1)}`;
        } else {
          newKey = `${key}${suffix}`;
          while (seen.has(newKey)) {
            suffix++;
            newKey = `${key}${suffix}`;
          }
        }

        fixes.push({
          line: i + 1,
          oldKey: key,
          newKey,
          lineContent: line,
        });

        // Apply fix
        lines[i] = line.replace(new RegExp(`^(\\s*)${key}:`), `$1${newKey}:`);
        seen.set(newKey, i + 1);
      } else {
        seen.set(key, i + 1);
      }
    }
  }

  // Write fixed content
  if (fixes.length > 0) {
    fs.writeFileSync(filePath, lines.join("\n"), "utf8");
    console.log(
      `Fixed ${fixes.length} duplicates in ${path.basename(filePath)}:`,
    );
    fixes.forEach((f) => {
      console.log(`  Line ${f.line}: ${f.oldKey} → ${f.newKey}`);
    });
  } else {
    console.log(`No duplicates found in ${path.basename(filePath)}`);
  }
}

console.log("Fixing duplicate keys in translation dictionaries...\n");
fixDuplicates(enPath);
console.log("");
fixDuplicates(arPath);
console.log("\nDone!");
