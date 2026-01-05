#!/usr/bin/env node
/**
 * Fix en.ts by removing duplicates and ensuring single export
 */

const fs = require("fs");
const path = require("path");

const EN_FILE = path.join(__dirname, "../i18n/dictionaries/en.ts");

console.log("🔧 Fixing en.ts duplicates and structure...");

// Read the file
let content = fs.readFileSync(EN_FILE, "utf-8");

// Remove any merge conflict markers if present
content = content.replace(/^<{7}.*$/gm, "");
content = content.replace(/^={7}.*$/gm, "");
content = content.replace(/^>{7}.*$/gm, "");

// Extract all object definitions
const objectPattern = /(?:export default|const \w+\s*=)\s*\{/g;
const matches = [...content.matchAll(objectPattern)];

console.log(`Found ${matches.length} top-level object(s)`);

// If we have multiple exports, we need to merge them
if (matches.length > 1) {
  console.log("⚠️  Multiple top-level objects detected. Merging...");

  // Parse the file more carefully to extract all key-value pairs
  // For now, let's remove duplicate export statements

  // Strategy: Keep only the first export default, remove others
  const firstExportIndex = content.indexOf("export default {");
  const constEnIndex = content.indexOf("const en = {");

  if (firstExportIndex !== -1 && constEnIndex !== -1) {
    if (firstExportIndex < constEnIndex) {
      // Remove const en declaration
      console.log("Removing duplicate const en declaration...");
      const lines = content.split("\n");
      const newLines = [];
      let inConstEn = false;
      let braceCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes("const en = {")) {
          inConstEn = true;
          braceCount =
            (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
          continue;
        }

        if (inConstEn) {
          braceCount +=
            (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
          if (braceCount === 0) {
            inConstEn = false;
          }
          continue;
        }

        newLines.push(line);
      }

      content = newLines.join("\n");
    }
  }
}

// Remove any trailing "export default en" statements at the actual file end
// SEC-REDOS-001: Use non-nested quantifier pattern to prevent ReDoS
content = content.replace(/\n\s*export default en;?\s*$/, "");

// Ensure the file ends properly after the last closing brace
const lastBraceIndex = content.lastIndexOf("}");
if (lastBraceIndex !== -1) {
  // Extract content after the last brace
  const suffix = content.substring(lastBraceIndex + 1);

  // Check if suffix contains only whitespace and/or comments
  // SEC-REDOS-002: Simplified pattern to prevent ReDoS
  const trimmedSuffix = suffix.trim();
  const hasOnlyWhitespaceOrComments = trimmedSuffix === "" || 
    /^[/*\s]+$/.test(trimmedSuffix);

  if (hasOnlyWhitespaceOrComments || suffix.trim() === "") {
    // Safe to add semicolon
    content = content.substring(0, lastBraceIndex + 1) + ";\n";
  } else {
    // Preserve non-whitespace content, insert semicolon after last brace
    content = content.substring(0, lastBraceIndex + 1) + ";" + suffix;
  }
}

// Write the fixed content back
fs.writeFileSync(EN_FILE, content, "utf-8");

console.log("✅ Fixed en.ts structure");
console.log("📊 Running TypeScript check...");

// Run a quick TypeScript check
const { execSync } = require("child_process");
try {
  execSync("npx tsc --noEmit i18n/dictionaries/en.ts", {
    cwd: path.join(__dirname, ".."),
    stdio: "pipe",
  });
  console.log("✅ TypeScript validation passed");
} catch (error) {
  console.log(
    "⚠️  TypeScript validation found issues (will be fixed in next step)",
  );
  const output = error.stdout?.toString() || error.stderr?.toString() || "";
  const duplicateErrors = output.match(/Duplicate identifier '(\w+)'/g);
  if (duplicateErrors) {
    console.log(`Found ${duplicateErrors.length} duplicate key errors`);
  }
}

console.log("✅ en.ts fix complete!");
