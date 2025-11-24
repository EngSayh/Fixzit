#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Configuration
const CONFIG = {
  projectPath: process.argv[2] || ".", // Pass project path as argument
  outputFile: "project-analysis-report.json",
  htmlReport: "project-analysis-report.html",

  // Size thresholds
  largeFileThreshold: 10 * 1024 * 1024, // 10MB
  veryLargeFileThreshold: 50 * 1024 * 1024, // 50MB

  // Patterns to identify unused files
  ignorePatterns: [
    ".git",
    ".DS_Store",
    "Thumbs.db",
    "*.log",
    ".env.local",
    ".env.*.local",
  ],

  // Known bloat sources
  bloatFolders: [
    "node_modules",
    ".next",
    "build",
    "dist",
    ".cache",
    "coverage",
    ".npm",
    ".yarn",
    ".pnpm",
    "bower_components",
    ".nuxt",
    ".output",
    "out",
    ".turbo",
    ".vercel",
    ".netlify",
  ],

  // File extensions to check for usage
  codeExtensions: [
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".css",
    ".scss",
    ".sass",
    ".less",
  ],
  assetExtensions: [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".ico",
    ".webp",
    ".mp4",
    ".webm",
    ".pdf",
  ],

  // FIXZIT SOUQ specific modules
  fixzitModules: [
    "dashboard",
    "work-orders",
    "properties",
    "finance",
    "human-resources",
    "administration",
    "crm",
    "marketplace",
    "support",
    "compliance-legal",
    "reports-analytics",
    "system-management",
    "preventive-maintenance",
  ],
};

class ProjectAnalyzer {
  constructor() {
    this.totalSize = 0;
    this.fileCount = 0;
    this.folderCount = 0;
    this.largeFiles = [];
    this.bloatAnalysis = {};
    this.moduleAnalysis = {};
    this.unusedFiles = [];
    this.duplicateFiles = new Map();
    this.fileHashes = new Map();
    this.extensionStats = {};
    this.errors = [];
  }

  // Format bytes to human readable
  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // Calculate folder size recursively
  async getFolderSize(folderPath) {
    let totalSize = 0;

    try {
      const files = await readdir(folderPath);

      for (const file of files) {
        const filePath = path.join(folderPath, file);

        try {
          const stats = await stat(filePath);

          if (stats.isDirectory()) {
            // Skip symbolic links to avoid infinite loops
            if (!stats.isSymbolicLink()) {
              totalSize += await this.getFolderSize(filePath);
            }
          } else {
            totalSize += stats.size;
          }
        } catch (_err) {
          // Skip files we can't access
          continue;
        }
      }
    } catch (_err) {
      this.errors.push(`Cannot read folder: ${folderPath}`);
    }

    return totalSize;
  }

  // Analyze a single file
  async analyzeFile(filePath, stats) {
    const relativePath = path.relative(CONFIG.projectPath, filePath);
    const extension = path.extname(filePath).toLowerCase();
    const size = stats.size;

    this.fileCount++;
    this.totalSize += size;

    // Track extension statistics
    if (!this.extensionStats[extension]) {
      this.extensionStats[extension] = { count: 0, totalSize: 0, files: [] };
    }
    this.extensionStats[extension].count++;
    this.extensionStats[extension].totalSize += size;

    // Track large files
    if (size > CONFIG.largeFileThreshold) {
      this.largeFiles.push({
        path: relativePath,
        size: size,
        sizeFormatted: this.formatBytes(size),
        extension: extension,
        isVeryLarge: size > CONFIG.veryLargeFileThreshold,
        lastModified: stats.mtime,
      });

      // Add to extension files list if it's a very large file
      if (size > CONFIG.veryLargeFileThreshold) {
        this.extensionStats[extension].files.push({
          path: relativePath,
          size: this.formatBytes(size),
        });
      }
    }

    // Check for duplicates (simple size-based check)
    const sizeKey = `${size}-${extension}`;
    if (this.fileHashes.has(sizeKey)) {
      if (!this.duplicateFiles.has(sizeKey)) {
        this.duplicateFiles.set(sizeKey, [this.fileHashes.get(sizeKey)]);
      }
      this.duplicateFiles.get(sizeKey).push(relativePath);
    } else {
      this.fileHashes.set(sizeKey, relativePath);
    }
  }

