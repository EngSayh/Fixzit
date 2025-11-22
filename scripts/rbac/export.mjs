import fs from "node:fs";
import path from "node:path";

/**
 * Enhanced RBAC Matrix Extractor for Fixzit
 * Scans codebase for role-based authorization patterns and generates comprehensive CSV matrix
 */

const ROOTS = ["app", "src", "pages", "api"].filter((p) => {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
});

const SKIP_DIRS = new Set([
  ".git", ".next", ".artifacts", "node_modules", "dist", "build",
  "coverage", ".turbo", ".vercel", "lhci_reports", "test-results",
  "playwright-report", ".vscode", ".idea"
]);

// Enhanced patterns for Fixzit authorization
const ROLE_PATTERNS = [
  /authorize\(["`'](.+?)["`']\)/g,
  /requireRole\(["`'](.+?)["`']\)/g,
  /hasRole\(["`'](.+?)["`']\)/g,
  /checkPermission\(["`'](.+?)["`']\)/g,
  /role\s*===?\s*["`'](.+?)["`']/g,
  /roles\.includes\(["`'](.+?)["`']\)/g,
  /\.role\s*===?\s*["`'](.+?)["`']/g
];

const ROUTE_PATTERNS = [
  /(?:GET|POST|PUT|PATCH|DELETE)\s+["`']([^"`']+)["`']/gi,
  /route:\s*["`']([^"`']+)["`']/gi,
  /path:\s*["`']([^"`']+)["`']/gi,
  /\/api\/([^"`'\s]+)/gi
];

const ACTION_PATTERNS = [
  /action:\s*["`'](.+?)["`']/gi,
  /permission:\s*["`'](.+?)["`']/gi,
  /can\(["`'](.+?)["`']\)/gi
];

const rows = [["role", "file", "route_or_context", "action", "line_number", "pattern_type"]];

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    // Extract roles
    const roleMatches = [];
    ROLE_PATTERNS.forEach((regex) => {
      let match;
      while ((match = regex.exec(content)) !== null) {
        const lineNumber = content.substring(0, match.index).split('\n').length;
        roleMatches.push({
          role: match[1],
          lineNumber,
          type: 'role'
        });
      }
    });
    
    if (roleMatches.length === 0) return;
    
    // Extract routes
    let route = "";
    ROUTE_PATTERNS.forEach((regex) => {
      const match = content.match(regex);
      if (match && match[1]) {
        route = match[1];
      }
    });
    
    // Extract actions
    const actions = [];
    ACTION_PATTERNS.forEach((regex) => {
      let match;
      while ((match = regex.exec(content)) !== null) {
        actions.push(match[1]);
      }
    });
    
    // If no route found, try to infer from file path
    if (!route) {
      if (filePath.includes('/api/')) {
        route = filePath.substring(filePath.indexOf('/api/'));
      } else if (filePath.includes('/pages/')) {
        route = filePath.substring(filePath.indexOf('/pages/'));
      } else {
        route = path.dirname(filePath);
      }
    }
    
    // Add entries for each role match
    roleMatches.forEach((match) => {
      const action = actions.length > 0 ? actions.join(',') : 'access';
      rows.push([
        match.role,
        filePath,
        route,
        action,
        match.lineNumber.toString(),
        match.type
      ]);
    });
    
  } catch (err) {
    console.warn(`[rbac] Warning: Could not scan file ${filePath}: ${err.message}`);
  }
}

function walkDirectory(dir) {
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith(".")) {
          continue;
        }
        walkDirectory(fullPath);
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(fullPath)) {
        scanFile(fullPath);
      }
    }
  } catch (err) {
    console.warn(`[rbac] Warning: Could not scan directory ${dir}: ${err.message}`);
  }
}

// Scan all root directories
ROOTS.forEach(walkDirectory);

// Generate CSV with proper escaping
const escapeCsvField = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const toCsvRow = (row) => row.map(escapeCsvField).join(",");
const csv = rows.map(toCsvRow).join("\n");

fs.writeFileSync("rbac-matrix.csv", csv);

// Generate summary
const totalEntries = rows.length - 1; // Subtract header
const uniqueRoles = new Set(rows.slice(1).map(row => row[0])).size;
const uniqueFiles = new Set(rows.slice(1).map(row => row[1])).size;

console.log(`[rbac] RBAC Matrix Generation Complete:`);
console.log(`  • Total entries: ${totalEntries}`);
console.log(`  • Unique roles: ${uniqueRoles}`);
console.log(`  • Files scanned: ${uniqueFiles}`);
console.log(`  • Output: rbac-matrix.csv`);

// Generate additional insights
const insights = {
  summary: {
    totalEntries,
    uniqueRoles,
    uniqueFiles,
    timestamp: new Date().toISOString()
  },
  roles: [...new Set(rows.slice(1).map(row => row[0]))].sort(),
  files: [...new Set(rows.slice(1).map(row => row[1]))].sort(),
  routes: [...new Set(rows.slice(1).map(row => row[2]).filter(r => r))].sort()
};

fs.writeFileSync("rbac-insights.json", JSON.stringify(insights, null, 2));
console.log(`[rbac] Additional insights saved to rbac-insights.json`);
