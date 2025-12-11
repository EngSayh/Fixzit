#!/usr/bin/env tsx
/**
 * Rate Limit Migration Script
 * 
 * Migrates all API endpoints from in-memory rateLimit() to distributed smartRateLimit().
 * 
 * Usage: pnpm tsx scripts/migrate-rate-limits.ts [--dry-run]
 * 
 * SECURITY: This migration enables distributed rate limiting across serverless instances.
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

function migrateFile(filePath: string): MigrationResult {
  const result: MigrationResult = {
    file: filePath,
    success: false,
    changes: [],
  };

  try {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;

    // Skip if already using smartRateLimit
    if (content.includes('import { smartRateLimit }') || 
        content.includes("import { smartRateLimit,") ||
        content.includes(", smartRateLimit }")) {
      result.success = true;
      result.changes.push('Already migrated');
      return result;
    }

    // Check if file uses rateLimit
    if (!content.includes('from "@/server/security/rateLimit"')) {
      result.success = true;
      result.changes.push('No rate limit imports');
      return result;
    }

    // 1. Update import statement
    const importPatterns = [
      // Simple import
      {
        pattern: /import \{ rateLimit \} from "@\/server\/security\/rateLimit";/g,
        replacement: 'import { smartRateLimit } from "@/server/security/rateLimit";',
      },
      // Import with buildRateLimitKey
      {
        pattern: /import \{ rateLimit, buildRateLimitKey \} from "@\/server\/security\/rateLimit";/g,
        replacement: 'import { smartRateLimit, buildRateLimitKey } from "@/server/security/rateLimit";',
      },
      {
        pattern: /import \{ buildRateLimitKey, rateLimit \} from "@\/server\/security\/rateLimit";/g,
        replacement: 'import { smartRateLimit, buildRateLimitKey } from "@/server/security/rateLimit";',
      },
    ];

    for (const { pattern, replacement } of importPatterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        result.changes.push('Updated import to smartRateLimit');
      }
    }

    // 2. Replace rateLimit( with await smartRateLimit(
    // Handle various patterns:
    // - const rl = rateLimit(...)
    // - if (!rateLimit(...).allowed)
    const rateLimitCallPatterns = [
      // Standard pattern: const rl = rateLimit(...)
      {
        pattern: /const (\w+) = rateLimit\(/g,
        replacement: 'const $1 = await smartRateLimit(',
      },
      // Inline pattern: rateLimit(...).allowed
      {
        pattern: /rateLimit\(([^)]+)\)\.allowed/g,
        replacement: '(await smartRateLimit($1)).allowed',
      },
    ];

    for (const { pattern, replacement } of rateLimitCallPatterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        result.changes.push('Updated rateLimit call to await smartRateLimit');
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
  console.log('🔄 Rate Limit Migration Script');
  console.log(DRY_RUN ? '📝 DRY RUN MODE - No files will be modified\n' : '\n');

  // Find all API route files
  const files = await glob('app/api/**/route.ts', { cwd: process.cwd() });
  console.log(`Found ${files.length} API route files\n`);

  const results: MigrationResult[] = [];
  let migratedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const file of files) {
    const fullPath = path.join(process.cwd(), file);
    const result = migrateFile(fullPath);
    results.push(result);

    if (result.error) {
      console.log(`❌ ${file}: ${result.error}`);
      errorCount++;
    } else if (result.changes.includes('Already migrated') || result.changes.includes('No rate limit imports') || result.changes.includes('No changes needed')) {
      skippedCount++;
    } else {
      console.log(`✅ ${file}: ${result.changes.join(', ')}`);
      migratedCount++;
    }
  }

  console.log('\n📊 Summary');
  console.log(`   Migrated: ${migratedCount}`);
  console.log(`   Skipped: ${skippedCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  if (DRY_RUN) {
    console.log('\n⚠️  This was a dry run. Run without --dry-run to apply changes.');
  }
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
