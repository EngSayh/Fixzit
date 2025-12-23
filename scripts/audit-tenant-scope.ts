/**
 * @fileoverview Tenant Scope Audit Script (SEC-002)
 * @description Analyzes MongoDB operations in app/api routes to detect
 * missing tenant scope filters (org_id/property_owner_id).
 * 
 * Detects:
 * - Model.find/findOne/findById without org_id/property_owner_id
 * - Model.updateOne/updateMany without tenant filters
 * - Model.deleteOne/deleteMany without tenant filters
 * - Model.countDocuments without tenant scope
 * 
 * Excludes:
 * - Super Admin routes (/api/superadmin/*)
 * - Auth routes (/api/auth/*)
 * - Public routes with explicit PUBLIC markers
 * - User/Organization model queries (cross-tenant by design)
 * - Test files
 * 
 * Usage:
 *   pnpm tsx scripts/audit-tenant-scope.ts
 *   pnpm tsx scripts/audit-tenant-scope.ts --fix-docs
 */

import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";

interface TenantIssue {
  file: string;
  line: number;
  column: number;
  operation: string;
  model: string;
  code: string;
  severity: "P0" | "P1" | "P2";
  reason: string;
}

// Models that are intentionally cross-tenant
const CROSS_TENANT_MODELS = new Set([
  "User",
  "Organization",
  "SystemConfig",
  "Feature",
  "ApiKey",
  "AuditLog",
]);

// Patterns that indicate tenant scope is handled elsewhere
const SAFE_PATTERNS = [
  /org_id:\s*session\.user\.orgId/,
  /property_owner_id:\s*session\.user\.id/,
  /org_id:\s*user\.orgId/,
  /\$or:\s*\[\s*\{\s*org_id/,
  /scopedQuery/,
  /withTenantScope/,
  /findWithOrgId/,
  /getOrgFilter/,
];

// MongoDB operations to audit
const MONGO_OPERATIONS = [
  "find",
  "findOne",
  "findById",
  "findOneAndUpdate",
  "findOneAndDelete",
  "updateOne",
  "updateMany",
  "deleteOne",
  "deleteMany",
  "countDocuments",
  "aggregate",
];

/**
 * Check if file should be excluded from audit
 */
function shouldExcludeFile(filePath: string): boolean {
  const relativePath = path.relative(process.cwd(), filePath);
  
  // Exclude patterns
  const excludePatterns = [
    /^app\/api\/superadmin\//,
    /^app\/api\/auth\//,
    /^app\/api\/dev\//,
    /\.test\.ts$/,
    /\.spec\.ts$/,
    /node_modules/,
  ];

  return excludePatterns.some((pattern) => pattern.test(relativePath));
}

/**
 * Check if line is in a comment block
 */
function isInComment(lines: string[], lineIndex: number): boolean {
  let inBlockComment = false;
  
  for (let i = 0; i <= lineIndex; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith("//")) {
      if (i === lineIndex) return true;
      continue;
    }
    
    if (line.includes("/*")) inBlockComment = true;
    if (line.includes("*/")) inBlockComment = false;
    
    if (i === lineIndex && inBlockComment) return true;
  }
  
  return false;
}

/**
 * Check if operation has tenant scope in surrounding context
 */
function hasTenantScopeInContext(
  lines: string[],
  lineIndex: number,
  _operation: string,
): boolean {
  // Check 5 lines before and 3 lines after
  const contextStart = Math.max(0, lineIndex - 5);
  const contextEnd = Math.min(lines.length - 1, lineIndex + 3);
  
  for (let i = contextStart; i <= contextEnd; i++) {
    const line = lines[i];
    
    // Check for safe patterns
    if (SAFE_PATTERNS.some((pattern) => pattern.test(line))) {
      return true;
    }
    
    // Check if query object has org_id/property_owner_id
    if (
      line.includes("org_id") ||
      line.includes("property_owner_id") ||
      line.includes("orgId") ||
      line.includes("propertyOwnerId")
    ) {
      return true;
    }
  }
  
  return false;
}

/**
 * Extract model name from operation line
 */
function extractModelName(line: string, operation: string): string | null {
  // Pattern: ModelName.operation(
  const pattern = new RegExp(`(\\w+)\\.${operation}\\s*\\(`);
  const match = line.match(pattern);
  
  if (match && match[1]) {
    // Check if it's a Model (starts with uppercase)
    const modelName = match[1];
    if (modelName[0] === modelName[0].toUpperCase()) {
      return modelName;
    }
  }
  
  return null;
}

/**
 * Analyze a single file for tenant scope issues
 */
function analyzeFile(filePath: string): TenantIssue[] {
  const issues: TenantIssue[] = [];
  
  if (shouldExcludeFile(filePath)) {
    return issues;
  }
  
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  
  // Check for PUBLIC marker
  const hasPublicMarker = content.includes("@access Public");
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip comments
    if (isInComment(lines, i)) continue;
    
    // Check each MongoDB operation
    for (const operation of MONGO_OPERATIONS) {
      const operationPattern = new RegExp(`\\.${operation}\\s*\\(`);
      
      if (operationPattern.test(line)) {
        const modelName = extractModelName(line, operation);
        
        // Skip if no model name or it's a cross-tenant model
        if (!modelName || CROSS_TENANT_MODELS.has(modelName)) {
          continue;
        }
        
        // Check if tenant scope is present
        if (!hasTenantScopeInContext(lines, i, operation)) {
          const severity: "P0" | "P1" | "P2" = hasPublicMarker ? "P2" : operation.includes("delete") || operation.includes("update") ? "P0" : "P1";
          
          issues.push({
            file: path.relative(process.cwd(), filePath),
            line: i + 1,
            column: line.indexOf(operation),
            operation: `${modelName}.${operation}`,
            model: modelName,
            code: line.trim(),
            severity,
            reason: `Missing tenant scope (org_id/property_owner_id) in ${operation}`,
          });
        }
      }
    }
  }
  
  return issues;
}

