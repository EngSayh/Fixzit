#!/usr/bin/env node
/**
 * Comprehensive System Error Analysis
 * Scans entire codebase for errors categorized by type
 * Provides detailed report with file paths, line numbers, and issues
 */

const fs = require("fs");
const { execSync } = require("child_process");

console.log("🔍 Starting comprehensive system error analysis...\n");

// Get all source files
const extensions = ["ts", "tsx", "js", "jsx"];
const excludePaths = [
  "node_modules",
  ".next",
  "dist",
  "build",
  ".git",
  "coverage",
  "__pycache__",
  "aws/dist",
  "qa/qa/artifacts",
  "_deprecated",
  "jscpd-report",
];

const excludePattern = excludePaths
  .map((p) => `-not -path "*/${p}/*"`)
  .join(" ");
const extensionPattern = extensions
  .map((ext) => `-name "*.${ext}"`)
  .join(" -o ");

console.log("📂 Collecting file list...");
const findCommand = `find . -type f \\( ${extensionPattern} \\) ${excludePattern}`;

let files = [];
try {
  const output = execSync(findCommand, {
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
  });
  files = output.trim().split("\n").filter(Boolean);
} catch (error) {
  console.error("❌ Error collecting files:", error.message);
  process.exit(1);
}

console.log(`✅ Found ${files.length} files to analyze\n`);

