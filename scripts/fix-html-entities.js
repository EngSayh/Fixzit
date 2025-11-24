#!/usr/bin/env node

/**
 * Fix HTML entities that were incorrectly applied to JavaScript files
 */

const fs = require("fs");
const path = require("path");

// File extensions that should NOT have HTML entities
const JS_EXTENSIONS = [".js", ".ts", ".mjs", ".cjs"];

function shouldRevertFile(filePath) {
  // Skip node_modules, .git, and other irrelevant directories
  if (
    filePath.includes("node_modules") ||
    filePath.includes(".git") ||
    filePath.includes("dist") ||
    filePath.includes("build")
  ) {
    return false;
  }

  return JS_EXTENSIONS.some((ext) => filePath.endsWith(ext));
}

function getAllFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      getAllFiles(fullPath, files);
    } else if (shouldRevertFile(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function revertHtmlEntities(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");

    // Revert HTML entities back to normal characters in JS files
    let modified = content;
    modified = modified.replace(/'/g, "'");
    modified = modified.replace(/"/g, '"');
    modified = modified.replace(/</g, "<");
    modified = modified.replace(/>/g, ">");
    modified = modified.replace(/&/g, "&");

    if (content !== modified) {
      fs.writeFileSync(filePath, modified);
      console.log(`✅ Fixed HTML entities in ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log("🔧 Fixing HTML entities in JavaScript files...\n");

  const rootDir = process.cwd();
  const files = getAllFiles(rootDir);

  console.log(`📁 Found ${files.length} JavaScript files to check\n`);

  let processedCount = 0;
  let modifiedCount = 0;

  for (const file of files) {
    processedCount++;

    if (revertHtmlEntities(file)) {
      modifiedCount++;
    }
  }

  console.log(
    `\n✨ Completed! Fixed ${modifiedCount} out of ${processedCount} files`,
  );
}

if (require.main === module) {
  main();
}

module.exports = { revertHtmlEntities };
