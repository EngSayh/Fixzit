#!/usr/bin/env node
/**
 * Comprehensive Import Analyzer
 * Checks all imports in the system for accuracy
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Read package.json
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const allDeps = {
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
};

// Get all TS/JS files
const files = execSync(
  `find . -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \\) \
   -not -path "*/node_modules/*" \
   -not -path "*/.next/*" \
   -not -path "*/dist/*" \
   -not -path "*/build/*" \
   -not -path "*/playwright-report/*" \
   -not -path "*/test-results/*"`,
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean);

console.log("==========================================");
console.log("COMPREHENSIVE IMPORT ANALYSIS");
console.log("==========================================\n");
console.log(`Total files: ${files.length}\n`);

// Analyze imports
const importStats = {
  external: new Map(),
  relative: [],
  absolute: [],
  broken: [],
  missing: [],
  nodeBuiltin: new Set(),
};

const nodeBuiltins = new Set([
  "assert",
  "buffer",
  "child_process",
  "cluster",
  "crypto",
  "dgram",
  "dns",
  "domain",
  "events",
  "fs",
  "http",
  "https",
  "net",
  "os",
  "path",
  "punycode",
  "querystring",
  "readline",
  "repl",
  "stream",
  "string_decoder",
  "timers",
  "tls",
  "tty",
  "url",
  "util",
  "v8",
  "vm",
  "zlib",
]);

files.forEach((file) => {
  try {
    const content = fs.readFileSync(file, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, lineNum) => {
      // Match import statements
      const importMatch = line.match(/^import\s+.*from\s+['"]([^'"]+)['"]/);
      const requireMatch = line.match(/require\(['"]([^'"]+)['"]\)/);

      const importPath = importMatch
        ? importMatch[1]
        : requireMatch
          ? requireMatch[1]
          : null;

      if (importPath) {
        // Categorize import
        if (importPath.startsWith("./") || importPath.startsWith("../")) {
          // Relative import
          importStats.relative.push({
            file,
            line: lineNum + 1,
            path: importPath,
          });

          // Check if file exists
          const resolvedPath = path.resolve(path.dirname(file), importPath);
          const extensions = [
            "",
            ".ts",
            ".tsx",
            ".js",
            ".jsx",
            "/index.ts",
            "/index.tsx",
            "/index.js",
          ];
          const exists = extensions.some((ext) =>
            fs.existsSync(resolvedPath + ext),
          );

          if (!exists) {
            importStats.broken.push({
              file,
              line: lineNum + 1,
              path: importPath,
            });
          }
        } else if (importPath.startsWith("@/")) {
          // Absolute import
          importStats.absolute.push({
            file,
            line: lineNum + 1,
            path: importPath,
          });
        } else if (
          importPath.startsWith("node:") ||
          nodeBuiltins.has(importPath.split("/")[0])
        ) {
          // Node builtin
          importStats.nodeBuiltin.add(importPath.replace("node:", ""));
        } else {
          // External package
          const pkgName = importPath.startsWith("@")
            ? importPath.split("/").slice(0, 2).join("/")
            : importPath.split("/")[0];

          const count = importStats.external.get(pkgName) || 0;
          importStats.external.set(pkgName, count + 1);

          // Check if in package.json
          if (!allDeps[pkgName]) {
            importStats.missing.push({
              file,
              line: lineNum + 1,
              package: pkgName,
            });
          }
        }
      }
    });
  } catch (_err) {
    // Skip files that can't be read
  }
});

// Report
console.log("==========================================");
console.log("IMPORT STATISTICS");
console.log("==========================================\n");

console.log(`External packages: ${importStats.external.size}`);
console.log(`Relative imports: ${importStats.relative.length}`);
console.log(`Absolute imports (@/): ${importStats.absolute.length}`);
console.log(`Node builtins: ${importStats.nodeBuiltin.size}\n`);

console.log("==========================================");
console.log("TOP 20 EXTERNAL PACKAGES");
console.log("==========================================\n");

const sortedExternal = Array.from(importStats.external.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20);

sortedExternal.forEach(([pkg, count]) => {
  const status = allDeps[pkg] ? "✅" : "❌";
  console.log(`${status} ${pkg.padEnd(40)} (${count} imports)`);
});

console.log("\n==========================================");
console.log("NODE BUILTIN MODULES");
console.log("==========================================\n");

Array.from(importStats.nodeBuiltin)
  .sort()
  .forEach((mod) => {
    console.log(`  - ${mod}`);
  });

console.log("\n==========================================");
console.log("ISSUES FOUND");
console.log("==========================================\n");

// Missing packages
if (importStats.missing.length > 0) {
  console.log(`❌ MISSING PACKAGES (${importStats.missing.length} imports)`);
  console.log("Packages imported but not in package.json:\n");

  const missingByPackage = {};
  importStats.missing.forEach(({ file, package: pkg }) => {
    if (!missingByPackage[pkg]) missingByPackage[pkg] = [];
    missingByPackage[pkg].push(file);
  });

  Object.entries(missingByPackage).forEach(([pkg, files]) => {
    console.log(`  ${pkg} (${files.length} files)`);
    files.slice(0, 3).forEach((f) => console.log(`    - ${f}`));
    if (files.length > 3) console.log(`    ... and ${files.length - 3} more`);
  });
  console.log("");
} else {
  console.log("✅ All external packages are in package.json\n");
}

// Broken imports
if (importStats.broken.length > 0) {
  console.log(`❌ BROKEN RELATIVE IMPORTS (${importStats.broken.length})`);
  console.log("Files that may not exist:\n");

  importStats.broken.slice(0, 10).forEach(({ file, line, path }) => {
    console.log(`  ${file}:${line}`);
    console.log(`    Import: ${path}`);
  });

  if (importStats.broken.length > 10) {
    console.log(`  ... and ${importStats.broken.length - 10} more\n`);
  }
} else {
  console.log("✅ No broken relative imports found\n");
}

console.log("==========================================");
console.log("SUMMARY");
console.log("==========================================\n");

const totalIssues = importStats.missing.length + importStats.broken.length;

if (totalIssues === 0) {
  console.log("✅ All imports are accurate and valid!");
} else {
  console.log(`⚠️  Found ${totalIssues} potential issues:`);
  console.log(`   - ${importStats.missing.length} missing packages`);
  console.log(`   - ${importStats.broken.length} broken relative imports`);
}

console.log("\n==========================================\n");

process.exit(totalIssues > 0 ? 1 : 0);