// Error patterns with detailed detection
const errorPatterns = {
  // Build Errors
  buildErrors: [
    { pattern: /webpack.*error/gi, type: "Webpack Error" },
    { pattern: /compilation\s+error/gi, type: "Compilation Error" },
    { pattern: /build\s+fail/gi, type: "Build Failure" },
    { pattern: /SyntaxError/g, type: "Syntax Error" },
    { pattern: /ReferenceError/g, type: "Reference Error" },
  ],

  // Test Errors
  testErrors: [
    { pattern: /\.skip\(/g, type: "Skipped Test" },
    { pattern: /\.todo\(/g, type: "TODO Test" },
    { pattern: /xit\(/g, type: "Disabled Test (xit)" },
    { pattern: /xdescribe\(/g, type: "Disabled Test Suite" },
    { pattern: /\/\/\s*TODO.*test/gi, type: "Missing Test Implementation" },
  ],

  // Lint/Code Quality Errors
  lintErrors: [
    { pattern: /\/\/\s*eslint-disable/gi, type: "ESLint Disabled" },
    { pattern: /\/\/\s*@ts-ignore/g, type: "TypeScript Error Suppressed" },
    { pattern: /\/\/\s*@ts-expect-error/g, type: "Expected TypeScript Error" },
    { pattern: /\/\/\s*@ts-nocheck/g, type: "TypeScript Check Disabled" },
    { pattern: /console\.(log|debug|info|warn)/g, type: "Console Statement" },
  ],

  // TypeScript Errors
  typeErrors: [
    { pattern: /:\s*any\b/g, type: "Any Type Usage" },
    { pattern: /as\s+any\b/g, type: "Type Cast to Any" },
    { pattern: /<any>/g, type: "Generic Any Type" },
    { pattern: /Record<string,\s*any>/g, type: "Any in Record Type" },
  ],

  // Runtime Errors
  runtimeErrors: [
    { pattern: /throw\s+new\s+Error\(['"]TODO/gi, type: "TODO Error" },
    {
      pattern: /throw\s+new\s+Error\(['"]Not\s+implemented/gi,
      type: "Not Implemented",
    },
    { pattern: /console\.error/g, type: "Console Error" },
    { pattern: /process\.exit\(/g, type: "Process Exit" },
    {
      pattern: /\.catch\(\s*\(\)\s*=>\s*\{\s*\}\s*\)/g,
      type: "Empty Catch Block",
    },
  ],

  // Security Errors
  securityErrors: [
    { pattern: /eval\(/g, type: "Eval Usage" },
    { pattern: /dangerouslySetInnerHTML/g, type: "Dangerous HTML" },
    { pattern: /password\s*=\s*['"][^'"]{1,}/gi, type: "Hardcoded Password" },
    {
      pattern: /api[_-]?key\s*=\s*['"][^'"]{10,}/gi,
      type: "Hardcoded API Key",
    },
    { pattern: /secret\s*=\s*['"][^'"]{10,}/gi, type: "Hardcoded Secret" },
    {
      pattern: /localStorage\.setItem.*token/gi,
      type: "Token in LocalStorage",
    },
  ],

  // Import/Dependency Errors
  importErrors: [
    {
      pattern: /import.*from\s+['"]\.\.\/\.\.\/\.\.\//g,
      type: "Deep Relative Import",
    },
    {
      pattern: /require\(['"][^'"]*node_modules/g,
      type: "Direct Node Modules Require",
    },
    { pattern: /\/\/\s*TODO.*import/gi, type: "Missing Import" },
  ],

  // Config Errors
  configErrors: [
    {
      pattern: /process\.env\.\w+\s*\|\|\s*['"]/g,
      type: "Fallback Env Variable",
    },
    { pattern: /TODO.*config/gi, type: "TODO Configuration" },
    { pattern: /FIXME.*config/gi, type: "Config Fix Required" },
  ],

  // Database Errors
  databaseErrors: [
    { pattern: /\.exec\(\).*\.catch\(\s*\(\)\s*=>/g, type: "Silent DB Error" },
    { pattern: /findOne.*without.*await/g, type: "Missing Await on DB Query" },
    { pattern: /TODO.*database/gi, type: "Database TODO" },
    {
      pattern: /mongoose\.connect.*without.*catch/g,
      type: "Unhandled DB Connection",
    },
  ],

  // API Errors
  apiErrors: [
    { pattern: /fetch\(.*\)\.then.*without.*catch/g, type: "Unhandled Fetch" },
    {
      pattern: /axios\.(get|post|put|delete).*without.*catch/g,
      type: "Unhandled Axios Request",
    },
    { pattern: /TODO.*api/gi, type: "API TODO" },
    { pattern: /FIXME.*api/gi, type: "API Fix Required" },
    {
      pattern: /Response\.json\(\).*without.*catch/g,
      type: "Unhandled JSON Parse",
    },
  ],

  // Deployment Errors
  deploymentErrors: [
    { pattern: /TODO.*deploy/gi, type: "Deployment TODO" },
    { pattern: /localhost:\d+/g, type: "Hardcoded Localhost" },
    { pattern: /http:\/\/127\.0\.0\.1/g, type: "Hardcoded Local IP" },
  ],
};

// Additional patterns for code smells and issues
const codeSmells = [
  { pattern: /\/\/\s*FIXME/gi, category: "codeSmells", type: "FIXME Comment" },
  { pattern: /\/\/\s*TODO/gi, category: "codeSmells", type: "TODO Comment" },
  { pattern: /\/\/\s*HACK/gi, category: "codeSmells", type: "HACK Comment" },
  { pattern: /\/\/\s*XXX/gi, category: "codeSmells", type: "XXX Comment" },
  { pattern: /\/\/\s*BUG/gi, category: "codeSmells", type: "BUG Comment" },
];

const analysis = {
  totalFiles: files.length,
  filesWithErrors: 0,
  totalErrors: 0,
  categories: {},
  fileDetails: [],
  summary: {},
  timestamp: new Date().toISOString(),
};

// Initialize categories
Object.keys(errorPatterns).forEach((category) => {
  analysis.categories[category] = [];
  analysis.summary[category] = 0;
});
analysis.categories["codeSmells"] = [];
analysis.summary["codeSmells"] = 0;

let processedCount = 0;

console.log("🔎 Analyzing files for errors...\n");

// Analyze each file
for (const filePath of files) {
  processedCount++;

  if (processedCount % 50 === 0) {
    process.stdout.write(
      `\r⏳ Processed ${processedCount}/${files.length} files (${Math.round((processedCount / files.length) * 100)}%)`,
    );
  }

  try {
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    const fileErrors = {
      filePath: filePath.replace("./", ""),
      errors: [],
      errorCount: 0,
    };

    // Check each line for errors
    lines.forEach((line, lineIndex) => {
      const lineNumber = lineIndex + 1;

      // Check main error patterns
      for (const [category, patterns] of Object.entries(errorPatterns)) {
        for (const { pattern, type } of patterns) {
          const matches = line.match(pattern);
          if (matches) {
            matches.forEach((match) => {
              const error = {
                category,
                type,
                line: lineNumber,
                code: line.trim().substring(0, 150),
                match: match.substring(0, 100),
              };

              fileErrors.errors.push(error);
              fileErrors.errorCount++;
              analysis.totalErrors++;
              analysis.summary[category]++;

              analysis.categories[category].push({
                file: filePath.replace("./", ""),
                line: lineNumber,
                type,
                code: line.trim().substring(0, 150),
                match: match.substring(0, 100),
              });
            });
          }
        }
      }

      // Check code smells
      for (const { pattern, category, type } of codeSmells) {
        const matches = line.match(pattern);
        if (matches) {
          matches.forEach((match) => {
            const error = {
              category,
              type,
              line: lineNumber,
              code: line.trim().substring(0, 150),
              match: match.substring(0, 100),
            };

            fileErrors.errors.push(error);
            fileErrors.errorCount++;
            analysis.totalErrors++;
            analysis.summary[category]++;

            analysis.categories[category].push({
              file: filePath.replace("./", ""),
              line: lineNumber,
              type,
              code: line.trim().substring(0, 150),
              match: match.substring(0, 100),
            });
          });
        }
      }
    });

    if (fileErrors.errorCount > 0) {
      analysis.filesWithErrors++;
      analysis.fileDetails.push(fileErrors);
    }
  } catch (_error) {
    // Skip files that can't be read
  }
}

console.log("\n\n");
console.log("═══════════════════════════════════════════════════════════");
console.log("📊 Comprehensive System Error Analysis Report");
console.log("═══════════════════════════════════════════════════════════\n");

console.log("📈 Overall Statistics:");
console.log(`   Total Files Analyzed: ${analysis.totalFiles}`);
console.log(`   Files With Errors: ${analysis.filesWithErrors}`);
console.log(`   Total Errors Detected: ${analysis.totalErrors}\n`);

console.log("🔴 Error Distribution by Category:\n");

const categoryNames = {
  buildErrors: "Build Errors",
  testErrors: "Test Errors",
  lintErrors: "Lint/Code Quality",
  typeErrors: "TypeScript Errors",
  runtimeErrors: "Runtime Errors",
  securityErrors: "Security Issues",
  importErrors: "Import Errors",
  configErrors: "Configuration Issues",
  databaseErrors: "Database Errors",
  apiErrors: "API Errors",
  deploymentErrors: "Deployment Issues",
  codeSmells: "Code Maintenance (TODO/FIXME)",
};

// Sort by count
const sortedCategories = Object.entries(analysis.summary)
  .sort((a, b) => b[1] - a[1])
  .filter(([_, count]) => count > 0);

sortedCategories.forEach(([category, count]) => {
  const name = categoryNames[category] || category;
  const percentage = ((count / analysis.totalErrors) * 100).toFixed(1);
  console.log(`   ${name}: ${count} (${percentage}%)`);
});

console.log("\n");

// Top files with most errors
console.log("🔝 Top 20 Files with Most Errors:\n");
const topFiles = analysis.fileDetails
  .sort((a, b) => b.errorCount - a.errorCount)
  .slice(0, 20);

topFiles.forEach((file, index) => {
  const errorTypes = [...new Set(file.errors.map((e) => e.type))].length;
  console.log(`${index + 1}. ${file.filePath}`);
  console.log(
    `   Error Count: ${file.errorCount} | Different Types: ${errorTypes}\n`,
  );
});

// Save detailed JSON report
const jsonPath = "system-errors-detailed.json";
fs.writeFileSync(jsonPath, JSON.stringify(analysis, null, 2));
console.log(`✅ Saved detailed JSON report to: ${jsonPath}\n`);

// Generate comprehensive markdown report
const mdReport = generateDetailedMarkdownReport(
  analysis,
  categoryNames,
  topFiles,
  sortedCategories,
);
const mdPath = "SYSTEM_ERRORS_DETAILED_REPORT.md";
fs.writeFileSync(mdPath, mdReport);
console.log(`✅ Saved detailed markdown report to: ${mdPath}\n`);

// Generate CSV for easy filtering
const csvReport = generateCSVReport(analysis);
const csvPath = "system-errors-report.csv";
fs.writeFileSync(csvPath, csvReport);
console.log(`✅ Saved CSV report to: ${csvPath}\n`);

console.log("═══════════════════════════════════════════════════════════");
console.log("✨ Analysis completed successfully!");
console.log("═══════════════════════════════════════════════════════════\n");

function generateDetailedMarkdownReport(
  analysis,
  categoryNames,
  topFiles,
  sortedCategories,
) {
  let md = `# Comprehensive System Error Analysis Report

> **Generated**: ${new Date().toLocaleString("en-US", { timeZone: "UTC" })} UTC  
> **Branch**: fix/deprecated-hook-cleanup  
> **Commit**: ${execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim()}

## 📊 Executive Summary

- **Total Files Analyzed**: ${analysis.totalFiles.toLocaleString()}
- **Files With Errors**: ${analysis.filesWithErrors.toLocaleString()}
- **Total Errors Detected**: ${analysis.totalErrors.toLocaleString()}
- **Affected Files Rate**: ${((analysis.filesWithErrors / analysis.totalFiles) * 100).toFixed(2)}%
- **Average Errors per Affected File**: ${(analysis.totalErrors / analysis.filesWithErrors).toFixed(1)}

## 📈 Error Distribution by Category

| Category | Count | Percentage | Priority |
|----------|-------|------------|----------|
`;

  sortedCategories.forEach(([category, count], index) => {
    const name = categoryNames[category] || category;
    const percentage = ((count / analysis.totalErrors) * 100).toFixed(1);
    const priority = index < 3 ? "🔴 High" : index < 6 ? "🟡 Medium" : "🟢 Low";
    md += `| ${name} | ${count.toLocaleString()} | ${percentage}% | ${priority} |\n`;
  });

  md += `\n## 🔝 Top 20 Files with Most Errors\n\n`;

  topFiles.forEach((file, index) => {
    const categoriesInFile = {};
    file.errors.forEach((err) => {
      categoriesInFile[err.category] =
        (categoriesInFile[err.category] || 0) + 1;
    });

    md += `### ${index + 1}. \`${file.filePath}\` (${file.errorCount} errors)\n\n`;
    md += `**Error Distribution**:\n`;

    Object.entries(categoriesInFile)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        md += `- ${categoryNames[cat] || cat}: ${count}\n`;
      });

    // Show first 5 examples
    md += `\n**Examples**:\n`;
    file.errors.slice(0, 5).forEach((err, idx) => {
      md += `${idx + 1}. Line ${err.line}: ${err.type}\n`;
      md += `   \`${err.code}\`\n\n`;
    });

    if (file.errors.length > 5) {
      md += `*...and ${file.errors.length - 5} more errors*\n`;
    }

    md += `\n`;
  });

  md += `\n## 📋 Detailed Error Breakdown by Category\n\n`;

  for (const [category, count] of sortedCategories) {
    const errors = analysis.categories[category];
    if (errors.length === 0) continue;

    const name = categoryNames[category] || category;
    md += `### ${name} (${count} errors)\n\n`;

    // Group by type
    const byType = {};
    errors.forEach((err) => {
      if (!byType[err.type]) byType[err.type] = [];
      byType[err.type].push(err);
    });

    Object.entries(byType)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([type, typeErrors]) => {
        md += `#### ${type} (${typeErrors.length} occurrences)\n\n`;

        // Show first 10 examples
        const examples = typeErrors.slice(0, 10);
        examples.forEach((err, idx) => {
          md += `${idx + 1}. **${err.file}:${err.line}**\n`;
          md += `   \`\`\`\n   ${err.code}\n   \`\`\`\n\n`;
        });

        if (typeErrors.length > 10) {
          md += `   *...and ${typeErrors.length - 10} more occurrences*\n\n`;
        }
      });
  }

  md += `\n## 🎯 Recommended Fix Strategy\n\n`;

  md += `### Phase 1: Quick Wins (Estimated 2-3 hours)\n\n`;
  const phase1Categories = sortedCategories.slice(0, 2);
  phase1Categories.forEach(([category]) => {
    const name = categoryNames[category] || category;
    const count = analysis.summary[category];
    md += `- **${name}** (${count} errors)\n`;

    switch (category) {
      case "lintErrors":
        md += `  - Remove unnecessary \`console.log\` statements\n`;
        md += `  - Replace \`// @ts-ignore\` with proper type fixes\n`;
        md += `  - Clean up ESLint disable comments\n`;
        break;
      case "typeErrors":
        md += `  - Replace \`: any\` with proper types\n`;
        md += `  - Fix \`as any\` type casts\n`;
        md += `  - Add proper type definitions\n`;
        break;
      case "codeSmells":
        md += `  - Address TODO comments\n`;
        md += `  - Fix FIXME items\n`;
        md += `  - Clean up temporary code\n`;
        break;
    }
    md += `\n`;
  });

  md += `### Phase 2: Medium Priority (Estimated 4-6 hours)\n\n`;
  const phase2Categories = sortedCategories.slice(2, 5);
  phase2Categories.forEach(([category]) => {
    const name = categoryNames[category] || category;
    const count = analysis.summary[category];
    md += `- **${name}** (${count} errors)\n\n`;
  });

  md += `### Phase 3: Long-term Improvements (Ongoing)\n\n`;
  if (sortedCategories.length > 5) {
    const phase3Categories = sortedCategories.slice(5);
    phase3Categories.forEach(([category]) => {
      const name = categoryNames[category] || category;
      const count = analysis.summary[category];
      md += `- **${name}** (${count} errors)\n`;
    });
    md += `\n`;
  }

  md += `\n## 📊 Progress Tracking\n\n`;
  md += `Use the CSV file (\`system-errors-report.csv\`) to track progress:\n\n`;
  md += `\`\`\`bash\n`;
  md += `# Count remaining errors by category\n`;
  md += `grep "lintErrors" system-errors-report.csv | wc -l\n\n`;
  md += `# Find all errors in a specific file\n`;
  md += `grep "your-file.ts" system-errors-report.csv\n\n`;
  md += `# Export specific category to work on\n`;
  md += `grep "Console Statement" system-errors-report.csv > console-cleanup.csv\n`;
  md += `\`\`\`\n\n`;

  md += `---\n\n`;
  md += `*This report was automatically generated by the System Error Analysis Tool*  \n`;
  md += `*Generated at: ${analysis.timestamp}*\n`;

  return md;
}

function generateCSVReport(analysis) {
  let csv = "Category,Type,File,Line,Code\n";

  for (const [category, errors] of Object.entries(analysis.categories)) {
    errors.forEach((err) => {
      const escapedCode = (err.code || "").replace(/"/g, '""');
      csv += `"${category}","${err.type}","${err.file}",${err.line},"${escapedCode}"\n`;
    });
  }

  return csv;
}
