const fs = require("fs");
const path = require("path");

/**
 * Script to fix 141 empty catch blocks identified in audit
 */

let fixedFiles = 0;
let totalFixes = 0;

function fixEmptyCatches(directory) {
  if (!fs.existsSync(directory)) {
    console.log(`Directory ${directory} does not exist, skipping...`);
    return;
  }

  const files = fs.readdirSync(directory);

  files.forEach((file) => {
    const fullPath = path.join(directory, file);
    const stat = fs.statSync(fullPath);

    if (
      stat.isDirectory() &&
      !fullPath.includes("node_modules") &&
      !fullPath.includes(".git")
    ) {
      fixEmptyCatches(fullPath);
    } else if (file.endsWith(".js")) {
      let content = fs.readFileSync(fullPath, "utf8");
      let fileFixCount = 0;

      // Pattern 1: Empty catch blocks
      content = content.replace(
        /} catch (([^)]+)) {\s*}/g,
        (match, errorVar) => {
          fileFixCount++;
          return `} catch (${errorVar}) {
    logger.error('Error in ${path.basename(file)}:', ${errorVar});
    throw ${errorVar};
  }`;
        },
      );

      // Pattern 2: Catch blocks with only console.log
      content = content.replace(
        /} catch (([^)]+)) {\s*console\.(log|error)([^)]+);\s*}/g,
        (match, errorVar) => {
          fileFixCount++;
          return `} catch (${errorVar}) {
    logger.error('Error in ${path.basename(file)}:', ${errorVar});
    throw ${errorVar};
  }`;
        },
      );

      // Pattern 3: Catch blocks that just return without handling
      content = content.replace(
        /} catch (([^)]+)) {\s*return[^}]*;\s*}/g,
        (match, errorVar) => {
          fileFixCount++;
          return `} catch (${errorVar}) {
    logger.error('Error in ${path.basename(file)}:', ${errorVar});
    throw ${errorVar};
  }`;
        },
      );

      // Add logger import if needed and fixes were made
      if (
        fileFixCount > 0 &&
        !content.includes("require('../utils/logger')") &&
        !content.includes("require('./utils/logger')")
      ) {
        // Determine correct path to logger
        const depth =
          fullPath.split(path.sep).length -
          process.cwd().split(path.sep).length -
          1;
        const loggerPath = "../".repeat(Math.max(depth, 1)) + "utils/logger";

        // Find a good place to insert the logger import
        if (content.includes("const express = require('express')")) {
          content = content.replace(
            "const express = require('express');",
            "const express = require('express');\nconst logger = require('" +
              loggerPath +
              "');",
          );
        } else if (content.includes("const mongoose = require('mongoose')")) {
          content = content.replace(
            "const mongoose = require('mongoose');",
            "const mongoose = require('mongoose');\nconst logger = require('" +
              loggerPath +
              "');",
          );
        } else {
          // Insert at the beginning after any existing requires
          const requireRegex =
            /((?:const|let|var)\s+\w+\s*=\s*require([^)]+);\s*\n)*/;
          const match = content.match(requireRegex);
          if (match && match[0]) {
            content = content.replace(
              match[0],
              match[0] + `const logger = require('${loggerPath}');\n`,
            );
          } else {
            content = `const logger = require('${loggerPath}');\n${content}`;
          }
        }
      }

      if (fileFixCount > 0) {
        fs.writeFileSync(fullPath, content);
        console.log(
          `✅ Fixed ${fileFixCount} empty catch blocks in: ${fullPath}`,
        );
        fixedFiles++;
        totalFixes += fileFixCount;
      }
    }
  });
}

console.log("🔧 Starting to fix empty catch blocks...");
console.log("=============================================");

// Fix all JavaScript files in these directories
const dirsToFix = ["routes", "models", "services", "middleware", "utils"];

dirsToFix.forEach((dir) => {
  console.log(`\n📁 Processing directory: ${dir}`);
  fixEmptyCatches(dir);
});

console.log("\n=============================================");
console.log("📊 EMPTY CATCH BLOCKS FIX SUMMARY");
console.log("=============================================");
console.log(`Files modified: ${fixedFiles}`);
console.log(`Total fixes applied: ${totalFixes}`);
console.log("✅ Empty catch blocks fixed successfully!");

if (totalFixes === 0) {
  console.log(
    "ℹ️  No empty catch blocks found or all already properly handled",
  );
}
