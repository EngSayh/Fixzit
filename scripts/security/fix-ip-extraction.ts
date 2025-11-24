#!/usr/bin/env tsx
/**
 * CRITICAL SECURITY FIX: Replace Unsafe IP Extraction Patterns
 *
 * This script replaces all unsafe IP extraction patterns across the codebase
 * with the centralized secure function.
 *
 * VULNERABILITY: x-forwarded-for?.split(',')[0] uses FIRST IP (client-controlled)
 * FIX: Import and use getClientIP() which uses LAST IP (trusted proxy)
 *
 * Usage:
 *   tsx scripts/security/fix-ip-extraction.ts         # Apply fixes
 *   tsx scripts/security/fix-ip-extraction.ts --dry-run  # Preview changes only
 */

import { readFileSync, writeFileSync } from "fs";
import { glob } from "glob";
import * as ts from "typescript";

// Parse CLI arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

// Comprehensive patterns to find and replace (non-global for test, global for replace)
const UNSAFE_PATTERNS = [
  {
    // Pattern 1: const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    name: "clientIp assignment with trim and fallback",
    find: () =>
      new RegExp(
        /const\s+(clientIp|ip)\s*=\s*req\.headers\.get\(['"](x-forwarded-for|X-Forwarded-For)['"]\)\?\.split\(['"],['"]\)\[0\]\?\.trim\(\)\s*\|\|\s*['"](?:unknown|local|anonymous)['"];?/.source,
        "g",
      ),
    replace: (varName: string) => `const ${varName} = getClientIP(req);`,
  },
  {
    // Pattern 2: req.headers.get("x-forwarded-for")?.split(",")[0] || req.headers.get("x-real-ip") || "unknown"
    name: "inline with x-real-ip fallback",
    find: () =>
      new RegExp(
        /req\.headers\.get\(["'](x-forwarded-for|X-Forwarded-For)["']\)\?\.split\(["'],["']\)\[0\]\?\.trim\(\)\s*\|\|\s*req\.headers\.get\(["'](x-real-ip|X-Real-IP)["']\)\s*\|\|\s*["'](?:unknown|local|anonymous)["']/.source,
        "g",
      ),
    replace: (_varName: string) => "getClientIP(req)",
  },
  {
    // Pattern 3: Simple inline with fallback (no x-real-ip)
    name: "inline with direct fallback",
    find: () =>
      new RegExp(
        /req\.headers\.get\(['"](x-forwarded-for|X-Forwarded-For)['"]\)\?\.split\(['"],['"]\)\[0\]\?\.trim\(\)\s*\|\|\s*['"](unknown|local|anonymous)['"]/.source,
        "g",
      ),
    replace: (_varName: string) => "getClientIP(req)",
  },
  {
    // Pattern 4: Simple inline without trim
    name: "inline without trim",
    find: () =>
      new RegExp(
        /req\.headers\.get\(['"](x-forwarded-for|X-Forwarded-For)['"]\)\?\.split\(['"],['"]\)\[0\]\s*\|\|\s*['"](unknown|local|anonymous)['"]/.source,
        "g",
      ),
    replace: (_varName: string) => "getClientIP(req)",
  },
  {
    // Pattern 5: In function calls (no variable assignment)
    name: "inline in function call",
    find: () =>
      new RegExp(
        /req\.headers\.get\(["'](x-forwarded-for|X-Forwarded-For)["']\)\?\.split\(["'],["']\)\[0\]/.source,
        "g",
      ),
    replace: (_varName: string) => "getClientIP(req)",
  },
];

/**
 * Validate TypeScript syntax
 */
function validateTypeScript(content: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  try {
    const sourceFile = ts.createSourceFile(
      "temp.ts",
      content,
      ts.ScriptTarget.Latest,
      true,
    );

    // Check for syntax errors
    const diagnostics =
      (sourceFile as ts.SourceFile & { parseDiagnostics?: ts.Diagnostic[] })
        .parseDiagnostics || [];
    if (diagnostics.length > 0) {
      diagnostics.forEach((diag: ts.Diagnostic) => {
        const message = ts.flattenDiagnosticMessageText(diag.messageText, "\n");
        errors.push(`Line ${diag.start}: ${message}`);
      });
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  } catch (error) {
    errors.push(
      `Parse error: ${error instanceof Error ? error.message : String(error)}`,
    );
    return { valid: false, errors };
  }
}

async function fixFile(filePath: string): Promise<boolean> {
  try {
    const originalContent = readFileSync(filePath, "utf-8");
    let content = originalContent;
    let modified = false;
    const changes: string[] = [];

    // Check if file has unsafe patterns
    const hasUnsafe = /x-forwarded-for.*split.*\[0\]/i.test(content);
    if (!hasUnsafe) return false;

    // Check if already imports getClientIP
    const hasImport =
      /import.*getClientIP.*from.*(@\/lib\/security\/client-ip|@\/server\/security\/headers)/.test(
        content,
      );

    // Add import if not present
    if (!hasImport && hasUnsafe) {
      // Find any existing import statements
      const importMatch = content.match(/import[^;]+;/g);
      if (importMatch && importMatch.length > 0) {
        // Insert after last import
        const lastImport = importMatch[importMatch.length - 1];
        const importIndex = content.lastIndexOf(lastImport);
        content =
          content.slice(0, importIndex + lastImport.length) +
          "\nimport { getClientIP } from '@/lib/security/client-ip';" +
          content.slice(importIndex + lastImport.length);
        modified = true;
        changes.push("Added import statement");
      } else {
        // No import statements found - insert near top after shebang or 'use client'/'use server' directives
        let insertPos = 0;

        // Skip shebang if present
        const shebangMatch = content.match(/^#!.*\n/);
        if (shebangMatch) {
          insertPos = shebangMatch[0].length;
        }

        // Skip 'use client' or 'use server' directives
        const remainingContent = content.slice(insertPos);
        const directiveMatch = remainingContent.match(
          /^(['"]use (client|server)['"])\s*;?\s*\n/,
        );
        if (directiveMatch) {
          insertPos += directiveMatch[0].length;
        }

        // Insert import at calculated position
        content =
          content.slice(0, insertPos) +
          "import { getClientIP } from '@/lib/security/client-ip';\n\n" +
          content.slice(insertPos);
        modified = true;
        changes.push("Added import statement at top");
      }
    }

    // Replace all unsafe patterns (patterns now return fresh RegExp instances)
    UNSAFE_PATTERNS.forEach((pattern) => {
      const regex = pattern.find();
      const matches = content.match(regex);
      if (matches) {
        // Extract variable name if present for proper replacement
        const varMatch = matches[0].match(/const\s+(clientIp|ip)\s*=/);
        const varName = varMatch ? varMatch[1] : "clientIp";

        const replacement = pattern.replace(varName);
        content = content.replace(regex, replacement);
        modified = true;
        changes.push(
          `Replaced ${matches.length} occurrence(s) of: ${pattern.name}`,
        );
      }
    });

    if (modified) {
      // Validate TypeScript syntax
      const validation = validateTypeScript(content);
      if (!validation.valid) {
        console.error(`❌ Validation failed for ${filePath}:`);
        validation.errors.forEach((err) => console.error(`   ${err}`));
        return false;
      }

      if (DRY_RUN) {
        console.log(`\n📝 [DRY RUN] Would fix: ${filePath}`);
        changes.forEach((change) => console.log(`   - ${change}`));
        return true;
      }

      // Create backup
      const backupPath = filePath + ".bak";
      writeFileSync(backupPath, originalContent, "utf-8");
      console.log(`💾 Created backup: ${backupPath}`);

      // Write modified content
      writeFileSync(filePath, content, "utf-8");
      console.log(`✅ Fixed: ${filePath}`);
      changes.forEach((change) => console.log(`   - ${change}`));
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error);
    return false;
  }
}

async function main() {
  if (DRY_RUN) {
    console.log("🔍 DRY RUN MODE - No files will be modified\n");
  }

  console.log("🔍 Scanning for unsafe IP extraction patterns...\n");

  const files = await glob("app/api/**/*.ts", {
    ignore: ["node_modules/**", ".next/**"],
  });
  console.log(`📁 Found ${files.length} API route files\n`);

  let fixedCount = 0;
  const fixedFiles: string[] = [];

  for (const file of files) {
    const fixed = await fixFile(file);
    if (fixed) {
      fixedCount++;
      fixedFiles.push(file);
    }
  }

  console.log(
    `\n${DRY_RUN ? "📋" : "✅"} ${fixedCount} file(s) ${DRY_RUN ? "would be fixed" : "fixed"} with unsafe IP extraction patterns`,
  );

  if (fixedFiles.length > 0) {
    console.log(
      `\n📝 ${DRY_RUN ? "Files that would be fixed" : "Fixed files"}:`,
    );
    fixedFiles.forEach((f) => console.log(`   - ${f}`));
  }

  if (DRY_RUN) {
    console.log("\n� Run without --dry-run to apply changes");
  } else {
    console.log(
      "\n�🔒 All IP extraction now uses secure centralized function (LAST IP from trusted proxy)",
    );
    console.log("💾 Backup files created with .bak extension");
  }
}

main().catch(console.error);
