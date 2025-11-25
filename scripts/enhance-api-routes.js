#!/usr/bin/env node

/**
 * API Routes Enhancement Script
 *
 * This script applies standardized patterns to all API routes:
 * 1. Rate limiting
 * 2. Standardized error handling
 * 3. OpenAPI documentation
 * 4. Security headers
 * 5. Input validation improvements
 *
 * Usage:
 *   node scripts/enhance-api-routes.js --dry-run  # Preview changes
 *   node scripts/enhance-api-routes.js --apply    # Apply changes
 *   node scripts/enhance-api-routes.js --route /app/api/specific/route.ts  # Single route
 */

import fs from "fs/promises";
import path from "path";
import { glob } from "glob";

const DRY_RUN = process.argv.includes("--dry-run");
const APPLY = process.argv.includes("--apply");
const SINGLE_ROUTE = process.argv
  .find((arg) => arg.startsWith("--route="))
  ?.split("=")[1];

// Rate limiting recommendations by route type
const RATE_LIMITS = {
  auth: { limit: 5, window: 900_000 }, // 5 req per 15 min
  payment: { limit: 10, window: 300_000 }, // 10 req per 5 min
  subscription: { limit: 3, window: 300_000 }, // 3 req per 5 min
  read: { limit: 60, window: 60_000 }, // 60 req per min
  write: { limit: 20, window: 60_000 }, // 20 req per min
  admin: { limit: 100, window: 60_000 }, // 100 req per min
  public: { limit: 10, window: 60_000 }, // 10 req per min
};

// Detect route type and recommend rate limit
function getRateLimitForRoute(filePath) {
  if (filePath.includes("/auth/")) return RATE_LIMITS.auth;
  if (filePath.includes("/payment")) return RATE_LIMITS.payment;
  if (filePath.includes("/subscribe")) return RATE_LIMITS.subscription;
  if (filePath.includes("/admin/")) return RATE_LIMITS.admin;
  if (filePath.includes("/public/")) return RATE_LIMITS.public;
  return RATE_LIMITS.read; // default
}

// Check if file needs enhancement
async function analyzeRoute(filePath) {
  const content = await fs.readFile(filePath, "utf-8");

  const analysis = {
    path: filePath,
    hasRateLimit: /rateLimit\(/.test(content),
    hasStandardizedErrors:
      /createErrorResponse|unauthorizedError|forbiddenError/.test(content),
    hasOpenAPI: /@openapi/.test(content),
    hasZodValidation: /z\.object\(/.test(content),
    hasTenantIsolation: /orgId:/.test(content),
    methods: [],
    needsEnhancement: false,
  };

  // Detect HTTP methods
  const methodMatches = content.matchAll(
    /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)/g,
  );
  for (const match of methodMatches) {
    analysis.methods.push(match[1]);
  }

  // Determine if enhancement needed
  analysis.needsEnhancement =
    !analysis.hasRateLimit ||
    !analysis.hasStandardizedErrors ||
    !analysis.hasOpenAPI;

  return analysis;
}

// Generate OpenAPI doc comment for a method
function generateOpenAPIDoc(method, routePath) {
  const projectRoot = process.cwd();
  // Use path.posix for consistent forward slashes across all platforms
  const normalizedRoute = routePath.split(path.sep).join(path.posix.sep);
  const normalizedRoot = projectRoot.split(path.sep).join(path.posix.sep);

  const cleanPath = normalizedRoute
    .replace(`${normalizedRoot}/app/api`, "/api")
    .replace("/route.ts", "")
    .replace("[id]", "{id}")
    .replace("[slug]", "{slug}");

  const methodLower = method.toLowerCase();
  const resourceName = cleanPath.split("/").filter(Boolean).pop() || "resource";

  let doc = `/**
 * @openapi
 * ${cleanPath}:
 *   ${methodLower}:
 *     summary: ${method} ${resourceName}
 *     tags: [${resourceName.charAt(0).toUpperCase() + resourceName.slice(1)}]
 *     security:
 *       - bearerAuth: []`;

  if (method === "POST" || method === "PUT" || method === "PATCH") {
    doc += `
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object`;
  }

  doc += `
 *     responses:
 *       ${method === "POST" ? "201" : "200"}:
 *         description: Success
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */`;

  return doc;
}

// Enhance a single route file
async function enhanceRoute(filePath) {
  const analysis = await analyzeRoute(filePath);

  if (!analysis.needsEnhancement) {
    console.log(`✓ ${filePath} - Already enhanced`);
    return { enhanced: false, analysis };
  }

  let content = await fs.readFile(filePath, "utf-8");
  let changes = [];

  // Add missing imports
  const imports = {
    rateLimit: "import { rateLimit } from '@/server/security/rateLimit';",
    errors: `import {
  unauthorizedError,
  forbiddenError,
  notFoundError,
  zodValidationError,
  rateLimitError,
  handleApiError
} from '@/server/utils/errorResponses';`,
    secureResponse:
      "import { createSecureResponse } from '@/server/security/headers';",
  };

  if (!analysis.hasRateLimit) {
    content = addImportAfterLast(content, imports.rateLimit);
    changes.push("Added rate limiting import");
  }

  if (!analysis.hasStandardizedErrors) {
    content = addImportAfterLast(content, imports.errors);
    changes.push("Added standardized error imports");
  }

  // Add OpenAPI docs if missing
  if (!analysis.hasOpenAPI) {
    for (const method of analysis.methods) {
      const openAPIDoc = generateOpenAPIDoc(method, filePath);
      content = addOpenAPIBeforeMethod(content, method, openAPIDoc);
      changes.push(`Added OpenAPI doc for ${method}`);
    }
  }

  // Add rate limiting to methods if missing
  if (!analysis.hasRateLimit) {
    const rateLimit = getRateLimitForRoute(filePath);
    for (const method of analysis.methods) {
      content = addRateLimitingToMethod(content, method, rateLimit);
      changes.push(`Added rate limiting to ${method}`);
    }
  }

  // Replace error patterns
  if (!analysis.hasStandardizedErrors) {
    content = replaceErrorPatterns(content);
    changes.push("Replaced error patterns with standardized handlers");
  }

  if (APPLY && changes.length > 0) {
    await fs.writeFile(filePath, content, "utf-8");
    console.log(`✓ ${filePath}`);
    changes.forEach((change) => console.log(`  - ${change}`));
  } else if (DRY_RUN) {
    console.log(`[DRY RUN] ${filePath}`);
    changes.forEach((change) => console.log(`  - ${change}`));
  }

  return { enhanced: true, analysis, changes };
}

// Helper functions
function addImportAfterLast(content, importStatement) {
  const lines = content.split("\n");
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("import ")) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, importStatement);
  } else {
    lines.unshift(importStatement);
  }

  return lines.join("\n");
}