  // Analyze directory recursively
  async analyzeDirectory(dirPath, depth = 0) {
    try {
      const files = await readdir(dirPath);
      this.folderCount++;

      const folderName = path.basename(dirPath);
      const relativePath = path.relative(CONFIG.projectPath, dirPath);

      // Check if this is a bloat folder
      if (CONFIG.bloatFolders.includes(folderName) && depth <= 2) {
        const folderSize = await this.getFolderSize(dirPath);
        this.bloatAnalysis[folderName] = {
          path: relativePath,
          size: folderSize,
          sizeFormatted: this.formatBytes(folderSize),
          percentage: 0, // Will calculate later
        };

        // Don't analyze inside node_modules deeply
        if (folderName === "node_modules") {
          return;
        }
      }

      // Check if this is a FIXZIT module
      for (const fixzitModule of CONFIG.fixzitModules) {
        if (
          relativePath.includes(fixzitModule) ||
          folderName === fixzitModule
        ) {
          if (!this.moduleAnalysis[fixzitModule]) {
            this.moduleAnalysis[fixzitModule] = {
              fileCount: 0,
              totalSize: 0,
              components: [],
              assets: [],
            };
          }
        }
      }

      // Analyze each file in directory
      for (const file of files) {
        const filePath = path.join(dirPath, file);

        try {
          const stats = await stat(filePath);

          if (stats.isDirectory()) {
            if (!stats.isSymbolicLink()) {
              await this.analyzeDirectory(filePath, depth + 1);
            }
          } else {
            await this.analyzeFile(filePath, stats);

            // Update module analysis
            for (const fixzitModule of CONFIG.fixzitModules) {
              if (relativePath.includes(fixzitModule)) {
                this.moduleAnalysis[fixzitModule].fileCount++;
                this.moduleAnalysis[fixzitModule].totalSize += stats.size;

                const ext = path.extname(file).toLowerCase();
                if (CONFIG.codeExtensions.includes(ext)) {
                  this.moduleAnalysis[fixzitModule].components.push(file);
                } else if (CONFIG.assetExtensions.includes(ext)) {
                  this.moduleAnalysis[fixzitModule].assets.push(file);
                }
              }
            }
          }
        } catch (_err) {
          this.errors.push(`Cannot stat: ${filePath}`);
        }
      }
    } catch (_err) {
      this.errors.push(`Cannot read directory: ${dirPath}`);
    }
  }

  // Check for unused dependencies
  async checkUnusedDependencies() {
    const packageJsonPath = path.join(CONFIG.projectPath, "package.json");

    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(
          fs.readFileSync(packageJsonPath, "utf8"),
        );
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };

