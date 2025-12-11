#!/usr/bin/env node
/**
 * RBAC Audit Script
 * SEC-001: Audit all 354 API routes for proper auth/role checks
 * 
 * Run: node scripts/rbac-audit.mjs
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Routes that are intentionally public (from middleware.ts)
const INTENTIONALLY_PUBLIC = [
  '/api/auth',           // NextAuth
  '/api/copilot',        // AI assistant (has internal role checks)
  '/api/health',         // Health checks
  '/api/i18n',           // Translations
  '/api/qa/',            // QA endpoints (test utilities)
  '/api/marketplace/categories',
  '/api/marketplace/products',
  '/api/marketplace/search',
  '/api/projects',       // Mock API for tests
  '/api/webhooks',       // Webhooks use signature verification
  '/api/payments/tap/webhook',    // Webhook signature verified
  '/api/payments/callback',       // Payment callback
  '/api/payments/paytabs',        // Payment webhook
  '/api/billing/callback',        // Billing callback
  '/api/paytabs/',                // PayTabs callbacks
  '/api/aqar/listings/search',    // Public listing search
  '/api/work-orders/sla-check',   // Internal cron job
  '/api/metrics',                 // Prometheus metrics
  '/api/public/',                 // Explicitly public endpoints
  '/api/careers/public',          // Public job listings
  '/api/careers/apply',           // Public job application
  '/api/feeds/',                  // Public RSS/job feeds
  '/api/ats/jobs/public',         // Public job listings
  '/api/ats/jobs/:id/apply',      // Public job application
  '/api/ats/public-post',         // Public job posting
  '/api/dev/',                    // Dev tools (disabled in prod)
  '/api/trial-request',           // Public trial request form
  '/api/vendor/apply',            // Public vendor application
  '/api/support/welcome-email',   // Email webhook
  '/api/upload/scan-callback',    // Antivirus callback (signature verified)
  '/api/graphql',                 // GraphQL has its own auth layer
  '/api/integrations/linkedin/apply', // LinkedIn Easy Apply callback
  '/api/souq/ads/clicks',         // Analytics tracking
  '/api/souq/ads/impressions',    // Analytics tracking
  '/api/souq/buybox/',            // Public buybox data
  '/api/souq/products',           // Public product catalog
  '/api/pm/generate-wos',         // Internal cron job
  '/api/checkout/',               // Public checkout (creates auth during flow)
  '/api/billing/subscribe',       // Public subscription start
  '/api/billing/quote',           // Public quote generation
];

// Auth patterns to look for
const AUTH_PATTERNS = [
  'getSessionUser',
  'withAuthRbac',
  'auth(',             // Matches auth() and auth({ role: ... })
  'getServerSession',
  'requireAuth',
  'requireRole',
  'requireFmAbility',  // FM module authorization
  'validateApiKey',
  'verifySignature',
];

async function walk(dir, acc = []) {
  let entries = [];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }

  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await walk(full, acc);
    } else if (e.isFile() && e.name === 'route.ts') {
      acc.push(full);
    }
  }
  return acc;
}

function getRouteFromPath(filePath) {
  const relative = path.relative(ROOT, filePath);
  // Convert app/api/foo/bar/route.ts → /api/foo/bar
  return '/' + relative
    .replace('app/', '')
    .replace('/route.ts', '')
    .replace(/\[([^\]]+)\]/g, ':$1'); // [id] → :id
}

function isIntentionallyPublic(route) {
  return INTENTIONALLY_PUBLIC.some(pub => route.startsWith(pub));
}

async function hasAuthCheck(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return AUTH_PATTERNS.some(pattern => content.includes(pattern));
}

async function main() {
  console.log('═'.repeat(60));
  console.log('              RBAC AUDIT REPORT - SEC-001');
  console.log('═'.repeat(60));
  console.log();

  const apiDir = path.join(ROOT, 'app', 'api');
  const routes = await walk(apiDir);
  
  const results = {
    protected: [],
    public: [],
    unprotected: [],
  };

  for (const routePath of routes) {
    const route = getRouteFromPath(routePath);
    const hasAuth = await hasAuthCheck(routePath);
    
    if (hasAuth) {
      results.protected.push(route);
    } else if (isIntentionallyPublic(route)) {
      results.public.push(route);
    } else {
      results.unprotected.push(route);
    }
  }

  console.log('📊 Summary');
  console.log('─'.repeat(40));
  console.log(`  Total routes     : ${routes.length}`);
  console.log(`  ✅ Protected     : ${results.protected.length}`);
  console.log(`  🔓 Public (OK)   : ${results.public.length}`);
  console.log(`  ⚠️  Unprotected  : ${results.unprotected.length}`);
  console.log();

  if (results.unprotected.length > 0) {
    console.log('⚠️  ROUTES REQUIRING REVIEW');
    console.log('─'.repeat(40));
    for (const route of results.unprotected.sort()) {
      console.log(`  ${route}`);
    }
    console.log();
    console.log('These routes should either:');
    console.log('  1. Add auth check (getSessionUser, withAuthRbac)');
    console.log('  2. Be added to INTENTIONALLY_PUBLIC if truly public');
    console.log();
  }

  // Calculate coverage
  const coverage = ((results.protected.length + results.public.length) / routes.length * 100).toFixed(1);
  console.log('📈 RBAC Coverage');
  console.log('─'.repeat(40));
  console.log(`  Auth Coverage: ${coverage}%`);
  
  if (results.unprotected.length === 0) {
    console.log('  Status: ✅ ALL ROUTES ACCOUNTED FOR');
  } else {
    console.log(`  Status: ⚠️  ${results.unprotected.length} routes need review`);
  }
  console.log();

  // Write detailed report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: routes.length,
      protected: results.protected.length,
      public: results.public.length,
      unprotected: results.unprotected.length,
      coverage: parseFloat(coverage),
    },
    routes: {
      protected: results.protected.sort(),
      public: results.public.sort(),
      unprotected: results.unprotected.sort(),
    },
  };

  const reportPath = path.join(ROOT, 'docs', 'security', 'rbac-audit.json');
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report: ${path.relative(ROOT, reportPath)}`);
  console.log('═'.repeat(60));

  // Exit with error if unprotected routes exist (for CI)
  process.exit(results.unprotected.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
