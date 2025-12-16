#!/usr/bin/env node

/**
 * RAPID API ROUTE ENHANCEMENT SCRIPT
 * Processes all remaining routes in batches for 100% completion
 */

const fs = require("fs");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

// Routes already enhanced (skip these)
const ENHANCED_ROUTES = new Set([
  "app/api/auth/login/route.ts",
  "app/api/auth/signup/route.ts",
  "app/api/auth/me/route.ts",
  "app/api/auth/logout/route.ts",
  "app/api/payments/create/route.ts",
  "app/api/marketplace/rfq/route.ts",
  "app/api/subscribe/corporate/route.ts",
  "app/api/subscribe/owner/route.ts",
]);

// Standard imports to add
const STANDARD_IMPORTS = `
import { rateLimit } from '@/server/security/rateLimit';
import { unauthorizedError, forbiddenError, notFoundError, validationError, zodValidationError, rateLimitError, handleApiError } from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';
`.trim();

// Check if file needs enhancement
function needsEnhancement(filePath, content) {
  if (ENHANCED_ROUTES.has(filePath)) return false;

  const hasRateLimit = content.includes("rateLimit(");
  const hasOpenAPI = content.includes("@openapi");
  const hasSecureResponse = content.includes("createSecureResponse");

  return !(hasRateLimit && hasOpenAPI && hasSecureResponse);
}

// Add imports if missing
function addMissingImports(content) {
  if (content.includes("from '@/server/security/rateLimit'")) {
    return content; // Already has imports
  }

  const lines = content.split("\n");
  let lastImportLine = -1;

  // Find last import
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith("import ")) {
      lastImportLine = i;
    }
  }

  if (lastImportLine === -1) {
    return STANDARD_IMPORTS + "\n\n" + content;
  }

  // Insert after last import
  lines.splice(lastImportLine + 1, 0, "", STANDARD_IMPORTS);
  return lines.join("\n");
}

// Replace NextResponse.json with createSecureResponse where appropriate
function replaceResponses(content) {
  // Replace success responses
  content = content.replace(
    /return NextResponse\.json\(([^,)]+)\);/g,
    "return createSecureResponse($1, 200, req);",
  );

  content = content.replace(
    /return NextResponse\.json\(([^,)]+),\s*\{\s*status:\s*(\d+)\s*\}\);/g,
    "return createSecureResponse($1, $2, req);",
  );

  return content;
}

// Add basic rate limiting (will need manual adjustment for specific limits)
function addRateLimiting(content, filePath) {
  // Determine rate limit based on route
  let limit = 60,
    window = 60; // Default: 60 req/min

  if (filePath.includes("/auth/")) {
    limit = 5;
    window = 900; // 5 req/15min
  } else if (filePath.includes("/payment") || filePath.includes("/subscribe")) {
    limit = 10;
    window = 300; // 10 req/5min
  } else if (filePath.includes("/admin/")) {
    limit = 100;
    window = 60; // 100 req/min
  }

  // Find GET/POST functions and add rate limiting
  const rateLimitCode = `
  // Rate limiting
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.ip || 'unknown';
  const rl = rateLimit(\`\${req.url}:\${clientIp}\`, ${limit}, ${window});
  if (!rl.allowed) {
    return rateLimitError();
  }
`.trim();

  // Add after function declaration
  content = content.replace(
    /(export async function (GET|POST|PUT|DELETE)\(req: NextRequest[^)]*\)\s*\{)/g,
    `$1\n  ${rateLimitCode}\n`,
  );

  return content;
}

// Add basic OpenAPI documentation
function addOpenAPIDoc(content, filePath) {
  const routePath = filePath.replace("app/api/", "").replace("/route.ts", "");
  const tag = routePath.split("/")[0];

  const openAPIDoc = `
/**
 * @openapi
 * /api/${routePath}:
 *   get:
 *     summary: ${routePath} operations
 *     tags: [${tag}]
 *     security:
 *       - cookieAuth: []
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Rate limit exceeded
 */
`.trim();

  // Add before export function
  if (!content.includes("@openapi")) {
    content = content.replace(
      /export async function (GET|POST|PUT|DELETE)/,
      `${openAPIDoc}\nexport async function $1`,
    );
  }

  return content;
}

// Main enhancement function
async function enhanceFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, "utf8");

    if (!needsEnhancement(filePath, content)) {
      console.log(`✅ SKIP: ${filePath} (already enhanced)`);
      return { enhanced: false, reason: "already-done" };
    }

    console.log(`🔧 ENHANCING: ${filePath}`);

    // Apply enhancements
    content = addMissingImports(content);
    content = addRateLimiting(content, filePath);
    content = addOpenAPIDoc(content, filePath);
    content = replaceResponses(content);

    // Write back
    fs.writeFileSync(filePath, content, "utf8");

    console.log(`   ✓ Added imports`);
    console.log(`   ✓ Added rate limiting`);
    console.log(`   ✓ Added OpenAPI docs`);
    console.log(`   ✓ Replaced responses`);

    return { enhanced: true, filePath };
  } catch (error) {
    console.error(`❌ ERROR: ${filePath}`, error.message);
    return { enhanced: false, error: error.message };
  }
}

// Find all route files
async function findAllRoutes() {
  try {
    const { stdout } = await execPromise(
      'find app/api -name "route.ts" -type f | sort',
    );
    return stdout.trim().split("\n").filter(Boolean);
  } catch (error) {
    console.error("Error finding routes:", error);
    return [];
  }
}

// Main execution
async function main() {
  console.log("🚀 RAPID API ROUTE ENHANCEMENT");
  console.log("================================\n");

  const allRoutes = await findAllRoutes();
  console.log(`📊 Found ${allRoutes.length} total route files`);
  console.log(`📊 Already enhanced: ${ENHANCED_ROUTES.size} routes`);
  console.log(
    `📊 Remaining: ${allRoutes.length - ENHANCED_ROUTES.size} routes\n`,
  );

  const results = {
    enhanced: [],
    skipped: [],
    errors: [],
  };

  // Process in batches
  for (const routePath of allRoutes) {
    const result = await enhanceFile(routePath);

    if (result.enhanced) {
      results.enhanced.push(routePath);
    } else if (result.error) {
      results.errors.push({ path: routePath, error: result.error });
    } else {
      results.skipped.push(routePath);
    }

    // Small delay to avoid overwhelming the system
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  console.log("\n================================");
  console.log("📊 ENHANCEMENT COMPLETE");
  console.log("================================");
  console.log(`✅ Enhanced: ${results.enhanced.length} routes`);
  console.log(`⏭️  Skipped: ${results.skipped.length} routes`);
  console.log(`❌ Errors: ${results.errors.length} routes`);

  if (results.errors.length > 0) {
    console.log("\n❌ ERRORS:");
    results.errors.forEach(({ path, error }) => {
      console.log(`   ${path}: ${error}`);
    });
  }

  console.log("\n💡 Next steps:");
  console.log("   1. Review enhanced routes for correctness");
  console.log("   2. Adjust rate limits based on route sensitivity");
  console.log("   3. Enhance OpenAPI docs with full schemas");
  console.log(
    '   4. Run: git add app/api && git commit -m "feat: batch enhance API routes"',
  );
  console.log("   5. Run: npm run lint && npm run build");
}

// Run if called directly
if (require.main === module) {
  main().catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
  });
}

module.exports = { enhanceFile, findAllRoutes };
