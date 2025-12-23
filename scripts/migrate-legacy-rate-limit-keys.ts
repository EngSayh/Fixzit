#!/usr/bin/env tsx
/**
 * Legacy Rate Limit Key Migration Script
 * 
 * Migrates all API endpoints from legacy buildRateLimitKey(req, userId) 
 * to org-aware buildOrgAwareRateLimitKey(req, orgId, userId).
 * 
 * Usage: pnpm tsx scripts/migrate-legacy-rate-limit-keys.ts [--dry-run]
 * 
 * SECURITY: This migration ensures tenant isolation in rate limiting.
 * Without org-aware keys, different tenants share the same rate limit bucket,
 * which could lead to noisy-neighbor attacks.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

const DRY_RUN = process.argv.includes('--dry-run');

interface MigrationResult {
  file: string;
  success: boolean;
  changes: string[];
  error?: string;
}

/**
 * Detects and migrates legacy buildRateLimitKey calls to buildOrgAwareRateLimitKey
 */
function migrateFile(filePath: string): MigrationResult {
  const result: MigrationResult = {
    file: filePath,
    success: false,
    changes: [],
  };

  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;

    // Skip if file doesn't use buildRateLimitKey
    if (!content.includes('buildRateLimitKey(')) {
      result.success = true;
      result.changes.push('No buildRateLimitKey calls');
      return result;
    }

    // Skip if already using buildOrgAwareRateLimitKey
    if (content.includes('buildOrgAwareRateLimitKey(')) {
      result.success = true;
      result.changes.push('Already using buildOrgAwareRateLimitKey');
      return result;
    }

    // Detect legacy 2-arg pattern: buildRateLimitKey(req, identifier)
    // Matches patterns like:
    // - buildRateLimitKey(req, user.id)
    // - buildRateLimitKey(req, userId)
    // - buildRateLimitKey(req, actor.id)
    // - buildRateLimitKey(req, session.id)
    // - buildRateLimitKey(req, userId ?? getClientIP(req))
    // - buildRateLimitKey(req, user?.id ?? safeIp)
    // Does NOT match 3+ arg patterns
    const legacyPattern = /buildRateLimitKey\(\s*req\s*,\s*([^,)]+)\s*\)/g;
    
    // Check if any matches exist
    const matches = content.match(legacyPattern);
    if (!matches) {
      result.success = true;
      result.changes.push('No legacy 2-arg patterns found');
      return result;
    }

    // Analyze what identifier is used to determine orgId source
    // Common patterns:
    // - user.id → user.orgId available
    // - userId → need to check if user object exists
    // - actor.id → actor.orgId available
    // - session.id → session.orgId might be available
    // - authResult.userId → authResult.orgId might be available

    // 1. First, update the import to include buildOrgAwareRateLimitKey
    const importPatterns = [
      // Just buildRateLimitKey
      {
        pattern: /import \{ buildRateLimitKey \} from "@\/server\/security\/rateLimitKey";/,
        replacement: 'import { buildOrgAwareRateLimitKey } from "@/server/security/rateLimitKey";',
      },
      // buildRateLimitKey with others
      {
        pattern: /import \{ ([^}]*?)buildRateLimitKey([^}]*?) \} from "@\/server\/security\/rateLimitKey";/,
        replacement: (match: string, before: string, after: string) => {
          // Replace buildRateLimitKey with buildOrgAwareRateLimitKey in the import
          const updated = `${before}buildOrgAwareRateLimitKey${after}`.replace(/,\s*,/g, ',').replace(/{\s*,/g, '{ ').replace(/,\s*}/g, ' }');
          return `import { ${updated} } from "@/server/security/rateLimitKey";`;
        },
      },
      // From rateLimit.ts (re-exports)
      {
        pattern: /import \{ ([^}]*?)buildRateLimitKey([^}]*?) \} from "@\/server\/security\/rateLimit";/,
        replacement: (match: string, before: string, after: string) => {
          const updated = `${before}buildOrgAwareRateLimitKey${after}`.replace(/,\s*,/g, ',').replace(/{\s*,/g, '{ ').replace(/,\s*}/g, ' }');
          return `import { ${updated} } from "@/server/security/rateLimit";`;
        },
      },
    ];

    for (const { pattern, replacement } of importPatterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement as string);
        result.changes.push('Updated import to buildOrgAwareRateLimitKey');
      }
    }

    // 2. Replace legacy calls with org-aware calls
    // Map identifier patterns to org sources
    const replacementMap = [
      // user.id → user.orgId, user.id
      {
        pattern: /buildRateLimitKey\(\s*req\s*,\s*user\.id\s*\)/g,
        replacement: 'buildOrgAwareRateLimitKey(req, user.orgId, user.id)',
      },
      // userId → user.orgId, userId (assumes user object exists)
      {
        pattern: /buildRateLimitKey\(\s*req\s*,\s*userId\s*\)/g,
        replacement: 'buildOrgAwareRateLimitKey(req, user?.orgId ?? null, userId)',
      },
      // actor.id → actor.orgId, actor.id
      {
        pattern: /buildRateLimitKey\(\s*req\s*,\s*actor\.id\s*\)/g,
        replacement: 'buildOrgAwareRateLimitKey(req, actor.orgId, actor.id)',
      },
      // session.id → session.orgId, session.id
      {
        pattern: /buildRateLimitKey\(\s*req\s*,\s*session\.id\s*\)/g,
        replacement: 'buildOrgAwareRateLimitKey(req, session.orgId ?? null, session.id)',
      },
      // authResult.userId → authResult.orgId, authResult.userId
      {
        pattern: /buildRateLimitKey\(\s*req\s*,\s*authResult\.userId\s*\)/g,
        replacement: 'buildOrgAwareRateLimitKey(req, authResult.orgId ?? null, authResult.userId)',
      },
      // Complex nullable patterns with fallback to IP
      // userId ?? getClientIP(req) or similar
      {
        pattern: /buildRateLimitKey\(\s*req\s*,\s*userId\s*\?\?\s*getClientIP\(req\)\s*\)/g,
        replacement: 'buildOrgAwareRateLimitKey(req, user?.orgId ?? null, userId)',
      },
      // user?.id ?? safeIp or similar
      {
        pattern: /buildRateLimitKey\(\s*req\s*,\s*user\?\s*\.id\s*(?:\|\||(\?\?))\s*\w+\s*\)/g,
        replacement: 'buildOrgAwareRateLimitKey(req, user?.orgId ?? null, user?.id ?? null)',
      },
      // sessionUser?.id ?? null
      {
        pattern: /buildRateLimitKey\(\s*req\s*,\s*sessionUser\?\s*\.id\s*\?\?\s*null\s*\)/g,
        replacement: 'buildOrgAwareRateLimitKey(req, sessionUser?.orgId ?? null, sessionUser?.id ?? null)',
      },
      // user?.id ?? null
      {
        pattern: /buildRateLimitKey\(\s*req\s*,\s*user\?\s*\.id\s*\?\?\s*null\s*\)/g,
        replacement: 'buildOrgAwareRateLimitKey(req, user?.orgId ?? null, user?.id ?? null)',
      },
    ];

    let _replacementMade = false;
    for (const { pattern, replacement } of replacementMap) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        _replacementMade = true;
        result.changes.push(`Migrated: ${pattern.source.substring(0, 40)}...`);
      }
    }

    // 3. Handle any remaining legacy patterns (manual review needed)
    const remainingLegacy = content.match(/buildRateLimitKey\(\s*req\s*,\s*[^,)]+\s*\)/g);
    if (remainingLegacy) {
      for (const match of remainingLegacy) {
        result.changes.push(`⚠️ MANUAL REVIEW NEEDED: ${match}`);
      }
    }

    // Check if we made any changes
    if (content === originalContent) {
      result.success = true;
      result.changes.push('No changes needed');
      return result;
    }

    // Write the file
    if (!DRY_RUN) {
      fs.writeFileSync(filePath, content, 'utf-8');
    }
    
    result.success = true;
    result.changes.push(DRY_RUN ? 'Would write changes' : 'Changes written');
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