        const nodeModulesPath = path.join(CONFIG.projectPath, "node_modules");
        if (fs.existsSync(nodeModulesPath)) {
          const installedPackages = await readdir(nodeModulesPath);

          // Find packages in node_modules but not in package.json
          const orphanPackages = [];
          for (const pkg of installedPackages) {
            if (!pkg.startsWith(".") && !pkg.startsWith("@")) {
              if (!allDeps[pkg]) {
                const pkgPath = path.join(nodeModulesPath, pkg);
                const pkgStats = await stat(pkgPath);
                if (pkgStats.isDirectory()) {
                  const size = await this.getFolderSize(pkgPath);
                  orphanPackages.push({
                    name: pkg,
                    size: size,
                    sizeFormatted: this.formatBytes(size),
                  });
                }
              }
            }
          }

          return orphanPackages.sort((a, b) => b.size - a.size);
        }
      } catch (_err) {
        this.errors.push("Failed to analyze package.json");
      }
    }

    return [];
  }

  // Generate analysis report
  async generateReport() {
    console.log("\n🔍 Analyzing FIXZIT SOUQ Project...\n");
    console.log(`📁 Project Path: ${path.resolve(CONFIG.projectPath)}`);
    console.log("⏳ This may take a few minutes for large projects...\n");

    // Start analysis
    await this.analyzeDirectory(CONFIG.projectPath);

    // Calculate percentages for bloat analysis
    for (const folder in this.bloatAnalysis) {
      this.bloatAnalysis[folder].percentage = (
        (this.bloatAnalysis[folder].size / this.totalSize) *
        100
      ).toFixed(2);
    }

    // Check for unused dependencies
    const orphanPackages = await this.checkUnusedDependencies();

    // Sort large files by size
    this.largeFiles.sort((a, b) => b.size - a.size);

    // Sort extension stats by total size
    const sortedExtensions = Object.entries(this.extensionStats)
      .sort((a, b) => b[1].totalSize - a[1].totalSize)
      .slice(0, 20); // Top 20 extensions

    // Prepare report
    const report = {
      summary: {
        totalSize: this.totalSize,
        totalSizeFormatted: this.formatBytes(this.totalSize),
        fileCount: this.fileCount,
        folderCount: this.folderCount,
        analyzedAt: new Date().toISOString(),
      },
      bloatAnalysis: this.bloatAnalysis,
      largeFiles: this.largeFiles.slice(0, 50), // Top 50 large files
      moduleAnalysis: this.moduleAnalysis,
      extensionStats: Object.fromEntries(sortedExtensions),
      duplicates: Array.from(this.duplicateFiles.entries())
        .filter(([_, files]) => files.length > 1)
        .map(([key, files]) => ({
          key,
          files,
          count: files.length,
          potentialSavings: this.formatBytes(
            (files.length - 1) * parseInt(key.split("-")[0], 10),
          ),
        })),
      orphanPackages,
      errors: this.errors,
    };

    // Save JSON report
    fs.writeFileSync(CONFIG.outputFile, JSON.stringify(report, null, 2));

    // Generate HTML report
    this.generateHTMLReport(report);

    // Print summary to console
    this.printSummary(report);

    return report;
  }

  // Generate HTML report
  generateHTMLReport(report) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FIXZIT SOUQ Project Analysis Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #0061A8 0%, #0061A8 100%);  /* FIXED: was #023047 (banned) */
            color: white;
            padding: 40px;
            text-align: center;
        }
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .header .subtitle {
            opacity: 0.9;
            font-size: 1.1em;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        .summary-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            text-align: center;
        }
        .summary-card .value {
            font-size: 2em;
            font-weight: bold;
            color: #0061A8;
            margin-bottom: 10px;
        }
        .summary-card .label {
            color: #666;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .section {
            padding: 40px;
            border-bottom: 1px solid #eee;
        }
        .section h2 {
            font-size: 1.8em;
            margin-bottom: 25px;
            color: #333;
        }
        .bloat-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            margin: 10px 0;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #FF6B6B;
        }
        .file-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            margin: 8px 0;
            background: #fff;
            border: 1px solid #e9ecef;
            border-radius: 6px;
        }
        .file-item.very-large {
            border-left: 4px solid #FF6B6B;
            background: #fff5f5;
        }
        .progress-bar {
            width: 100%;
            height: 20px;
            background: #e9ecef;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
        }
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #FF6B6B, #FF8E53);
            transition: width 0.3s ease;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            text-align: left;
            padding: 12px;
            border-bottom: 1px solid #ddd;
        }
        th {
            background: #f8f9fa;
            font-weight: 600;
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: 500;
        }
        .badge.danger { background: #ffe6e6; color: #d63384; }
        .badge.warning { background: #fff3cd; color: #b45309; }
        .badge.success { background: #d1edff; color: #0f5132; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 FIXZIT SOUQ Project Analysis</h1>
            <p class="subtitle">Complete size breakdown and optimization recommendations</p>
            <p style="margin-top: 10px; opacity: 0.8;">Generated on ${new Date(report.summary.analyzedAt).toLocaleDateString()}</p>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <div class="value">${report.summary.totalSizeFormatted}</div>
                <div class="label">Total Size</div>
            </div>
            <div class="summary-card">
                <div class="value">${report.summary.fileCount.toLocaleString()}</div>
                <div class="label">Files</div>
            </div>
            <div class="summary-card">
                <div class="value">${report.summary.folderCount.toLocaleString()}</div>
                <div class="label">Folders</div>
            </div>
            <div class="summary-card">
                <div class="value">${report.largeFiles.length}</div>
                <div class="label">Large Files (>10MB)</div>
            </div>
        </div>

        <div class="section">
            <h2>🗑️ Bloat Analysis</h2>
            ${Object.entries(report.bloatAnalysis)
              .map(
                ([folder, data]) => `
                <div class="bloat-item">
                    <div>
                        <strong>${folder}</strong>
                        <div style="font-size: 0.9em; color: #666; margin-top: 4px;">${data.path}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: bold; color: #FF6B6B;">${data.sizeFormatted}</div>
                        <div style="font-size: 0.9em; color: #666;">${data.percentage}% of total</div>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${Math.min(data.percentage, 100)}%"></div>
                </div>
            `,
              )
              .join("")}
        </div>

        <div class="section">
            <h2>📊 Top Large Files</h2>
            ${report.largeFiles
              .slice(0, 20)
              .map(
                (file) => `
                <div class="file-item ${file.isVeryLarge ? "very-large" : ""}">
                    <div>
                        <strong>${file.path}</strong>
                        ${file.isVeryLarge ? '<span class="badge danger">Very Large</span>' : '<span class="badge warning">Large</span>'}
                        <div style="font-size: 0.8em; color: #666; margin-top: 4px;">
                            ${file.extension} • Modified: ${new Date(file.lastModified).toLocaleDateString()}
                        </div>
                    </div>
                    <div style="font-weight: bold; color: ${file.isVeryLarge ? "#d63384" : "#b45309"};">
                        ${file.sizeFormatted}
                    </div>
                </div>
            `,
              )
              .join("")}
        </div>

        <div class="section">
            <h2>📦 File Extensions Breakdown</h2>
            <table>
                <thead>
                    <tr>
                        <th>Extension</th>
                        <th>File Count</th>
                        <th>Total Size</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(report.extensionStats)
                      .map(
                        ([ext, data]) => `
                        <tr>
                            <td><strong>${ext || "(no extension)"}</strong></td>
                            <td>${data.count.toLocaleString()}</td>
                            <td>${this.formatBytes(data.totalSize)}</td>
                            <td>${((data.totalSize / report.summary.totalSize) * 100).toFixed(2)}%</td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>
        </div>

        ${
          Object.keys(report.moduleAnalysis).length > 0
            ? `
        <div class="section">
            <h2>🏗️ FIXZIT Modules Analysis</h2>
            <table>
                <thead>
                    <tr>
                        <th>Module</th>
                        <th>Files</th>
                        <th>Size</th>
                        <th>Components</th>
                        <th>Assets</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(report.moduleAnalysis)
                      .map(
                        ([module, data]) => `
                        <tr>
                            <td><strong>${module}</strong></td>
                            <td>${data.fileCount}</td>
                            <td>${this.formatBytes(data.totalSize)}</td>
                            <td>${data.components.length}</td>
                            <td>${data.assets.length}</td>
                        </tr>
                    `,
                      )
                      .join("")}
                </tbody>
            </table>
        </div>
        `
            : ""
        }

        ${
          report.orphanPackages.length > 0
            ? `
        <div class="section">
            <h2>🧹 Orphan Packages</h2>
            <p style="margin-bottom: 20px; color: #666;">Packages in node_modules but not in package.json</p>
            ${report.orphanPackages
              .slice(0, 10)
              .map(
                (pkg) => `
                <div class="file-item">
                    <div><strong>${pkg.name}</strong></div>
                    <div style="color: #d63384; font-weight: bold;">${pkg.sizeFormatted}</div>
                </div>
            `,
              )
              .join("")}
        </div>
        `
            : ""
        }

        ${
          report.duplicates.length > 0
            ? `
        <div class="section">
            <h2>🔄 Potential Duplicates</h2>
            ${report.duplicates
              .slice(0, 10)
              .map(
                (dup) => `
                <div style="margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    <strong>Potential savings: ${dup.potentialSavings}</strong>
                    <div style="margin-top: 10px;">
                        ${dup.files.map((file) => `<div style="font-size: 0.9em; color: #666; margin: 4px 0;">${file}</div>`).join("")}
                    </div>
                </div>
            `,
              )
              .join("")}
        </div>
        `
            : ""
        }
    </div>
</body>
</html>`;

    fs.writeFileSync(CONFIG.htmlReport, html);
  }

  // Print console summary
  printSummary(report) {
    console.log("\n📊 FIXZIT SOUQ PROJECT ANALYSIS COMPLETE\n");
    console.log("=".repeat(60));
    console.log(`📁 Total Project Size: ${report.summary.totalSizeFormatted}`);
    console.log(
      `📄 Files Analyzed: ${report.summary.fileCount.toLocaleString()}`,
    );
    console.log(
      `📂 Folders Scanned: ${report.summary.folderCount.toLocaleString()}`,
    );
    console.log("=".repeat(60));

    // Bloat Analysis
    console.log("\n🗑️  BLOAT SOURCES:");
    const sortedBloat = Object.entries(report.bloatAnalysis).sort(
      (a, b) => b[1].size - a[1].size,
    );

    for (const [folder, data] of sortedBloat) {
      console.log(
        `   ${folder.padEnd(15)} ${data.sizeFormatted.padStart(10)} (${data.percentage}%)`,
      );
    }

    // Top large files
    console.log("\n📊 TOP 10 LARGEST FILES:");
    for (let i = 0; i < Math.min(10, report.largeFiles.length); i++) {
      const file = report.largeFiles[i];
      const marker = file.isVeryLarge ? "🔴" : "🟡";
      console.log(
        `   ${marker} ${file.sizeFormatted.padStart(10)} ${file.path}`,
      );
    }

    // Extension stats
    console.log("\n📦 TOP FILE EXTENSIONS:");
    const topExts = Object.entries(report.extensionStats).slice(0, 5);
    for (const [ext, data] of topExts) {
      const percentage = (
        (data.totalSize / report.summary.totalSize) *
        100
      ).toFixed(1);
      console.log(
        `   ${(ext || "none").padEnd(10)} ${this.formatBytes(data.totalSize).padStart(10)} (${percentage}%)`,
      );
    }

    // Recommendations
    console.log("\n💡 QUICK CLEANUP RECOMMENDATIONS:");
    const totalBloat = Object.values(report.bloatAnalysis).reduce(
      (sum, data) => sum + data.size,
      0,
    );
    const bloatPercentage = (
      (totalBloat / report.summary.totalSize) *
      100
    ).toFixed(1);

    if (bloatPercentage > 70) {
      console.log("   🔴 CRITICAL: Over 70% of project is bloat!");
    } else if (bloatPercentage > 50) {
      console.log("   🟡 WARNING: Over 50% of project is bloat");
    } else {
      console.log("   🟢 GOOD: Reasonable bloat levels");
    }

    // Specific recommendations
    if (report.bloatAnalysis.node_modules) {
      console.log(
        `   • Clean node_modules: rm -rf node_modules && npm install`,
      );
    }
    if (report.bloatAnalysis[".next"]) {
      console.log(`   • Clean Next.js cache: rm -rf .next`);
    }
    if (report.largeFiles.filter((f) => f.extension === ".log").length > 0) {
      console.log(`   • Remove log files: find . -name "*.log" -delete`);
    }
    if (report.orphanPackages.length > 0) {
      console.log(
        `   • Found ${report.orphanPackages.length} orphan packages to review`,
      );
    }

    console.log("\n📄 REPORTS GENERATED:");
    console.log(`   • JSON Report: ${CONFIG.outputFile}`);
    console.log(`   • HTML Report: ${CONFIG.htmlReport}`);
    console.log(
      "\n🎯 Open the HTML report in your browser for interactive analysis!",
    );
  }
}

// Run the analyzer
(async () => {
  try {
    const analyzer = new ProjectAnalyzer();
    await analyzer.generateReport();
  } catch (error) {
    console.error("❌ Analysis failed:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  }
})();