/**
 * Main audit function
 */
async function auditTenantScope() {
  console.log("🔍 Starting Tenant Scope Audit (SEC-002)...\n");
  
  // Find all API route files
  const apiRoutes = await glob("app/api/**/*.ts", {
    ignore: ["**/*.test.ts", "**/*.spec.ts"],
  });
  
  console.log(`📁 Found ${apiRoutes.length} API route files\n`);
  
  const allIssues: TenantIssue[] = [];
  
  for (const file of apiRoutes) {
    const issues = analyzeFile(file);
    allIssues.push(...issues);
  }
  
  // Group by severity
  const p0Issues = allIssues.filter((i) => i.severity === "P0");
  const p1Issues = allIssues.filter((i) => i.severity === "P1");
  const p2Issues = allIssues.filter((i) => i.severity === "P2");
  
  console.log("=== AUDIT RESULTS ===\n");
  console.log(`🔴 P0 (Critical - Write Operations): ${p0Issues.length}`);
  console.log(`🟡 P1 (High - Read Operations): ${p1Issues.length}`);
  console.log(`🟢 P2 (Medium - Public Routes): ${p2Issues.length}`);
  console.log(`📊 Total Issues: ${allIssues.length}\n`);
  
  if (allIssues.length === 0) {
    console.log("✅ No tenant scope issues found!");
    return;
  }
  
  // Print P0 issues first
  if (p0Issues.length > 0) {
    console.log("\n🔴 P0 CRITICAL ISSUES (Write Operations):\n");
    for (const issue of p0Issues) {
      console.log(`  ${issue.file}:${issue.line}`);
      console.log(`    Operation: ${issue.operation}`);
      console.log(`    Code: ${issue.code}`);
      console.log(`    Reason: ${issue.reason}\n`);
    }
  }
  
  // Print P1 issues
  if (p1Issues.length > 0) {
    console.log("\n🟡 P1 HIGH PRIORITY ISSUES (Read Operations):\n");
    for (const issue of p1Issues.slice(0, 20)) {
      console.log(`  ${issue.file}:${issue.line} - ${issue.operation}`);
    }
    if (p1Issues.length > 20) {
      console.log(`  ... and ${p1Issues.length - 20} more`);
    }
  }
  
  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: allIssues.length,
      p0: p0Issues.length,
      p1: p1Issues.length,
      p2: p2Issues.length,
    },
    issues: allIssues,
  };
  
  const reportPath = path.join(process.cwd(), "docs", "SEC-002-tenant-audit.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 Full report saved to: docs/SEC-002-tenant-audit.json`);
  
  // Exit with error if P0 issues found
  if (p0Issues.length > 0) {
    console.log("\n❌ Audit failed: P0 critical issues must be fixed!");
    process.exit(1);
  }
}

// Run audit
auditTenantScope().catch((error) => {
  console.error("❌ Audit script error:", error);
  process.exit(1);
});
