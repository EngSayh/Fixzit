#!/usr/bin/env node

/**
 * Automated API Route Enhancement Tool
 * 
 * Systematically enhances Next.js API routes with:
 * - Rate limiting (sensitivity-based)
 * - OpenAPI 3.0 documentation
 * - Standardized error handling
 * - Security headers via createSecureResponse
 * 
 * Usage: node scripts/auto-enhance-routes.js [route-file]
 */

const fs = require('fs');
const _path = require('path');

// Configuration
const RATE_LIMITS = {
  auth: { requests: 5, window: 900 },        // 5 req/15min - auth endpoints
  payment: { requests: 10, window: 300 },    // 10 req/5min - payments
  subscription: { requests: 3, window: 300 }, // 3 req/5min - subscriptions
  write: { requests: 20, window: 60 },       // 20 req/min - write operations
  read: { requests: 60, window: 60 },        // 60 req/min - read operations
  admin: { requests: 100, window: 60 },      // 100 req/min - admin operations
  public: { requests: 10, window: 60 },      // 10 req/min - public endpoints
};

// Import patterns to add
const REQUIRED_IMPORTS = `import { rateLimit } from '@/server/security/rateLimit';
import { 
  unauthorizedError, 
  forbiddenError, 
  notFoundError, 
  validationError, 
  zodValidationError, 
  rateLimitError, 
  handleApiError 
} from '@/server/utils/errorResponses';
import { createSecureResponse } from '@/server/security/headers';`;

/**
 * Determines rate limit category based on route path
 */
function getRateLimitConfig(routePath) {
  if (routePath.includes('/auth/')) return RATE_LIMITS.auth;
  if (routePath.includes('/payment')) return RATE_LIMITS.payment;
  if (routePath.includes('/subscribe')) return RATE_LIMITS.subscription;
  if (routePath.includes('/admin/')) return RATE_LIMITS.admin;
  
  // Check if it's a GET request (read) or POST/PUT/DELETE (write)
  // This will be determined per method
  return RATE_LIMITS.write; // Default
}

/**
 * Checks if a file already has enhancements
 */
function isAlreadyEnhanced(content) {
  const hasRateLimit = content.includes('rateLimit(');
  const hasOpenAPI = content.includes('@openapi');
  const hasSecureResponse = content.includes('createSecureResponse');
  
  return hasRateLimit && hasOpenAPI && hasSecureResponse;
}

/**
 * Adds imports if missing
 */
function addImports(content) {
  // Check if already has our imports
  if (content.includes('import { rateLimit }')) {
    return content;
  }
  
  // Find the last import statement
  const lines = content.split('\n');
  let lastImportIndex = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      lastImportIndex = i;
    }
  }
  
  if (lastImportIndex === -1) {
    // No imports found, add at the beginning
    return REQUIRED_IMPORTS + '\n\n' + content;
  }
  
  // Insert after last import
  lines.splice(lastImportIndex + 1, 0, '', REQUIRED_IMPORTS);
  return lines.join('\n');
}

/**
 * Generates OpenAPI documentation for a route
 */
function generateOpenAPIDoc(routePath, method, existingJSDoc) {
  const routeName = routePath.replace('app/api/', '').replace('/route.ts', '');
  const tag = routeName.split('/')[0];
  
  return `/**
 * @openapi
 * /api/${routeName}:
 *   ${method.toLowerCase()}:
 *     summary: ${method} ${routeName}
 *     description: API endpoint for ${routeName}
 *     tags:
 *       - ${tag}
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
 *       500:
 *         description: Internal server error
 */`;
}

/**
 * Enhances a single route file
 */
function enhanceRoute(filePath) {
  console.log(`\n🔧 Enhancing: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Check if already enhanced
  if (isAlreadyEnhanced(content)) {
    console.log(`✅ Already enhanced, skipping`);
    return false;
  }
  
  // Add imports
  content = addImports(content);
  
  // Note: Full enhancement would require AST parsing
  // For now, just add imports and flag for manual review
  
  console.log(`⚠️  Imports added, needs manual OpenAPI docs and rate limiting logic`);
  console.log(`   Please review and add:`);
  console.log(`   1. Rate limiting at start of handler`);
  console.log(`   2. OpenAPI documentation above handler`);
  console.log(`   3. Replace NextResponse.json with createSecureResponse`);
  console.log(`   4. Replace manual errors with standardized handlers`);
  
  return true;
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('❌ Usage: node scripts/auto-enhance-routes.js <route-file>');
    console.log('   Example: node scripts/auto-enhance-routes.js app/api/work-orders/route.ts');
    process.exit(1);
  }
  
  const routePath = args[0];
  enhanceRoute(routePath);
}

if (require.main === module) {
  main();
}

module.exports = { enhanceRoute, isAlreadyEnhanced };
