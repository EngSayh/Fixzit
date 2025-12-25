#!/usr/bin/env node
/**
 * Brand Color Scanner - Production Code Only
 *
 * Scoped version of scan-hex.js that only scans production directories:
 * app/, components/, lib/, services/
 *
 * This enforces the Fixzit brand palette on code that ships to production.
 *
 * Usage:
 *   node scripts/scan-hex-prod.js
 *   npm run style:scan:prod
 *
 * Exit codes:
 *   0 = All colors approved (or informational mode)
 *   1 = Off-palette colors found (strict mode only)
 */

const { readFileSync, existsSync } = require("fs");
const { execSync } = require("child_process");

// ============================================================================
// CONFIGURATION
// ============================================================================

// Production directories to scan
const PROD_DIRS = ["app/", "components/", "lib/", "services/"];

// File extensions to scan
const EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".css", ".scss"];

// Set to true to make the scan blocking
const STRICT_MODE = process.env.BRAND_SCAN_STRICT === "true";

// ============================================================================
// APPROVED COLOR WHITELIST
// ============================================================================

const WHITELIST = new Set([
  // Brand colors (REQUIRED)
  "#0061A8", // brand-blue (primary)
  "#00A859", // brand-green (success)
  "#FFB400", // brand-yellow (warning)

  // Neutral colors (approved)
  "#FFFFFF", // white
  "#000000", // black

  // Gray scale (approved)
  "#111827", // gray-900
  "#1F2937", // gray-800
  "#374151", // gray-700
  "#6B7280", // gray-500
  "#9CA3AF", // gray-400
  "#E5E7EB", // gray-200
  "#F9FAFB", // gray-50

  // Semantic colors (approved)
  "#DC2626", // red-600 (error)
  "#16A34A", // green-600 (success alt)
  "#FACC15", // yellow-400 (warning alt)
  "#2563EB", // blue-600 (info)

  // Additional approved colors
  "#F3F4F6", // gray-100
  "#D1D5DB", // gray-300
  "#4B5563", // gray-600

  // Transparent and common CSS values (allowed)
  "#000", // shorthand black
  "#FFF", // shorthand white
]);

// ============================================================================
// BANNED COLORS (must be replaced)
// ============================================================================

const BANNED = {
  "#023047": "#0061A8", // Replace with brand-blue
  "#F6851F": "#FFB400", // Replace with brand-yellow
};

// ============================================================================
// MAIN SCANNER
// ============================================================================

function scanFiles() {
  console.log("🎨 Fixzit Brand Color Scanner (Production)");
  console.log("==========================================\n");
  console.log(`📁 Scanning: ${PROD_DIRS.join(", ")}`);
  console.log(`📝 Mode: ${STRICT_MODE ? "STRICT (blocking)" : "Informational"}\n`);

  // Get all files to scan
  let files = [];
  try {
    const gitFiles = execSync("git ls-files", { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter((f) => {
        // Must be in a production directory
        const inProdDir = PROD_DIRS.some((dir) => f.startsWith(dir));
        if (!inProdDir) return false;

        // Must have valid extension
        const hasExt = EXTENSIONS.some((ext) => f.endsWith(ext));
        return hasExt;
      });
    files = gitFiles;
  } catch (_err) {
    console.error("❌ Error: Not a git repository or git not available");
    process.exit(1);
  }

  if (files.length === 0) {
    console.log("⚠️  No files found to scan");
    return;
  }

  console.log(`📁 Found ${files.length} production files to scan...\n`);

  const violations = [];
  const banned = [];

  // Scan each file
  for (const file of files) {
    if (!existsSync(file)) continue;

    try {
      const content = readFileSync(file, "utf8");

      // Match hex colors (3 or 6 digits)
      const hexPattern = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
      const matches = content.match(hexPattern) || [];

      for (const hex of matches) {
        const normalized = hex.toUpperCase();

        // Check if banned
        if (BANNED[normalized]) {
          banned.push({
            file,
            color: normalized,
            replacement: BANNED[normalized],
            line: getLineNumber(content, hex),
          });
        }
        // Check if not whitelisted
        else if (!WHITELIST.has(normalized)) {
          violations.push({
            file,
            color: normalized,
            line: getLineNumber(content, hex),
          });
        }
      }
    } catch (_err) {
      // Skip files that can't be read
      continue;
    }
  }

  // Report results
  if (banned.length === 0 && violations.length === 0) {
    console.log("✅ All production colors are approved!");
    console.log(`   Scanned: ${files.length} files`);
    console.log(`   Violations: 0\n`);
    process.exit(0);
  }

  // Report banned colors (must be replaced)
  if (banned.length > 0) {
    console.error("🚫 BANNED COLORS FOUND (MUST BE REPLACED):");
    console.error("==========================================\n");

    for (const { file, color, replacement, line } of banned) {
      console.error(`  ❌ ${file}:${line}`);
      console.error(`     Found: ${color}`);
      console.error(`     Replace with: ${replacement}\n`);
    }
  }

  // Report off-palette colors
  if (violations.length > 0) {
    console.error("⚠️  OFF-PALETTE COLORS FOUND:");
    console.error("=============================\n");

    // Group by directory for better visibility
    const byDir = {};
    for (const v of violations) {
      const dir = v.file.split("/")[0];
      if (!byDir[dir]) byDir[dir] = [];
      byDir[dir].push(v);
    }

    for (const [dir, items] of Object.entries(byDir)) {
      console.error(`📂 ${dir}/ (${items.length} violations)`);

      // Group by color within directory
      const grouped = {};
      for (const v of items) {
        if (!grouped[v.color]) grouped[v.color] = [];
        grouped[v.color].push(`${v.file}:${v.line}`);
      }

      for (const [color, locations] of Object.entries(grouped)) {
        console.error(`   ${color}: ${locations.length} occurrence(s)`);
        for (const loc of locations.slice(0, 3)) {
          console.error(`     - ${loc}`);
        }
        if (locations.length > 3) {
          console.error(`     ... and ${locations.length - 3} more`);
        }
      }
      console.error("");
    }
  }

  // Summary
  const totalViolations = banned.length + violations.length;
  console.error("📊 BRAND SCAN SUMMARY (Production)");
  console.error("==================================\n");
  console.error(`   Files scanned: ${files.length}`);
  console.error(`   Banned colors: ${banned.length}`);
  console.error(`   Off-palette colors: ${violations.length}`);
  console.error(`   Total violations: ${totalViolations}\n`);

  if (STRICT_MODE) {
    console.error("❌ BRAND SCAN FAILED (strict mode)\n");
    console.error("💡 Fix Options:");
    console.error("   1. Replace with approved brand colors from WHITELIST");
    console.error("   2. Use Tailwind theme tokens instead of hex");
    console.error("   3. Add to whitelist if color is justified (requires approval)\n");
    process.exit(1);
  } else {
    console.log("⚠️  BRAND SCAN INFORMATIONAL (not blocking)\n");
    console.log("💡 To make blocking, set BRAND_SCAN_STRICT=true\n");
    // Exit 0 in informational mode - don't fail CI
    process.exit(0);
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function getLineNumber(content, search) {
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(search)) {
      return i + 1;
    }
  }
  return 1;
}

// ============================================================================
// RUN
// ============================================================================

scanFiles();