async function main() {
  console.log('🔄 Legacy Rate Limit Key Migration Script');
  console.log(DRY_RUN ? '📝 DRY RUN MODE - No files will be modified\n' : '\n');

  // Find all API route files
  const files = await glob('app/api/**/route.ts', { cwd: process.cwd() });
  console.log(`Found ${files.length} API route files\n`);

  const results: MigrationResult[] = [];
  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let manualReviewCount = 0;

  for (const file of files) {
    const fullPath = path.join(process.cwd(), file);
    const result = migrateFile(fullPath);
    results.push(result);

    const needsManualReview = result.changes.some(c => c.startsWith('⚠️'));
    
    if (result.error) {
      console.log(`❌ ${file}: ${result.error}`);
      errorCount++;
    } else if (needsManualReview) {
      console.log(`⚠️  ${file}:`);
      for (const change of result.changes) {
        console.log(`   ${change}`);
      }
      manualReviewCount++;
    } else if (result.changes.includes('No buildRateLimitKey calls') || 
               result.changes.includes('Already using buildOrgAwareRateLimitKey') ||
               result.changes.includes('No legacy 2-arg patterns found') ||
               result.changes.includes('No changes needed')) {
      skippedCount++;
    } else {
      console.log(`✅ ${file}:`);
      for (const change of result.changes) {
        console.log(`   ${change}`);
      }
      migratedCount++;
    }
  }

  console.log('\n📊 Summary');
  console.log(`   Migrated: ${migratedCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Manual Review: ${manualReviewCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  if (DRY_RUN) {
    console.log('\n⚠️  This was a dry run. Run without --dry-run to apply changes.');
  }

  if (manualReviewCount > 0) {
    console.log('\n⚠️  Some files need manual review. Check the output above.');
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