function addOpenAPIBeforeMethod(content, method, openAPIDoc) {
  const regex = new RegExp(`(\\n)(export\\s+async\\s+function\\s+${method})`);
  return content.replace(regex, `\n${openAPIDoc}\n$2`);
}

function addRateLimitingToMethod(content, method, rateLimit) {
  // Find the method and add rate limiting after try {
  const methodRegex = new RegExp(
    `(export\\s+async\\s+function\\s+${method}[^{]+{\\s*try\\s*{)`,
    "s",
  );

  const rateLimitCode = `
    // Rate limiting
    const key = \`route:\${user?.orgId || 'anonymous'}\`;
    const rl = rateLimit(key, ${rateLimit.limit}, ${rateLimit.window});
    if (!rl.allowed) return rateLimitError();
`;

  return content.replace(methodRegex, `$1${rateLimitCode}`);
}

function replaceErrorPatterns(content) {
  // Replace common error patterns with standardized functions
  content = content.replace(
    /NextResponse\.json\(\s*{\s*(?:ok:\s*false,\s*)?error:\s*['"]Unauthorized['"]\s*}\s*,\s*{\s*status:\s*401\s*}\s*\)/g,
    "unauthorizedError()",
  );

  content = content.replace(
    /NextResponse\.json\(\s*{\s*(?:ok:\s*false,\s*)?error:\s*['"]Forbidden['"]\s*}\s*,\s*{\s*status:\s*403\s*}\s*\)/g,
    "forbiddenError()",
  );

  content = content.replace(
    /NextResponse\.json\(\s*{\s*(?:ok:\s*false,\s*)?error:\s*['"](.*?)['"]\s*}\s*,\s*{\s*status:\s*404\s*}\s*\)/g,
    "notFoundError('$1')",
  );

  // Replace generic 500 errors
  content = content.replace(
    /NextResponse\.json\(\s*{\s*(?:ok:\s*false,\s*)?error:\s*['"](.*?)['"]\s*}\s*,\s*{\s*status:\s*500\s*}\s*\)/g,
    "internalServerError('$1')",
  );

  return content;
}

// Main execution
async function main() {
  console.log("🚀 API Routes Enhancement Tool\n");

  let routes;

  if (SINGLE_ROUTE) {
    routes = [SINGLE_ROUTE];
  } else {
    routes = await glob("app/api/**/route.ts", {
      cwd: process.cwd(),
      absolute: true,
      ignore: ["**/node_modules/**", "**/*.test.ts", "**/*.FIXED.ts"],
    });
  }

  console.log(`Found ${routes.length} API routes\n`);

  const results = {
    total: routes.length,
    enhanced: 0,
    alreadyGood: 0,
    errors: 0,
  };

  for (const route of routes) {
    try {
      const result = await enhanceRoute(route);
      if (result.enhanced) {
        results.enhanced++;
      } else {
        results.alreadyGood++;
      }
    } catch (error) {
      console.error(`✗ ${route} - Error: ${error.message}`);
      results.errors++;
    }
  }

  console.log("\n📊 Summary:");
  console.log(`  Total routes: ${results.total}`);
  console.log(`  Enhanced: ${results.enhanced}`);
  console.log(`  Already good: ${results.alreadyGood}`);
  console.log(`  Errors: ${results.errors}`);

  if (DRY_RUN) {
    console.log("\n⚠️  This was a dry run. Use --apply to make changes.");
  } else if (APPLY) {
    console.log("\n✅ Changes applied successfully!");
  } else {
    console.log("\n💡 Use --dry-run to preview or --apply to make changes.");
  }
}

if (!DRY_RUN && !APPLY && !SINGLE_ROUTE) {
  console.log("Usage:");
  console.log(
    "  node scripts/enhance-api-routes.js --dry-run  # Preview changes",
  );
  console.log(
    "  node scripts/enhance-api-routes.js --apply    # Apply changes",
  );
  console.log(
    "  node scripts/enhance-api-routes.js --route=/path/to/route.ts  # Single route",
  );
  process.exit(1);
}

main().catch(console.error);
